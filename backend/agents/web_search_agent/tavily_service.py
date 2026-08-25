"""
PhishLens Agent — Tavily Web Search & Threat Intelligence Service.

Integrates with the Tavily API Platform (https://app.tavily.com) to perform
live OSINT (Open-Source Intelligence) web research on target domains, URLs,
and brands to detect phishing campaigns, scam alerts, community reports,
and official website verifications.
"""

import logging
import os
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
import requests

logger = logging.getLogger(__name__)

# Threat keyword heuristics to scan snippets & titles
THREAT_KEYWORDS = [
    "phishing", "scam", "fraud", "fake site", "fake website", "malicious",
    "blacklist", "blacklisted", "impersonation", "spoof", "credential harvest",
    "stolen credentials", "suspicious", "reported as scam", "scam alert",
    "phish", "trojan", "malware", "deceptive", "complaint", "beware"
]

LEGIT_KEYWORDS = [
    "official site", "official website", "legitimate", "verified",
    "headquarters", "company profile", "wikipedia", "official portal",
    "customer support", "about us", "press release"
]


def _extract_domain(url: str) -> str:
    """Extract clean domain name from URL."""
    clean = url.strip()
    if not re.match(r"^https?://", clean, re.IGNORECASE):
        clean = "http://" + clean
    parsed = urlparse(clean)
    hostname = parsed.hostname or clean
    return hostname.lower()


