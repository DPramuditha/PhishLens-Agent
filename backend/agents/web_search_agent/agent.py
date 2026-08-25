"""
PhishLens Agent — Web Search Threat Intelligence Agent.

Queries the Tavily Search API Platform to uncover live web reputation,
threat intelligence, security advisories, community warnings, and official
brand presence for the target URL.
"""

import json
import logging
import time
from typing import Any, Dict, Optional

from langchain_core.tools import tool

from backend.agents.base_agent import BaseAgent, AgentResult, AgentStatus
from backend.agents.web_search_agent.tavily_service import search_tavily, tavily_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# LangChain Tool Definition for Autonomous LLM Reasoning
# ---------------------------------------------------------------------------

@tool
def search_web_threat_intel(url: str) -> str:
    """
    Search the live web using the Tavily Search Platform for threat intelligence,
    phishing reports, scam databases, and brand verification about the target URL or domain.

    Use this tool to discover whether the target domain has been flagged by cybersecurity
    communities, reported as a scam or credential-harvesting campaign, or if it is a
    verified official corporate domain.

    Args:
        url: The target website URL to research (e.g., "https://example.com" or "example.com").

    Returns:
        JSON string containing threat indicators, legitimacy indicators, risk signal,
        sources, and synthesized OSINT summary.
    """
    try:
        result = search_tavily(url)
        return json.dumps(result)
    except Exception as e:
        logger.error(f"Error in search_web_threat_intel tool: {e}")
        return json.dumps({
            "status": "error",
            "url": url,
            "error": str(e),
            "threat_indicators": [],
            "legitimacy_indicators": [],
            "risk_signal": "NEUTRAL",
            "summary": f"Web threat intelligence query encountered an error: {str(e)}",
            "sources": []
        })


# ---------------------------------------------------------------------------
# BaseAgent Class Implementation
# ---------------------------------------------------------------------------

class WebSearchAgent(BaseAgent):
    """
    Asynchronous Web Search Threat Intelligence Agent.
    """

    def __init__(self, name: str = "WebSearchAgent"):
        super().__init__(name=name)

    async def run(self, url: str) -> AgentResult:
        """
        Execute OSINT web search and threat classification for the given URL.
        """
        start_time = time.time()
        try:
            data = search_tavily(url)
            duration = round(time.time() - start_time, 3)

            status = AgentStatus.COMPLETED
            if data.get("status") == "error":
                status = AgentStatus.FAILED

            return AgentResult(
                name=self.name,
                status=status,
                duration_sec=duration,
                error=data.get("error"),
                data=data
            )
        except Exception as e:
            duration = round(time.time() - start_time, 3)
            logger.error(f"WebSearchAgent error: {e}")
            return AgentResult(
                name=self.name,
                status=AgentStatus.FAILED,
                duration_sec=duration,
                error=str(e),
                data={"status": "error", "error": str(e)}
            )


def extract_web_intelligence(url: str) -> Dict[str, Any]:
    """Synchronous extraction helper."""
    return search_tavily(url)
