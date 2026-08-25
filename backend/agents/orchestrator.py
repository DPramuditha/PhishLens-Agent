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
from backend.agents.web_search_agent import search_web_threat_intel
from backend.agents.report_generator import (
    SYSTEM_PROMPT,
    parse_report,
    extract_tool_trace,
)
from backend.agents.memory import (
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
    web_search_results: Optional[Dict[str, Any]]
    web_search_summary: Optional[str]
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
        workflow.add_node("web_search_agent", self._web_search_agent_node)
        workflow.add_node("report_generation", self._report_generation_node)

        # Set up connections
        workflow.add_edge(START, "orchestrator")

        # Split in parallel
        workflow.add_edge("orchestrator", "web_scraping_agent")
        workflow.add_edge("orchestrator", "html_dom_agent")
        workflow.add_edge("orchestrator", "url_feature_agent")
        workflow.add_edge("orchestrator", "web_search_agent")

        # Web scraping -> Siamese Network
        workflow.add_edge("web_scraping_agent", "siamese_network")

        # Merge at report generation
        workflow.add_edge("siamese_network", "report_generation")
        workflow.add_edge("html_dom_agent", "report_generation")
        workflow.add_edge("url_feature_agent", "report_generation")
        workflow.add_edge("web_search_agent", "report_generation")

        workflow.add_edge("report_generation", END)

        # Compile workflow
        self.agent = workflow.compile()

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
        screenshot_warning = state.get("screenshot_warning") or ""
        target_input = screenshot_data or screenshot_path
        if not target_input or "produced empty bytes" in screenshot_warning or "Connection could not be established" in screenshot_warning:
            return {
                "visual_model_output": {
                    "status": "unavailable",
                    "error": screenshot_warning or "No valid rendered screenshot available",
                    "prediction": "unknown",
                    "probability": None,
                    "brand_impersonation": {"detected": False, "brand": None, "confidence": None},
                },
                "annotated_screenshot_data": None,
                "annotated_screenshot_path": None,
                "tool_trace": [
                    {
                        "step": "info",
                        "message": "Siamese Network skipped: no live rendered screenshot available"
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

    def _web_search_agent_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Performs live OSINT web threat intelligence search via Tavily Search Platform."""
        url = state["url"]
        trace_call = {
            "step": "tool_call",
            "tool": "search_web_threat_intel",
            "args": {"url": url}
        }
        try:
            res_str = search_web_threat_intel.invoke({"url": url})
            res = json.loads(res_str) if isinstance(res_str, str) else res_str
            summary_preview = res.get("summary") or str(res)[:200]
            trace_res = {
                "step": "tool_result",
                "tool": "search_web_threat_intel",
                "content_preview": summary_preview[:250] + ("..." if len(summary_preview) > 250 else "")
            }
            return {
                "web_search_results": res,
                "web_search_summary": res.get("summary"),
                "tool_trace": [trace_call, trace_res]
            }
        except Exception as e:
            trace_res = {
                "step": "tool_result",
                "tool": "search_web_threat_intel",
                "content_preview": f"Error: {str(e)}"
            }
            return {
                "web_search_results": {"status": "error", "error": str(e)},
                "web_search_summary": None,
                "tool_trace": [trace_call, trace_res]
            }

    def _report_generation_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Synthesizes all findings and long-term memory into the final report."""
        url = state["url"]
        domain = state.get("domain") or self._extract_clean_domain(url)
        url_features = state.get("url_features") or {}
        html_features = state.get("html_features") or {}
        visual_model_output = state.get("visual_model_output") or {}
        web_search_results = state.get("web_search_results") or {}
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
        web_search_for_llm = _sanitize_for_llm(web_search_results)

        # Format long-term memory section
        memory_section = "No prior scan history in long-term memory."
        if domain_intel:
            memory_section = f"""Domain Reputation from Long-Term Memory (Reference only — re-evaluate current URL evidence):
- Total prior scans: {domain_intel.get('scan_count', 0)}
- Latest recorded risk score: {domain_intel.get('latest_risk_score')} ({domain_intel.get('latest_risk_level')})
- Suspected brand: {domain_intel.get('suspected_brand', 'None')}
- History: {json.dumps(domain_intel.get('history', []), indent=2)}"""

        # Precompute deterministic multi-agent synthesis as baseline
        deterministic_baseline = self._synthesize_fallback_report(
            url=url,
            domain=domain,
            url_features=url_features,
            html_features=html_features,
            visual_model_output=visual_model_output,
            domain_intel=domain_intel,
            web_search_results=web_search_results
        )

        report_prompt = f"""You are PhishLens, an expert cybersecurity analyst specializing in phishing website detection.

We have analyzed the target URL: {url}
Target Domain: {domain}

Here are the detailed extraction outputs from our specialized analysis components and long-term threat memory:

1. Long-Term Threat Memory & Domain Reputation:
{memory_section}

2. Lexical & WHOIS URL Analysis:
{json.dumps(url_for_llm, indent=2)}

3. HTML/DOM Structural Analysis:
{json.dumps(html_for_llm, indent=2)}

4. Visual Screenshot Analysis (Visual ML Model Classifier):
{json.dumps(visual_for_llm, indent=2)}

5. Live Web & OSINT Threat Intelligence (Tavily Search):
{json.dumps(web_search_for_llm, indent=2)}

Synthesize ALL findings across visual ML, HTML/DOM structure, URL lexical/WHOIS, live web OSINT search, and threat memory to calculate the final risk score (0-100) and risk level.
DO NOT simply copy historical scores from memory. Compute the fresh risk score based on the extracted evidence.

## Final Report Format

You MUST output your final answer as a JSON object with this exact structure:

```json
{{
  "risk_score": <integer 0-100>,
  "risk_level": "<SAFE | LOW | MEDIUM | HIGH | CRITICAL>",
  "findings": [
    {{
      "category": "<URL Analysis | HTML Structure | Visual Analysis | Screenshot Analysis | Web Intelligence | Long-Term Memory>",
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
                llm_score = parsed.get("risk_score")
                if isinstance(llm_score, (int, float)):
                    parsed["risk_score"] = int(max(0, min(100, llm_score)))
                    report = parsed
        except Exception as llm_err:
            llm_error_detail = str(llm_err)
            logger.warning(f"[Orchestrator] Primary LLM synthesis failed ({llm_err}), falling back to deterministic multi-agent synthesis.")
            print(f"\n[Orchestrator] LLM ERROR DETAILS:\n{llm_error_detail}\n")

        # If LLM returned empty, unparseable, or invalid report, use the complete deterministic multi-agent report
        used_fallback = False
        if not report:
            used_fallback = True
            report = deterministic_baseline
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
        domain_intel: Dict[str, Any],
        web_search_results: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Deterministic multi-agent threat synthesis engine that computes an accurate,
        evidence-based risk score directly from Visual ML, DOM structure, Lexical/WHOIS,
        Live Web Threat Search (Tavily), and Long-Term Memory signals.
        """
        findings = []
        risk_score = 0

        url_features = url_features or {}
        html_features = html_features or {}
        visual_model_output = visual_model_output or {}
        domain_intel = domain_intel or {}
        web_search_results = web_search_results or {}

        # -------------------------------------------------------------------
        # 1. VISUAL COMPUTER VISION ML MODEL SIGNALS (Weight: 0 to 45 pts)
        # -------------------------------------------------------------------
        visual_pred = (visual_model_output.get("prediction") or "").lower()
        visual_prob = visual_model_output.get("probability")
        brand_info = visual_model_output.get("brand_impersonation") or {}
        brand_detected = bool(brand_info.get("detected"))
        brand_name = brand_info.get("brand")
        brand_conf = brand_info.get("confidence") or 0.0

        if visual_pred == "phishing" or (isinstance(visual_prob, (int, float)) and visual_prob >= 0.60):
            prob_val = visual_prob if isinstance(visual_prob, (int, float)) else 0.75
            prob_pct = round(prob_val * 100, 1)
            ml_points = int(30 + (prob_val - 0.60) * 37.5)
            ml_points = min(45, max(30, ml_points))
            risk_score += ml_points
            findings.append({
                "category": "Visual Analysis",
                "detail": f"Visual ML model classified the interface as potential phishing with {prob_pct}% probability.",
                "severity": "critical" if prob_val >= 0.80 else "high"
            })
        elif visual_pred == "legitimate":
            prob_val = visual_prob if isinstance(visual_prob, (int, float)) else 0.05
            conf_pct = round((1.0 - prob_val) * 100, 1)
            findings.append({
                "category": "Visual Analysis",
                "detail": f"Visual ML model verified interface legitimacy with {conf_pct}% confidence.",
                "severity": "low"
            })

        if brand_detected and brand_name:
            brand_points = int(25 + brand_conf * 10)
            risk_score += brand_points
            findings.append({
                "category": "Screenshot Analysis",
                "detail": f"Brand impersonation detected: visual elements match {brand_name} with {round(brand_conf * 100)}% similarity.",
                "severity": "critical"
            })

        # -------------------------------------------------------------------
        # 2. URL LEXICAL, WHOIS & NETWORK SIGNALS (Weight: 0 to 45 pts)
        # -------------------------------------------------------------------
        # A. Typosquatting
        typosquatting = (
            url_features.get("typosquatting_analysis") or
            url_features.get("typosquatting") or
            []
        )
        if typosquatting:
            risk_score += 35
            for t in typosquatting:
                brand_t = t.get("brand", "target brand")
                pattern_t = t.get("pattern") or f"Suspected brand typosquatting detected targeting {brand_t}."
                findings.append({
                    "category": "URL Analysis",
                    "detail": pattern_t,
                    "severity": "critical"
                })
                if not brand_detected:
                    brand_detected = True
                    brand_name = brand_t
                    brand_conf = 0.85

        # B. WHOIS Domain Age
        whois_info = url_features.get("whois") or {}
        domain_age = whois_info.get("domain_age_days")
        if domain_age is not None and isinstance(domain_age, (int, float)):
            if domain_age < 14:
                risk_score += 25
                findings.append({
                    "category": "URL Analysis",
                    "detail": f"Extremely new domain registered only {domain_age} day(s) ago (high phishing risk).",
                    "severity": "critical"
                })
            elif domain_age < 30:
                risk_score += 20
                findings.append({
                    "category": "URL Analysis",
                    "detail": f"Recently registered domain (registered {domain_age} days ago).",
                    "severity": "high"
                })
            elif domain_age < 90:
                risk_score += 10
                findings.append({
                    "category": "URL Analysis",
                    "detail": f"Young domain registered {domain_age} days ago.",
                    "severity": "medium"
                })
            elif domain_age > 365:
                risk_score = max(0, risk_score - 5)
                findings.append({
                    "category": "URL Analysis",
                    "detail": f"Established domain with {round(domain_age / 365, 1)} years of registration history.",
                    "severity": "low"
                })

        # C. Lexical & Obfuscation Features
        lexical = url_features.get("lexical_features") or {}
        if lexical.get("is_ip_address"):
            risk_score += 25
            findings.append({
                "category": "URL Analysis",
                "detail": "Target URL uses a raw IP address instead of a standard registered domain name.",
                "severity": "high"
            })
        if (lexical.get("subdomain_depth") or 0) >= 3:
            depth = lexical.get("subdomain_depth")
            risk_score += 15
            findings.append({
                "category": "URL Analysis",
                "detail": f"Excessive subdomain nesting ({depth} levels), commonly used for deceptive domain masking.",
                "severity": "medium"
            })
        if (lexical.get("domain_entropy") or 0) > 3.5:
            entropy = lexical.get("domain_entropy")
            risk_score += 15
            findings.append({
                "category": "URL Analysis",
                "detail": f"High domain Shannon entropy ({entropy}), suggesting algorithmically generated (DGA) domain name.",
                "severity": "medium"
            })
        if lexical.get("at_sign_present"):
            risk_score += 15
            findings.append({
                "category": "URL Analysis",
                "detail": "URL contains '@' symbol, indicating potential credentials embedding or URL obfuscation trick.",
                "severity": "high"
            })
        if lexical.get("double_slash_in_path"):
            risk_score += 15
            findings.append({
                "category": "URL Analysis",
                "detail": "URL path contains '//' sequence, indicative of open redirect abuse.",
                "severity": "high"
            })
        if (lexical.get("hyphen_count") or 0) >= 3:
            hyphens = lexical.get("hyphen_count")
            risk_score += 10
            findings.append({
                "category": "URL Analysis",
                "detail": f"Excessive hyphens in hostname ({hyphens} hyphens), typical of deceptive brand-mimicking domains.",
                "severity": "medium"
            })
        if (lexical.get("url_length") or 0) > 80:
            u_len = lexical.get("url_length")
            risk_score += 10
            findings.append({
                "category": "URL Analysis",
                "detail": f"Suspiciously long URL ({u_len} characters).",
                "severity": "low"
            })

        # D. Suspicious Keywords in URL
        url_keywords = url_features.get("suspicious_keywords_in_url") or []
        if url_keywords:
            risk_score += min(20, 10 + len(url_keywords) * 3)
            findings.append({
                "category": "URL Analysis",
                "detail": f"Suspicious authentication/security keywords in URL: {', '.join(url_keywords[:4])}.",
                "severity": "high" if any(k in ["login", "signin", "verify", "secure", "account", "bank", "password"] for k in url_keywords) else "medium"
            })

        # E. SSL Certificate & Protocol
        ssl_cert = url_features.get("ssl_certificate") or {}
        if ssl_cert.get("status") == "untrusted" or ssl_cert.get("is_trusted") is False:
            risk_score += 25
            findings.append({
                "category": "URL Analysis",
                "detail": f"SSL certificate verification failed: {ssl_cert.get('error') or 'Untrusted or self-signed certificate'}.",
                "severity": "high"
            })
        elif lexical.get("scheme") == "http" or url.startswith("http://"):
            risk_score += 15
            findings.append({
                "category": "URL Analysis",
                "detail": "Site uses insecure HTTP protocol without SSL/TLS transport encryption.",
                "severity": "medium"
            })
        elif ssl_cert.get("is_trusted"):
            findings.append({
                "category": "URL Analysis",
                "detail": f"Valid SSL certificate issued by {ssl_cert.get('issuer') or 'Trusted Certificate Authority'}.",
                "severity": "low"
            })

        # F. Global Ranking (Tranco)
        global_rank = url_features.get("global_ranking") or {}
        rank_val = global_rank.get("rank")
        if rank_val and isinstance(rank_val, int) and rank_val <= 20000:
            if not brand_detected and risk_score < 30:
                risk_score = max(0, risk_score - 10)
                findings.append({
                    "category": "URL Analysis",
                    "detail": f"Highly popular legitimate domain (Tranco Global Rank #{rank_val}).",
                    "severity": "low"
                })

        # -------------------------------------------------------------------
        # 3. HTML / DOM STRUCTURAL SIGNALS (Weight: 0 to 40 pts)
        # -------------------------------------------------------------------
        input_fields = html_features.get("input_fields") or {}
        password_count = input_fields.get("password_fields", 0)
        email_count = input_fields.get("email_fields", 0)

        if password_count > 0:
            risk_score += 15
            findings.append({
                "category": "HTML Structure",
                "detail": f"Page contains {password_count} credential/password input field(s).",
                "severity": "medium"
            })
        elif email_count > 0:
            risk_score += 5

        forms = html_features.get("forms") or {}
        form_details = forms.get("details", [])
        external_forms = [f for f in form_details if f.get("action_is_external")]
        if external_forms:
            risk_score += 30
            ext_domains = list(set(f.get("action_domain") for f in external_forms if f.get("action_domain")))
            findings.append({
                "category": "HTML Structure",
                "detail": f"Form submissions are directed to an external third-party domain ({', '.join(ext_domains) if ext_domains else 'external domain'}).",
                "severity": "critical"
            })

        # Iframes
        iframes = html_features.get("iframes") or {}
        iframe_details = iframes.get("details", [])
        hidden_iframes = [i for i in iframe_details if i.get("potentially_hidden")]
        if hidden_iframes:
            risk_score += 20
            findings.append({
                "category": "HTML Structure",
                "detail": f"Detected {len(hidden_iframes)} hidden iframe(s) in DOM, often used for stealth clickjacking or credential harvesting.",
                "severity": "high"
            })
        elif len(iframe_details) > 0:
            risk_score += 5
            findings.append({
                "category": "HTML Structure",
                "detail": f"Page embeds {len(iframe_details)} iframe container(s).",
                "severity": "low"
            })

        # External Resources & Links
        favicon_info = html_features.get("favicon") or {}
        if favicon_info.get("is_external"):
            risk_score += 5
            findings.append({
                "category": "HTML Structure",
                "detail": "Favicon is loaded from an external domain.",
                "severity": "low"
            })

        links_info = html_features.get("links") or {}
        total_links = links_info.get("total", 0)
        ext_links = links_info.get("external", 0)
        null_links = links_info.get("null_or_dead", 0)

        if total_links > 3:
            if ext_links / total_links > 0.60:
                risk_score += 10
                findings.append({
                    "category": "HTML Structure",
                    "detail": f"Unusually high proportion of external hyperlinks ({round(ext_links/total_links*100)}%).",
                    "severity": "medium"
                })
            if null_links / total_links > 0.50:
                risk_score += 10
                findings.append({
                    "category": "HTML Structure",
                    "detail": f"High proportion of dead/anchor links ({round(null_links/total_links*100)}%), typical of clone templates.",
                    "severity": "medium"
                })

        # DOM Text Suspicious Keywords & Brand Mentions
        dom_keywords = html_features.get("suspicious_keywords_found") or []
        if len(dom_keywords) >= 3:
            risk_score += 15
            findings.append({
                "category": "HTML Structure",
                "detail": f"Multiple phishing-related keywords present in page text: {', '.join(dom_keywords[:5])}.",
                "severity": "high"
            })
        elif len(dom_keywords) >= 1:
            risk_score += 5

        brand_mentions = html_features.get("brand_mentions_in_text") or []
        foreign_brand_mentions = [b for b in brand_mentions if b not in domain.lower()]
        if foreign_brand_mentions:
            risk_score += 15
            findings.append({
                "category": "HTML Structure",
                "detail": f"Page text prominently references brand(s) {', '.join(foreign_brand_mentions)} not matching domain '{domain}'.",
                "severity": "high"
            })

        # -------------------------------------------------------------------
        # 4. LONG-TERM THREAT MEMORY SIGNALS (Weight: +/- 15 pts)
        # -------------------------------------------------------------------
        if domain_intel and domain_intel.get("scan_count", 0) > 0:
            past_scans = domain_intel.get("scan_count", 0)
            last_risk = domain_intel.get("latest_risk_level", "SAFE")
            last_score = domain_intel.get("latest_risk_score", 0)
            if last_score >= 61:
                risk_score += 15
                findings.append({
                    "category": "Long-Term Memory",
                    "detail": f"Domain history in threat memory: {past_scans} prior scan(s), previously flagged as {last_risk} ({last_score}%).",
                    "severity": "high"
                })
            else:
                findings.append({
                    "category": "Long-Term Memory",
                    "detail": f"Domain history in long-term memory: {past_scans} previous scan(s) evaluated as {last_risk}.",
                    "severity": "low"
                })

        # -------------------------------------------------------------------
        # 5. LIVE WEB & OSINT THREAT INTELLIGENCE SIGNALS (Weight: -10 to +35 pts)
        # -------------------------------------------------------------------
        if web_search_results and web_search_results.get("status") == "success":
            threat_indicators = web_search_results.get("threat_indicators") or []
            legitimacy_indicators = web_search_results.get("legitimacy_indicators") or []
            risk_signal = web_search_results.get("risk_signal", "NEUTRAL")
            summary_text = web_search_results.get("summary")

            if risk_signal == "CRITICAL" or len(threat_indicators) >= 3:
                risk_score += 35
                findings.append({
                    "category": "Web Intelligence",
                    "detail": f"Live web search flagged domain '{domain}' in multiple phishing/scam reports and security advisories.",
                    "severity": "critical"
                })
            elif risk_signal == "HIGH" or len(threat_indicators) >= 1:
                risk_score += 20
                for ti in threat_indicators[:2]:
                    findings.append({
                        "category": "Web Intelligence",
                        "detail": f"Online threat report: {ti.get('source_title', 'Security Alert')} (Keywords: {', '.join(ti.get('keywords_matched', []))}).",
                        "severity": "high"
                    })
            elif risk_signal == "SAFE" and len(legitimacy_indicators) >= 2 and not threat_indicators:
                risk_score = max(0, risk_score - 10)
                findings.append({
                    "category": "Web Intelligence",
                    "detail": f"Live web search confirmed established enterprise/brand presence for '{domain}'.",
                    "severity": "low"
                })
            elif summary_text and not threat_indicators:
                findings.append({
                    "category": "Web Intelligence",
                    "detail": f"OSINT research summary: {summary_text[:180]}",
                    "severity": "low"
                })

        # -------------------------------------------------------------------
        # 6. FINAL SCORE NORMALIZATION & VERDICT
        # -------------------------------------------------------------------
        final_score = max(0, min(100, risk_score))

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

        # Generate summary and actionable safety advice
        if final_score >= 61:
            summary = (
                f"Analysis of {url} indicates a {risk_level} phishing risk with an overall risk score of {final_score}%. "
                f"{'Brand impersonation was identified targeting ' + str(brand_name) + '. ' if (brand_detected and brand_name) else ''}"
                f"Critical indicators include malicious visual/structural patterns and deceptive lexical attributes."
            )
            safety_advice = "DANGER: Do not enter passwords, payment details, or personal information. Close the webpage immediately."
        elif final_score >= 41:
            summary = (
                f"Analysis of {url} resulted in a {risk_level} risk score of {final_score}%. "
                f"Multiple suspicious indicators were detected across structural and lexical layers that warrant caution."
            )
            safety_advice = "Exercise caution. Verify the domain identity and SSL certificate before submitting any sensitive information."
        elif final_score >= 21:
            summary = (
                f"Analysis of {url} yielded a {risk_level} risk score of {final_score}%. "
                f"Minor anomalies were noted, but no active phishing or brand spoofing indicators were confirmed."
            )
            safety_advice = f"Website is likely legitimate. Always check the browser address bar ({domain}) before interacting."
        else:
            summary = (
                f"Analysis of {url} concluded with a {risk_level} risk score of {final_score}%. "
                f"Visual verification, DOM analysis, and lexical reputation confirm the target is legitimate with no phishing indicators."
            )
            safety_advice = f"The website appears safe and legitimate. Ensure your browser displays the trusted domain name ({domain})."

        return {
            "risk_score": final_score,
            "risk_level": risk_level,
            "findings": findings,
            "brand_impersonation": {
                "detected": brand_detected,
                "brand": brand_name if brand_detected else None,
                "confidence": round(brand_conf, 2) if brand_detected else None
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
            web_search_results = result.get("web_search_results")
            web_search_summary = result.get("web_search_summary")

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
                "web_search_results": web_search_results,
                "web_search_summary": web_search_summary,
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
