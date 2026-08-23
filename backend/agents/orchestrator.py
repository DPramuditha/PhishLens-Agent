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
    screenshot_path: Optional[str]
    page_title: Optional[str]
    final_url: Optional[str]
    screenshot_warning: Optional[str]
    visual_model_output: Optional[Dict[str, Any]]
    html_features: Optional[Dict[str, Any]]
    url_features: Optional[Dict[str, Any]]
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
                temperature=0,
                max_retries=10,
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
        """Captures screenshot using Playwright."""
        url = state["url"]
        trace_call = {
            "step": "tool_call",
            "tool": "capture_screenshot",
            "args": {"url": url}
        }
        try:
            res_str = capture_screenshot.invoke({"url": url})
            res = json.loads(res_str)
            trace_res = {
                "step": "tool_result",
                "tool": "capture_screenshot",
                "content_preview": res_str[:200] + "..." if len(res_str) > 200 else res_str
            }
            return {
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
                "screenshot_path": None,
                "screenshot_warning": str(e),
                "tool_trace": [trace_call, trace_res]
            }

    def _siamese_network_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Runs binary visual classifier on screenshot."""
        screenshot_path = state.get("screenshot_path")
        if not screenshot_path:
            return {
                "visual_model_output": {"status": "error", "error": "No screenshot path"},
                "tool_trace": [
                    {
                        "step": "info",
                        "message": "Siamese Network skipped: no screenshot path available"
                    }
                ]
            }
        trace_call = {
            "step": "tool_call",
            "tool": "run_visual_ml_model",
            "args": {"screenshot_path": screenshot_path}
        }
        try:
            res_str = run_visual_ml_model.invoke({"screenshot_path": screenshot_path})
            res = json.loads(res_str)
            trace_res = {
                "step": "tool_result",
                "tool": "run_visual_ml_model",
                "content_preview": res_str[:200] + "..." if len(res_str) > 200 else res_str
            }
            return {
                "visual_model_output": res,
                "tool_trace": [trace_call, trace_res]
            }
        except Exception as e:
            trace_res = {
                "step": "tool_result",
                "tool": "run_visual_ml_model",
                "content_preview": f"Error: {str(e)}"
            }
            return {
                "visual_model_output": {"status": "error", "error": str(e)},
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
{json.dumps(url_features, indent=2)}

3. HTML/DOM Structural Analysis:
{json.dumps(html_features, indent=2)}

4. Visual Screenshot Analysis (Visual ML Model Classifier):
{json.dumps(visual_model_output, indent=2)}

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
        try:
            response = self.llm.invoke([
                HumanMessage(content=report_prompt)
            ])
            raw_content = response.content
            report = parse_report(raw_content)

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
        except Exception as e:
            return {
                "report": {
                    "parse_error": f"Failed to generate report: {str(e)}",
                    "raw_response": ""
                },
                "raw_llm_response": f"Error during LLM invocation: {str(e)}"
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

        print(f"\n{'='*60}")
        print(f"[PhishLens Orchestrator] Starting analysis of: {url} (Chat ID: {session_id})")
        print(f"{'='*60}\n")

        # 1. Retrieve or create PostgreSQL ChatSession
        chat_session = None
        try:
            from backend.agents.models import ChatSession, ChatMessage
            clean_title = f"Scan: {self._extract_clean_domain(url)}"
            chat_session, created = ChatSession.objects.get_or_create(
                id=session_id,
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
        except Exception as db_err:
            logger.error(f"Error accessing ChatSession model: {db_err}")

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
            screenshot_path = result.get("screenshot_path")

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
                "screenshot_path": screenshot_path,
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

        from backend.agents.models import ChatSession, ChatMessage
        chat_session = ChatSession.objects.filter(id=chat_id).first()
        if not chat_session:
            chat_session = ChatSession.objects.create(
                id=chat_id,
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
