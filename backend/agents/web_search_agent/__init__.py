"""
PhishLens Agent — Web Search Threat Intelligence Agent Module.
"""

from backend.agents.web_search_agent.tavily_service import (
    TavilySearchService,
    tavily_service,
    search_tavily,
)
from backend.agents.web_search_agent.agent import (
    WebSearchAgent,
    search_web_threat_intel,
    extract_web_intelligence,
)

__all__ = [
    "TavilySearchService",
    "tavily_service",
    "search_tavily",
    "WebSearchAgent",
    "search_web_threat_intel",
    "extract_web_intelligence",
]
