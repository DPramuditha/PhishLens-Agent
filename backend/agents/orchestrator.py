"""
PhishLens Agent — LangGraph custom StateGraph Orchestrator.

Implements the multi-agent DAG structure:
1. Orchestrator initializes state.
2. Runs parallel checks:
   - Web Scraping Agent (Playwright screenshot) -> Siamese Visual ML Classifier
   - HTML/DOM Agent (DOM structural features)
   - URL Feature Agent (Lexical & WHOIS analysis)
3. Synthesizes findings into a final report via Report Generation Node.
"""

import os
import time
import json
import re
from typing import Any, Dict, List, Optional, Annotated, TypedDict
import operator

import nest_asyncio
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage
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

# Allow nested event loops (needed inside Django / Jupyter)
nest_asyncio.apply()

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


# Reducer function to append to trace lists in parallel execution
def append_trace(left: list, right: list) -> list:
    return left + right


class PhishLensState(TypedDict):
    """Shared state for the PhishLens multi-agent workflow."""
    url: str
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
    DAG orchestrator that coordinates all sub-agent nodes via a custom LangGraph workflow.
    """

    def __init__(self):
        # LLM
        self.llm = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5.4-mini"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
            temperature=0,
            max_retries=10,
        )

        # Define the workflow
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

        # From orchestrator, split in parallel
        workflow.add_edge("orchestrator", "web_scraping_agent")
        workflow.add_edge("orchestrator", "html_dom_agent")
        workflow.add_edge("orchestrator", "url_feature_agent")

        # From web scraping, transition to visual network (Siamese Model)
        workflow.add_edge("web_scraping_agent", "siamese_network")

        # Merge nodes at report generation
        workflow.add_edge("siamese_network", "report_generation")
        workflow.add_edge("html_dom_agent", "report_generation")
        workflow.add_edge("url_feature_agent", "report_generation")

        workflow.add_edge("report_generation", END)

        self.agent = workflow.compile()

    def _orchestrator_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Sanitizes URL and logs setup."""
        url = state["url"]
        if not re.match(r"^https?://", url, re.IGNORECASE):
            url = "http://" + url
        return {
            "url": url,
            "tool_trace": [
                {
                    "step": "info",
                    "message": f"Orchestrator initiated analysis for: {url}"
                }
            ]
        }

    def _web_scraping_agent_node(self, state: PhishLensState) -> Dict[str, Any]:
        """Captures viewport & full-page screenshots using Playwright."""
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
        """Runs binary visual classifier on screenshot path."""
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
        """Extracts page source elements, forms, links, scripts, and iframes."""
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
        """Runs lexical analysis and WHOIS queries on the URL."""
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
        """Feeds intermediate states to the LLM to generate the final safety report."""
        url = state["url"]
        url_features = state.get("url_features") or {}
        html_features = state.get("html_features") or {}
        visual_model_output = state.get("visual_model_output") or {}

        report_prompt = f"""You are PhishLens, an expert cybersecurity analyst specializing in phishing website detection.

We have analyzed the target URL: {url}

Here are the findings from our specialized analysis components:

1. Lexical & WHOIS URL Analysis:
{json.dumps(url_features, indent=2)}

2. HTML/DOM Structural Analysis:
{json.dumps(html_features, indent=2)}

3. Visual Screenshot Analysis (Visual ML Model Classifier):
{json.dumps(visual_model_output, indent=2)}

Based on these findings, synthesize your final analysis and output a structured phishing risk report. Factor in the visual ML model's prediction and probability score under the visual/screenshot analysis findings.

## Final Report Format

You MUST output your final answer as a JSON object with this exact structure:

```json
{{
  "risk_score": <integer 0-100>,
  "risk_level": "<SAFE | LOW | MEDIUM | HIGH | CRITICAL>",
  "findings": [
    {{
      "category": "<URL Analysis | HTML Structure | Visual Analysis | Screenshot Analysis>",
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

Be thorough, precise, and evidence-based in your analysis. Reference specific data from the component findings.
"""
        try:
            response = self.llm.invoke([
                HumanMessage(content=report_prompt)
            ])
            raw_content = response.content
            report = parse_report(raw_content)
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

    def run(self, url: str) -> Dict[str, Any]:
        """
        Analyse a URL for phishing indicators using the StateGraph pipeline.

        Returns a structured report dictionary matching the expected API interface.
        """
        start_time = time.time()

        print(f"\n{'='*60}")
        print(f"[PhishLens Orchestrator] Starting analysis of: {url}")
        print(f"{'='*60}\n")

        try:
            # Invoke custom StateGraph
            result = self.agent.invoke({
                "url": url,
                "tool_trace": []
            })

            report = result.get("report")
            raw_content = result.get("raw_llm_response") or ""
            screenshot_path = result.get("screenshot_path")
            
            # Build url_analysis_data structure for backward compatibility
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
            duration = time.time() - start_time

            return {
                "target_url": url,
                "overall_status": "COMPLETED",
                "total_duration_sec": round(duration, 2),
                "report": report,
                "screenshot_path": screenshot_path,
                "url_analysis_data": url_analysis_data,
                "tool_trace": tool_trace,
                "raw_llm_response": raw_content,
            }

        except Exception as e:
            duration = time.time() - start_time
            print(f"\n[PhishLens Orchestrator] ERROR: {e}")
            return {
                "target_url": url,
                "overall_status": "FAILED",
                "total_duration_sec": round(duration, 2),
                "error": str(e),
                "report": None,
                "tool_trace": [],
            }


# Instantiate the orchestrator agent and expose compiled graph for LangGraph Studio
orchestrator = OrchestratorAgent()
graph = orchestrator.agent


