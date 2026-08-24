"""
PhishLens Agent — LangGraph Multi-Agent Orchestrator with Short-Term and Long-Term Memory.

Implements:
1. Multi-agent DAG structure:
   - Orchestrator initializes state and checks long-term domain reputation.
   - Parallel execution of specialized analysis nodes:
     * Web Scraping Agent (Playwright screenshot) -> Siamese Visual ML Classifier
     * HTML/DOM Agent (DOM structural features)
     * URL Feature Agent (Lexical & WHOIS analysis)
   - Report Generation Node synthesizes findings, factors in long-term memory history,
     and updates persistent threat intelligence store.
2. Short-Term Memory Checkpointing:
   - Uses PostgresSaver checkpointer bound to unique thread_id / chat_id.
3. Long-Term Memory Persistence:
   - Uses PostgresStore / Django AgentMemoryRecord to recall domain history across conversations.
4. Conversational Follow-up Agent:
   - Supports interactive Q&A in the same chat thread (/chat/<id>).
"""

import json
import logging
import operator
import os
import re
import time
import uuid
from typing import Any, Dict, List, Optional, Annotated, TypedDict
from urllib.parse import urlparse

import nest_asyncio
from dotenv import load_dotenv
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langgraph.graph import StateGraph, START, END

from backend.agents.tools import (
    capture_screenshot,
    run_visual_ml_model,
)
from backend.agents.html_dom_agent import extract_html_features
from backend.agents.url_feature_agent import analyze_url_features
from backend.agents.report_generator import (
    SYSTEM_PROMPT,
    parse_report,
    extract_tool_trace,
)
from backend.agents.memory import (
    short_term_memory,
    long_term_memory,
    get_domain_threat_history,
    check_domain_whitelist,
    save_domain_threat_intel,
)

# Allow nested event loops (needed inside Django / ASGI)
nest_asyncio.apply()

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
logger = logging.getLogger(__name__)


# Reducer function to append to trace lists in parallel execution
def append_trace(left: list, right: list) -> list:
    if not left:
        return right or []
    if not right:
        return left or []
    return left + right


class PhishLensState(TypedDict):
    """Shared state for the PhishLens multi-agent workflow with memory."""
    url: str
    chat_id: Optional[str]
    user_id: Optional[str]
    domain: Optional[str]
    domain_intel: Optional[Dict[str, Any]]
    screenshot_data: Optional[str]
    screenshot_path: Optional[str]
    annotated_screenshot_data: Optional[str]
    annotated_screenshot_path: Optional[str]
    page_title: Optional[str]
    final_url: Optional[str]
    screenshot_warning: Optional[str]
    visual_model_output: Optional[Dict[str, Any]]
    html_features: Optional[Dict[str, Any]]
    dom_feature_vector: Optional[List[float]]
    url_features: Optional[Dict[str, Any]]
    url_feature_vector: Optional[List[float]]
    report: Optional[Dict[str, Any]]
    raw_llm_response: Optional[str]
    error: Optional[str]
    tool_trace: Annotated[List[Dict[str, Any]], append_trace]


