"""
PhishLens Agent — LangGraph ReAct Orchestrator.

Uses `create_react_agent` from langgraph-prebuilt to build a
Reason → Act → Observe → repeat loop. The LLM decides which tool to
call next and synthesises a final phishing risk report.
"""

import os
import time
from typing import Any, Dict

import nest_asyncio
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent

from .tools import (
    capture_screenshot,
    run_visual_ml_model,
)
from .html_dom_agent import extract_html_features
from .url_feature_agent import analyze_url_features
from .report_generator import (
    SYSTEM_PROMPT,
    parse_report,
    extract_tool_trace,
)

# Allow nested event loops (needed inside Django / Jupyter)
nest_asyncio.apply()

# Load environment variables from backend/.env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


class OrchestratorAgent:
    """
    ReAct orchestrator that coordinates all sub-agent tools via LangGraph.
    """

    def __init__(self):
        # LLM
        self.llm = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5.4-mini"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
            temperature=0,
        )

        # Tools
        self.tools = [
            capture_screenshot,
            extract_html_features,
            analyze_url_features,
            run_visual_ml_model,
        ]

        # Create the ReAct agent
        self.agent = create_react_agent(
            model=self.llm,
            tools=self.tools,
            prompt=SYSTEM_PROMPT,
        )

    def run(self, url: str) -> Dict[str, Any]:
        """
        Analyse a URL for phishing indicators using the full ReAct pipeline.

        Returns a structured report dictionary.
        """
        start_time = time.time()

        print(f"\n{'='*60}")
        print(f"[PhishLens Orchestrator] Starting analysis of: {url}")
        print(f"{'='*60}\n")

        # Invoke the ReAct agent
        try:
            result = self.agent.invoke({
                "messages": [
                    HumanMessage(
                        content=f"Analyse this URL for phishing: {url}"
                    )
                ]
            })

            # Extract the final AI message
            messages = result.get("messages", [])
            final_message = messages[-1] if messages else None

            if final_message:
                raw_content = final_message.content
                print(f"\n[PhishLens Orchestrator] LLM Final Response received.")
            else:
                raw_content = ""
                print(f"\n[PhishLens Orchestrator] No final message from LLM.")

            # Parse the JSON report from the LLM response
            report = parse_report(raw_content)

            # Log tool call trace
            tool_trace = extract_tool_trace(messages)

            duration = time.time() - start_time

            return {
                "target_url": url,
                "overall_status": "COMPLETED",
                "total_duration_sec": round(duration, 2),
                "report": report,
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