class TavilySearchService:
    """
    Service client for querying the Tavily Search API.
    Supports both tavily-python SDK and direct REST API requests with graceful fallback.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = (
            api_key or
            os.getenv("TAVILY_API_KEY", "").strip() or
            os.getenv("TAVILY_KEY", "").strip()
        )
        self.client = None
        if self.api_key:
            try:
                from tavily import TavilyClient
                self.client = TavilyClient(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Could not initialize TavilyClient SDK ({e}), will use direct REST API.")

    def is_configured(self) -> bool:
        """Check if a non-empty API key is present."""
        return bool(self.api_key)

    def search_threat_intelligence(self, target_url: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Conduct live OSINT web search on the target URL / domain to discover
        known security reports, scam alerts, and community reputation.
        """
        domain = _extract_domain(target_url)
        if not domain:
            return {
                "status": "error",
                "domain": domain,
                "error": "Invalid URL or domain supplied.",
                "threat_indicators": [],
                "legitimacy_indicators": [],
                "risk_signal": "NEUTRAL",
                "sources": [],
                "summary": "Could not extract a valid domain to perform web search."
            }

        if not self.is_configured():
            logger.info(f"TAVILY_API_KEY not configured. Web search skipped for {domain}.")
            return {
                "status": "skipped",
                "domain": domain,
                "message": "TAVILY_API_KEY not configured in .env. Live OSINT search skipped.",
                "threat_indicators": [],
                "legitimacy_indicators": [],
                "risk_signal": "NEUTRAL",
                "sources": [],
                "summary": f"Web search intelligence skipped: Tavily API key is not configured in .env."
            }

        # Multi-angle search queries
        query_threat = f'"{domain}" phishing scam fraud malware threat abuse'
        query_general = f'"{domain}" site reputation official website review'

        raw_results = []
        tavily_answer = None

        try:
            # 1. Primary threat-focused search query
            data_threat = self._execute_tavily_search(
                query=query_threat,
                search_depth="advanced",
                include_answer=True,
                max_results=max_results
            )
            
            if data_threat:
                tavily_answer = data_threat.get("answer")
                raw_results.extend(data_threat.get("results", []))

            # 2. If few results, complement with general reputation query
            if len(raw_results) < 3:
                data_gen = self._execute_tavily_search(
                    query=query_general,
                    search_depth="basic",
                    include_answer=False,
                    max_results=3
                )
                if data_gen:
                    existing_urls = {r.get("url") for r in raw_results}
                    for r in data_gen.get("results", []):
                        if r.get("url") not in existing_urls:
                            raw_results.append(r)

            # Analyze findings across collected search snippets
            analysis = self._analyze_search_results(domain, raw_results, tavily_answer)
            return analysis

        except Exception as e:
            logger.error(f"Error querying Tavily API for {domain}: {e}")
            return {
                "status": "error",
                "domain": domain,
                "error": str(e),
                "threat_indicators": [],
                "legitimacy_indicators": [],
                "risk_signal": "NEUTRAL",
                "sources": [],
                "summary": f"Web search execution encountered an error: {str(e)}"
            }

    def _execute_tavily_search(
        self,
        query: str,
        search_depth: str = "basic",
        include_answer: bool = True,
        max_results: int = 5
    ) -> Optional[Dict[str, Any]]:
        """Execute search using SDK or direct HTTP request."""
        # Try SDK first
        if self.client:
            try:
                res = self.client.search(
                    query=query,
                    search_depth=search_depth,
                    include_answer=include_answer,
                    max_results=max_results,
                )
                return res
            except Exception as sdk_err:
                logger.warning(f"TavilyClient SDK query failed ({sdk_err}), falling back to direct HTTP POST.")

        # Fallback to direct HTTP endpoint
        endpoint = "https://api.tavily.com/search"
        payload = {
            "api_key": self.api_key,
            "query": query,
            "search_depth": search_depth,
            "include_answer": include_answer,
            "max_results": max_results,
        }
        resp = requests.post(endpoint, json=payload, timeout=12)
        if resp.status_code == 200:
            return resp.json()
        else:
            logger.warning(f"Tavily HTTP request failed with status {resp.status_code}: {resp.text}")
            return None

    def _analyze_search_results(
        self,
        domain: str,
        results: List[Dict[str, Any]],
        tavily_answer: Optional[str]
    ) -> Dict[str, Any]:
        """
        Extract threat & legitimacy indicators from Tavily search results.
        """
        threat_indicators = []
        legitimacy_indicators = []
        clean_sources = []
        
        threat_hits = 0
        legit_hits = 0

        for r in results:
            title = r.get("title", "")
            snippet = r.get("content", "") or r.get("snippet", "")
            source_url = r.get("url", "")
            score = r.get("score", 0.0)

            clean_sources.append({
                "title": title,
                "url": source_url,
                "snippet": snippet[:350] + ("..." if len(snippet) > 350 else ""),
                "relevance_score": score
            })

            combined_text = f"{title} {snippet}".lower()

            # Check for threat indicators
            matched_threats = [k for k in THREAT_KEYWORDS if k in combined_text]
            if matched_threats:
                threat_hits += len(matched_threats)
                threat_indicators.append({
                    "source_title": title,
                    "source_url": source_url,
                    "keywords_matched": matched_threats,
                    "excerpt": snippet[:200]
                })

            # Check for legitimacy indicators
            matched_legit = [k for k in LEGIT_KEYWORDS if k in combined_text]
            if matched_legit:
                legit_hits += len(matched_legit)
                legitimacy_indicators.append({
                    "source_title": title,
                    "source_url": source_url,
                    "keywords_matched": matched_legit,
                    "excerpt": snippet[:200]
                })

        # Determine overall risk signal
        if threat_hits >= 4:
            risk_signal = "CRITICAL"
        elif threat_hits >= 2:
            risk_signal = "HIGH"
        elif threat_hits == 1 and legit_hits == 0:
            risk_signal = "MEDIUM"
        elif legit_hits >= 2 and threat_hits == 0:
            risk_signal = "SAFE"
        elif legit_hits >= 1 and threat_hits == 0:
            risk_signal = "LOW"
        else:
            risk_signal = "NEUTRAL"

        # Generate summary
        if tavily_answer:
            summary = tavily_answer
        elif threat_indicators:
            summary = f"Web OSINT search found {len(threat_indicators)} security warning(s) referencing domain '{domain}'."
        elif legitimacy_indicators:
            summary = f"Web search indicates legitimate domain footprint with {len(legitimacy_indicators)} positive reference(s)."
        elif results:
            summary = f"Web search retrieved {len(results)} general search result(s) for domain '{domain}'."
        else:
            summary = f"No public web indexing or security reports found for domain '{domain}'."

        return {
            "status": "success",
            "domain": domain,
            "query_count": len(results),
            "threat_hits": threat_hits,
            "legit_hits": legit_hits,
            "threat_indicators": threat_indicators,
            "legitimacy_indicators": legitimacy_indicators,
            "risk_signal": risk_signal,
            "summary": summary,
            "sources": clean_sources
        }


# Global singleton service
tavily_service = TavilySearchService()


def search_tavily(url: str, max_results: int = 5) -> Dict[str, Any]:
    """Helper functional interface for performing Tavily threat research."""
    return tavily_service.search_threat_intelligence(url, max_results=max_results)