class OrchestratorAgent:
    """
    DAG orchestrator with LangGraph StateGraph, Postgres checkpointer, and long-term memory.
    """

    def __init__(self):
        # LLM Initialization
        llm_provider = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "")
        openrouter_model = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")
        openrouter_base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

        if llm_provider == "azure":
            self.llm = AzureChatOpenAI(
                azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5.4-mini"),
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
                azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
                api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                temperature=0,
                max_retries=5,
            )
        else:
            self.llm = ChatOpenAI(
                model=openrouter_model,
                api_key=openrouter_api_key or "dummy_key",
                base_url=openrouter_base_url,
                temperature=0,
                max_retries=5,
                default_headers={
                    "HTTP-Referer": "https://github.com/DPramuditha/PhishLens-Agent",
                    "X-Title": "PhishLens Agent",
                },
            )

        # Build Workflow Graph
        workflow = StateGraph(PhishLensState)

        # Add Nodes
        workflow.add_node("orchestrator", self._orchestrator_node)
        workflow.add_node("web_scraping_agent", self._web_scraping_agent_node)
        workflow.add_node("siamese_network", self._siamese_network_node)
        workflow.add_node("html_dom_agent", self._html_dom_agent_node)
        workflow.add_node("url_feature_agent", self._url_feature_agent_node)
        workflow.add_node("report_generation", self._report_generation_node)

        # Set up connections
        workflow.add_edge(START, "orchestrator")

        # Split in parallel
        workflow.add_edge("orchestrator", "web_scraping_agent")
        workflow.add_edge("orchestrator", "html_dom_agent")
        workflow.add_edge("orchestrator", "url_feature_agent")

        # Web scraping -> Siamese Network
        workflow.add_edge("web_scraping_agent", "siamese_network")

        # Merge at report generation
        workflow.add_edge("siamese_network", "report_generation")
        workflow.add_edge("html_dom_agent", "report_generation")
        workflow.add_edge("url_feature_agent", "report_generation")

        workflow.add_edge("report_generation", END)

        # Compile with Short-term checkpointer and Long-term store
        self.agent = workflow.compile(
            checkpointer=short_term_memory.checkpointer,
            store=long_term_memory.store,
        )

    def _extract_clean_domain(self, url: str) -> str:
        """Helper to extract domain name."""
        clean = url.strip()
        if not re.match(r"^https?://", clean, re.IGNORECASE):
            clean = "http://" + clean
        parsed = urlparse(clean)
        return (parsed.hostname or clean).lower()

    def _orchestrator_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Sanitizes URL and queries long-term memory for domain history."""
        url = state["url"]
        if not re.match(r"^https?://", url, re.IGNORECASE):
            url = "http://" + url

        domain = self._extract_clean_domain(url)
        
        # Long-term memory lookup for domain reputation across all sessions
        domain_intel = long_term_memory.get_domain_history(domain)
        is_whitelisted = long_term_memory.is_whitelisted(domain, user_id=state.get("user_id"))

        trace_msg = f"Orchestrator initiated analysis for: {url}"
        if domain_intel:
            past_scans = domain_intel.get("scan_count", 0)
            last_risk = domain_intel.get("latest_risk_level", "UNKNOWN")
            trace_msg += f" (Long-term memory: {past_scans} prior scan(s), last risk was {last_risk})"

        return {
            "url": url,
            "domain": domain,
            "domain_intel": domain_intel,
            "tool_trace": [
                {
                    "step": "info",
                    "message": trace_msg,
                    "is_whitelisted": is_whitelisted,
                }
            ]
        }

    def _web_scraping_agent_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Captures screenshot using Playwright in memory."""
        url = state["url"]
        trace_call = {
            "step": "tool_call",
            "tool": "capture_screenshot",
            "args": {"url": url}
        }
        try:
            res_str = capture_screenshot.invoke({"url": url})
            res = json.loads(res_str)
            preview_str = res_str[:200] + "..." if len(res_str) > 200 else res_str
            if "screenshot_data" in res and res["screenshot_data"]:
                preview_str = f"Captured in-memory screenshot ({len(res['screenshot_data'])} bytes base64 data URI)"
            trace_res = {
                "step": "tool_result",
                "tool": "capture_screenshot",
                "content_preview": preview_str
            }
            return {
                "screenshot_data": res.get("screenshot_data"),
                "screenshot_path": res.get("screenshot_path"),
                "page_title": res.get("page_title"),
                "final_url": res.get("final_url"),
                "screenshot_warning": res.get("warning"),
                "tool_trace": [trace_call, trace_res]
            }
        except Exception as e:
            trace_res = {
                "step": "tool_result",
                "tool": "capture_screenshot",
                "content_preview": f"Error: {str(e)}"
            }
            return {
                "screenshot_data": None,
                "screenshot_path": None,
                "screenshot_warning": str(e),
                "tool_trace": [trace_call, trace_res]
            }

    def _siamese_network_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Runs binary visual classifier on in-memory screenshot."""
        screenshot_data = state.get("screenshot_data") or ""
        screenshot_path = state.get("screenshot_path") or ""
        target_input = screenshot_data or screenshot_path
        if not target_input:
            return {
                "visual_model_output": {
                    "status": "error",
                    "error": "No screenshot data available",
                    "prediction": "unknown",
                    "brand_impersonation": {"detected": False, "brand": None, "confidence": None},
                },
                "annotated_screenshot_data": None,
                "annotated_screenshot_path": None,
                "tool_trace": [
                    {
                        "step": "info",
                        "message": "Siamese Network skipped: no screenshot data available"
                    }
                ]
            }
        trace_call = {
            "step": "tool_call",
            "tool": "run_visual_ml_model",
            "args": {"screenshot_input": "in_memory_base64_data"}
        }
        try:
            res_str = run_visual_ml_model.invoke({
                "screenshot_data": screenshot_data,
                "screenshot_path": screenshot_path,
            })
            res = json.loads(res_str)
            trace_res = {
                "step": "tool_result",
                "tool": "run_visual_ml_model",
                "content_preview": res.get("message") or (res_str[:200] + "...")
            }
            return {
                "visual_model_output": res,
                "annotated_screenshot_data": res.get("annotated_screenshot_data"),
                "annotated_screenshot_path": res.get("annotated_screenshot_path"),
                "tool_trace": [trace_call, trace_res]
            }
        except Exception as e:
            trace_res = {
                "step": "tool_result",
                "tool": "run_visual_ml_model",
                "content_preview": f"Error: {str(e)}"
            }
            return {
                "visual_model_output": {
                    "status": "error",
                    "error": str(e),
                    "prediction": "unknown",
                    "brand_impersonation": {"detected": False, "brand": None, "confidence": None},
                },
                "annotated_screenshot_data": None,
                "annotated_screenshot_path": None,
                "tool_trace": [trace_call, trace_res]
            }

    def _html_dom_agent_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Extracts HTML DOM features."""
        url = state["url"]
        trace_call = {
            "step": "tool_call",
            "tool": "extract_html_features",
            "args": {"url": url}
        }
        try:
            res_str = extract_html_features.invoke({"url": url})
            res = json.loads(res_str)
            trace_res = {
                "step": "tool_result",
                "tool": "extract_html_features",
                "content_preview": res_str[:200] + "..." if len(res_str) > 200 else res_str
            }
            return {
                "html_features": res,
                "dom_feature_vector": res.get("dom_feature_vector"),
                "tool_trace": [trace_call, trace_res]
            }
        except Exception as e:
            trace_res = {
                "step": "tool_result",
                "tool": "extract_html_features",
                "content_preview": f"Error: {str(e)}"
            }
            return {
                "html_features": {"status": "error", "error": str(e)},
                "dom_feature_vector": None,
                "tool_trace": [trace_call, trace_res]
            }

    def _url_feature_agent_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Runs lexical analysis and WHOIS queries."""
        url = state["url"]
        trace_call = {
            "step": "tool_call",
            "tool": "analyze_url_features",
            "args": {"url": url}
        }
        try:
            res_str = analyze_url_features.invoke({"url": url})
            res = json.loads(res_str)
            trace_res = {
                "step": "tool_result",
                "tool": "analyze_url_features",
                "content_preview": res_str[:200] + "..." if len(res_str) > 200 else res_str
            }
            return {
                "url_features": res,
                "url_feature_vector": res.get("url_feature_vector"),
                "tool_trace": [trace_call, trace_res]
            }
        except Exception as e:
            trace_res = {
                "step": "tool_result",
                "tool": "analyze_url_features",
                "content_preview": f"Error: {str(e)}"
            }
            return {
                "url_features": {"status": "error", "error": str(e)},
                "url_feature_vector": None,
                "tool_trace": [trace_call, trace_res]
            }

    def _report_generation_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Synthesizes all findings and long-term memory into the final report."""
        url = state["url"]
        domain = state.get("domain") or self._extract_clean_domain(url)
        url_features = state.get("url_features") or {}
        html_features = state.get("html_features") or {}
        visual_model_output = state.get("visual_model_output") or {}
        domain_intel = state.get("domain_intel") or long_term_memory.get_domain_history(domain) or {}

        # ── Strip base64 image data from payloads before sending to LLM ──
        # These fields contain massive base64 strings (1M+ chars) that blow past token limits.
        # The ML model results (prediction, probability, brand info) are still included.
        STRIP_KEYS = {
            "annotated_screenshot_data", "annotated_screenshot_path",
            "screenshot_data", "screenshot_path", "screenshot_url",
            "annotated_screenshot_url", "raw_html",
        }

        def _sanitize_for_llm(data: dict, max_str_len: int = 2000) -> dict:
            """Remove base64/large fields and truncate oversized string values."""
            sanitized = {}
            for k, v in data.items():
                if k in STRIP_KEYS:
                    continue
                if isinstance(v, str) and len(v) > max_str_len:
                    sanitized[k] = v[:max_str_len] + f"... [truncated, {len(v)} chars total]"
                elif isinstance(v, dict):
                    sanitized[k] = _sanitize_for_llm(v, max_str_len)
                else:
                    sanitized[k] = v
            return sanitized

        visual_for_llm = _sanitize_for_llm(visual_model_output)
        html_for_llm = _sanitize_for_llm(html_features)
        url_for_llm = _sanitize_for_llm(url_features)

        # Format long-term memory section
        memory_section = "No prior scan history in long-term memory."
        if domain_intel:
            memory_section = f"""Domain Reputation from Long-Term Memory:
- Total prior scans: {domain_intel.get('scan_count', 0)}
- Latest recorded risk score: {domain_intel.get('latest_risk_score')} ({domain_intel.get('latest_risk_level')})
- Suspected brand: {domain_intel.get('suspected_brand', 'None')}
- History: {json.dumps(domain_intel.get('history', []), indent=2)}"""

        report_prompt = f"""You are PhishLens, an expert cybersecurity analyst specializing in phishing website detection.

We have analyzed the target URL: {url}
Target Domain: {domain}

Here are the findings from our specialized analysis components and long-term threat memory:

1. Long-Term Threat Memory & Domain Reputation:
{memory_section}

2. Lexical & WHOIS URL Analysis:
{json.dumps(url_for_llm, indent=2)}

3. HTML/DOM Structural Analysis:
{json.dumps(html_for_llm, indent=2)}

4. Visual Screenshot Analysis (Visual ML Model Classifier):
{json.dumps(visual_for_llm, indent=2)}

Based on these findings, synthesize your final analysis and output a structured phishing risk report. Factor in the visual ML model's prediction and probability score under the visual/screenshot analysis findings. Also note any notable patterns comparing against long-term memory history.

## Final Report Format

You MUST output your final answer as a JSON object with this exact structure:

```json
{{
  "risk_score": <integer 0-100>,
  "risk_level": "<SAFE | LOW | MEDIUM | HIGH | CRITICAL>",
  "findings": [
    {{
      "category": "<URL Analysis | HTML Structure | Visual Analysis | Screenshot Analysis | Long-Term Memory>",
      "detail": "<specific finding>",
      "severity": "<low | medium | high | critical>"
    }}
  ],
  "brand_impersonation": {{
    "detected": <true | false>,
    "brand": "<brand name or null>",
    "confidence": <0.0-1.0 or null>
  }},
  "safety_advice": "<actionable advice for the user>",
  "summary": "<one-paragraph executive summary of the analysis>"
}}
```

## Scoring Guidelines:
- **0-20 (SAFE)**: Legitimate website with no phishing indicators
- **21-40 (LOW)**: Minor suspicious elements but likely safe
- **41-60 (MEDIUM)**: Multiple suspicious indicators, exercise caution
- **61-80 (HIGH)**: Strong phishing indicators, likely malicious
- **81-100 (CRITICAL)**: Clear phishing attempt, do not interact

Be thorough, precise, and evidence-based.
"""
        report = None
        raw_content = ""
        llm_error_detail = None

        try:
            response = self.llm.invoke([
                HumanMessage(content=report_prompt)
            ])
            raw_content = response.content
            parsed = parse_report(raw_content)
            if parsed and isinstance(parsed, dict) and "risk_score" in parsed and "risk_level" in parsed:
                report = parsed
        except Exception as llm_err:
            llm_error_detail = str(llm_err)
            logger.warning(f"[Orchestrator] Primary LLM synthesis failed ({llm_err}), falling back to deterministic multi-agent synthesis.")
            print(f"\n[Orchestrator] LLM ERROR DETAILS:\n{llm_error_detail}\n")

        # If LLM returned empty or unparseable report, generate complete deterministic multi-agent report
        used_fallback = False
        if not report:
            used_fallback = True
            report = self._synthesize_fallback_report(
                url=url,
                domain=domain,
                url_features=url_features,
                html_features=html_features,
                visual_model_output=visual_model_output,
                domain_intel=domain_intel
            )
            raw_content = json.dumps(report, indent=2)

        # Add synthesis metadata to report
        if isinstance(report, dict):
            report["synthesis_method"] = "deterministic_fallback" if used_fallback else "llm"
            if llm_error_detail:
                report["llm_error"] = llm_error_detail

        # Persist scan outcome into Long-Term Memory
        if report and isinstance(report, dict) and "risk_score" in report:
            try:
                brand_info = report.get("brand_impersonation") or {}
                suspected_brand = brand_info.get("brand") if brand_info.get("detected") else None
                long_term_memory.record_domain_scan(
                    domain=domain,
                    url=url,
                    risk_score=report.get("risk_score", 0),
                    risk_level=report.get("risk_level", "SAFE"),
                    findings=report.get("findings", []),
                    brand=suspected_brand,
                    user_id=state.get("user_id"),
                )
            except Exception as mem_err:
                logger.warning(f"Failed to record domain scan in long-term memory: {mem_err}")

        return {
            "report": report,
            "raw_llm_response": raw_content
        }

    def _synthesize_fallback_report(
        self,
        url: str,
        domain: str,
        url_features: Dict[str, Any],
        html_features: Dict[str, Any],
        visual_model_output: Dict[str, Any],
        domain_intel: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Deterministic multi-agent threat synthesis fallback that computes a full, accurate,
        structured report directly from visual, DOM, lexical/WHOIS, and memory signals.
        """
        findings = []
        base_score = 5

        # 1. Visual ML model signals
        visual_pred = (visual_model_output.get("prediction") or "").lower()
        visual_prob = visual_model_output.get("probability")
        brand_info = visual_model_output.get("brand_impersonation") or {}
        brand_detected = bool(brand_info.get("detected"))
        brand_name = brand_info.get("brand")
        brand_conf = brand_info.get("confidence")

        if visual_pred == "phishing" or (isinstance(visual_prob, (int, float)) and visual_prob >= 0.60):
            base_score += 45
            prob_pct = round((visual_prob or 0.75) * 100, 1)
            findings.append({
                "category": "Visual Analysis",
                "detail": f"Visual ML model classified the interface as potential phishing with {prob_pct}% probability.",
                "severity": "high"
            })
        elif visual_pred == "legitimate":
            conf_pct = round((1 - (visual_prob or 0.1)) * 100, 1)
            findings.append({
                "category": "Visual Analysis",
                "detail": f"Visual ML model verified interface legitimacy with {conf_pct}% confidence.",
                "severity": "low"
            })

        if brand_detected and brand_name:
            base_score += 35
            findings.append({
                "category": "Visual Analysis",
                "detail": f"Brand impersonation detected: visual elements match {brand_name} with {round((brand_conf or 0.8) * 100)}% similarity.",
                "severity": "critical"
            })

        # 2. HTML/DOM signals
        input_fields = html_features.get("input_fields") or {}
        if input_fields.get("password_fields", 0) > 0:
            base_score += 15
            findings.append({
                "category": "HTML Structure",
                "detail": f"Page contains {input_fields.get('password_fields')} credential/password input field(s).",
                "severity": "medium"
            })
        forms = html_features.get("forms") or {}
        form_details = forms.get("details", [])
        if any(f.get("action_is_external") for f in form_details):
            base_score += 25
            findings.append({
                "category": "HTML Structure",
                "detail": "Form submissions are directed to an external foreign domain.",
                "severity": "high"
            })

        # 3. URL Lexical & WHOIS signals
        whois_info = url_features.get("whois") or {}
        domain_age = whois_info.get("domain_age_days")
        if domain_age is not None and domain_age < 30:
            base_score += 20
            findings.append({
                "category": "URL Analysis",
                "detail": f"Recently registered domain (registered {domain_age} days ago).",
                "severity": "high"
            })
        elif domain_age is not None and domain_age > 365:
            base_score = max(5, base_score - 5)
            findings.append({
                "category": "URL Analysis",
                "detail": f"Established domain with {round(domain_age / 365, 1)} years of registration history.",
                "severity": "low"
            })

        typosquatting = url_features.get("typosquatting") or []
        if typosquatting:
            base_score += 25
            for t in typosquatting:
                findings.append({
                    "category": "URL Analysis",
                    "detail": t.get("pattern", "Suspected brand typosquatting detected."),
                    "severity": "high"
                })

        # 4. Long-Term Memory history
        if domain_intel and domain_intel.get("scan_count", 0) > 0:
            findings.append({
                "category": "Long-Term Memory",
                "detail": f"Domain history in long-term memory: {domain_intel.get('scan_count')} previous scan(s), last risk was {domain_intel.get('latest_risk_level', 'SAFE')}.",
                "severity": "low"
            })

        # Clamp score between 5 and 95
        final_score = max(5, min(95, base_score))
        if final_score <= 20:
            risk_level = "SAFE"
        elif final_score <= 40:
            risk_level = "LOW"
        elif final_score <= 60:
            risk_level = "MEDIUM"
        elif final_score <= 80:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"

        if not findings:
            findings.append({
                "category": "General Analysis",
                "detail": f"Target {domain} inspected across visual, lexical, and structural layers.",
                "severity": "low"
            })

        summary = (
            f"Analysis of {url} resulted in a {risk_level} risk score of {final_score}%. "
            f"{'Brand impersonation was identified targeting ' + brand_name + '. ' if (brand_detected and brand_name) else 'No brand impersonation detected. '}"
            f"Lexical, structural, and visual indicators have been synthesized to evaluate overall target safety."
        )

        safety_advice = (
            "Exercise extreme caution. Do not enter passwords, credit card numbers, or personal credentials."
            if final_score >= 50 else
            f"Website appears legitimate and safe for browsing. Always verify the domain name ({domain}) before entering sensitive credentials."
        )

        return {
            "risk_score": final_score,
            "risk_level": risk_level,
            "findings": findings,
            "brand_impersonation": {
                "detected": brand_detected,
                "brand": brand_name,
                "confidence": brand_conf
            },
            "safety_advice": safety_advice,
            "summary": summary
        }

    def run(self, url: str, chat_id: Optional[str] = None, user=None) -> Dict[str, Any]:
        """
        Analyse a URL for phishing indicators using the StateGraph pipeline with short-term
        and long-term memory persistence.

        Saves chat session and message artifacts to PostgreSQL database.
        """
        start_time = time.time()
        session_id = chat_id or str(uuid.uuid4())
        user_id_str = str(user.id) if user and hasattr(user, "id") else None

        # Ensure session_id is a valid UUID for the UUIDField primary key
        try:
            session_uuid = uuid.UUID(str(session_id))
        except ValueError:
            session_uuid = uuid.uuid4()
            session_id = str(session_uuid)

        print(f"\n{'='*60}")
        print(f"[PhishLens Orchestrator] Starting analysis of: {url} (Chat ID: {session_id})")
        print(f"{'='*60}\n")

        # 1. Retrieve or create PostgreSQL ChatSession
        chat_session = None
        try:
            from backend.agents.models import ChatSession, ChatMessage
            clean_title = f"Scan: {self._extract_clean_domain(url)}"
            chat_session, created = ChatSession.objects.get_or_create(
                id=session_uuid,
                defaults={
                    "title": clean_title,
                    "user": user if (user and getattr(user, "is_authenticated", False)) else None,
                }
            )
            # Create user message entry
            ChatMessage.objects.create(
                chat=chat_session,
                sender="user",
                message_type="scan_result",
                text=f"Scan target: {url}",
                target_url=url,
            )
            print(f"[PhishLens DB] {'Created new' if created else 'Found existing'} ChatSession: {session_uuid}")
        except Exception as db_err:
            logger.error(f"Error accessing ChatSession model: {db_err}")
            print(f"[PhishLens DB] ERROR saving ChatSession: {db_err}")

        try:
            # 2. Invoke StateGraph with thread-scoped config (Short-term memory)
            config = {"configurable": {"thread_id": str(session_id)}}
            result = self.agent.invoke({
                "url": url,
                "chat_id": session_id,
                "user_id": user_id_str,
                "tool_trace": []
            }, config=config)

            report = result.get("report")
            raw_content = result.get("raw_llm_response") or ""
            screenshot_data = result.get("screenshot_data")
            annotated_screenshot_data = result.get("annotated_screenshot_data")
            screenshot_path = result.get("screenshot_path")
            annotated_screenshot_path = result.get("annotated_screenshot_path")
            dom_feature_vector = result.get("dom_feature_vector")
            url_feature_vector = result.get("url_feature_vector")
            visual_model_output = result.get("visual_model_output")

            url_features = result.get("url_features") or {}
            url_analysis_data = None
            if url_features.get("status") == "success":
                url_analysis_data = {
                    "whois": url_features.get("whois", {}),
                    "ssl_certificate": url_features.get("ssl_certificate", {}),
                    "server_location": url_features.get("server_location", {}),
                    "global_ranking": url_features.get("global_ranking", {}),
                }

            tool_trace = result.get("tool_trace") or []
            duration = round(time.time() - start_time, 2)

            # 3. Save Assistant scan result message to PostgreSQL
            if chat_session:
                try:
                    from backend.agents.models import ChatMessage
                    ChatMessage.objects.create(
                        chat=chat_session,
                        sender="assistant",
                        message_type="scan_result",
                        target_url=url,
                        screenshot_data=screenshot_data,
                        annotated_screenshot_data=annotated_screenshot_data,
                        screenshot_path=screenshot_path,
                        report=report,
                        url_analysis_data=url_analysis_data,
                        tool_trace=tool_trace,
                        overall_status="COMPLETED",
                        duration_sec=duration,
                        text=report.get("summary") if isinstance(report, dict) else "Phishing analysis complete.",
                    )
                except Exception as save_err:
                    logger.error(f"Error saving assistant ChatMessage: {save_err}")

            return {
                "chat_id": session_id,
                "target_url": url,
                "overall_status": "COMPLETED",
                "total_duration_sec": duration,
                "report": report,
                "screenshot_data": screenshot_data,
                "screenshot_url": screenshot_data,
                "annotated_screenshot_data": annotated_screenshot_data,
                "annotated_screenshot_url": annotated_screenshot_data,
                "screenshot_path": screenshot_path,
                "annotated_screenshot_path": annotated_screenshot_path,
                "dom_feature_vector": dom_feature_vector,
                "url_feature_vector": url_feature_vector,
                "visual_model_output": visual_model_output,
                "url_analysis_data": url_analysis_data,
                "tool_trace": tool_trace,
                "raw_llm_response": raw_content,
            }

        except Exception as e:
            duration = round(time.time() - start_time, 2)
            logger.error(f"[PhishLens Orchestrator] ERROR: {e}")

            if chat_session:
                try:
                    from backend.agents.models import ChatMessage
                    ChatMessage.objects.create(
                        chat=chat_session,
                        sender="assistant",
                        message_type="scan_result",
                        target_url=url,
                        overall_status="FAILED",
                        duration_sec=duration,
                        error=str(e),
                        text=f"Scan failed: {str(e)}",
                    )
                except Exception:
                    pass

            return {
                "chat_id": session_id,
                "target_url": url,
                "overall_status": "FAILED",
                "total_duration_sec": duration,
                "error": str(e),
                "report": None,
                "tool_trace": [],
            }

    def run_followup_chat(self, chat_id: str, user_message: str, user=None) -> Dict[str, Any]:
        """
        Processes a follow-up conversational message within an existing chat thread (/chat/<id>).
        Maintains conversational short-term context while referencing the chat's scan reports.
        """
        start_time = time.time()
        user_id_str = str(user.id) if user and hasattr(user, "id") else None

        # Ensure chat_id is a valid UUID for the UUIDField primary key
        try:
            session_uuid = uuid.UUID(str(chat_id))
        except ValueError:
            session_uuid = uuid.uuid4()
            chat_id = str(session_uuid)

        from backend.agents.models import ChatSession, ChatMessage
        chat_session = ChatSession.objects.filter(id=session_uuid).first()
        if not chat_session:
            chat_session = ChatSession.objects.create(
                id=session_uuid,
                title="Security Chat",
                user=user if (user and getattr(user, "is_authenticated", False)) else None,
            )

        # Record User Message in PostgreSQL
        ChatMessage.objects.create(
            chat=chat_session,
            sender="user",
            message_type="text",
            text=user_message,
        )

        # Retrieve recent messages in this session for context
        recent_messages = list(chat_session.messages.order_by("created_at")[:15])

        # Assemble conversation history context
        formatted_history = []
        latest_report = None
        target_url = None

        for msg in recent_messages:
            if msg.report:
                latest_report = msg.report
            if msg.target_url:
                target_url = msg.target_url

            if msg.sender == "user":
                formatted_history.append(f"User: {msg.text or msg.target_url}")
            elif msg.sender == "assistant":
                if msg.report and isinstance(msg.report, dict):
                    summary = msg.report.get("summary", "")
                    risk = msg.report.get("risk_level", "")
                    score = msg.report.get("risk_score", 0)
                    formatted_history.append(f"Assistant [Report]: Risk Level {risk} ({score}/100). {summary}")
                else:
                    formatted_history.append(f"Assistant: {msg.text}")

        system_context = f"""You are PhishLens, an expert cybersecurity and anti-phishing assistant.
You are chatting with a user in an active security investigation session (Chat ID: {chat_id}).

Active Target URL: {target_url or 'None analyzed yet'}
Latest Phishing Report Findings:
{json.dumps(latest_report, indent=2) if latest_report else 'No previous report in this thread.'}

Your task:
- Answer the user's questions clearly, concisely, and authoritatively.
- Explain technical phishing indicators (e.g. SSL certificates, WHOIS registry age, Siamese visual model results, form action endpoints, brand spoofing).
- Provide concrete, actionable cybersecurity advice on whether the user should proceed, how to protect credentials, or how to report malicious domains.
"""

        messages_payload = [
            SystemMessage(content=system_context),
            HumanMessage(content="\n".join(formatted_history[-8:]))
        ]

        try:
            response = self.llm.invoke(messages_payload)
            reply_text = response.content
            duration = round(time.time() - start_time, 2)

            # Record Assistant reply in PostgreSQL
            bot_msg = ChatMessage.objects.create(
                chat=chat_session,
                sender="assistant",
                message_type="follow_up",
                text=reply_text,
                duration_sec=duration,
                overall_status="COMPLETED",
            )

            return {
                "chat_id": chat_id,
                "message_id": str(bot_msg.id),
                "reply": reply_text,
                "status": "success",
                "duration_sec": duration,
            }
        except Exception as e:
            logger.error(f"Error during follow-up chat invocation: {e}")
            return {
                "chat_id": chat_id,
                "reply": f"Sorry, I encountered an error processing your message: {str(e)}",
                "status": "error",
                "error": str(e),
            }


# Instantiate orchestrator and compiled graph
orchestrator = OrchestratorAgent()
graph = orchestrator.agent
