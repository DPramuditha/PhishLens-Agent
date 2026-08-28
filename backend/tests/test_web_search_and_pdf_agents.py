"""
PhishLens Agent — Test Suite for Web Search Threat Intelligence Agent (Tavily) and Vector PDF Report Generation Agent.
"""

import json
from unittest.mock import patch, MagicMock
import pytest

from backend.agents.web_search_agent.tavily_service import (
    TavilySearchService,
    _extract_domain,
    THREAT_KEYWORDS,
    LEGIT_KEYWORDS,
)
from backend.agents.web_search_agent.agent import search_web_threat_intel, WebSearchAgent
from backend.agents.pdf_report_agent.agent import PDFReportAgent, NumberedCanvas


# ===========================================================================
# 1. Tavily Search & Web Threat Intel Tests
# ===========================================================================

class TestWebSearchAgent:
    def test_extract_domain(self):
        """_extract_domain extracts hostname from various URL structures."""
        assert _extract_domain("https://boc-login.xyz/auth") == "boc-login.xyz"
        assert _extract_domain("http://sub.domain.lk/path?q=1") == "sub.domain.lk"
        assert _extract_domain("example.com") == "example.com"

    def test_tavily_service_not_configured(self):
        """When api key is missing from env and init, search_threat_intelligence skips gracefully."""
        with patch.dict("os.environ", {"TAVILY_API_KEY": "", "TAVILY_KEY": ""}):
            service = TavilySearchService(api_key="")
            assert service.is_configured() is False
            res = service.search_threat_intelligence("https://test.com")
            assert res["status"] == "skipped"
            assert res["risk_signal"] == "NEUTRAL"

    def test_tavily_service_with_mocked_results(self):
        """Mock Tavily API response containing threat indicators."""
        service = TavilySearchService(api_key="tvly-mock-key")
        mock_raw_results = {
            "results": [
                {
                    "title": "Warning: Fake BOC Banking Scam Alert",
                    "url": "https://cybercrime.gov/advisory/101",
                    "content": "A high-risk phishing website imitating Bank of Ceylon was detected on boc-fake-portal.xyz stealing customer credentials.",
                    "score": 0.95
                },
                {
                    "title": "Phishing Incident Report",
                    "url": "https://threatintel.net/boc-fake",
                    "content": "Malicious site flagged on blacklists for deceptive credential harvest.",
                    "score": 0.89
                }
            ]
        }

        with patch.object(service, "_execute_tavily_search", return_value=mock_raw_results):
            res = service.search_threat_intelligence("https://boc-fake-portal.xyz")
            assert res["status"] == "success"
            assert res["risk_signal"] in ["SUSPICIOUS", "HIGH_RISK", "CRITICAL"]
            assert len(res["threat_indicators"]) > 0
            assert len(res["sources"]) == 2

    def test_search_web_threat_intel_tool(self):
        """LangChain tool search_web_threat_intel returns valid JSON string."""
        with patch("backend.agents.web_search_agent.agent.search_tavily") as mock_search:
            mock_search.return_value = {
                "status": "success",
                "risk_signal": "HIGH_RISK",
                "threat_indicators": ["Flagged in abuse database"],
                "sources": [{"title": "Threat Alert", "url": "https://threat.io"}],
                "summary": "Multiple scam complaints found."
            }

            tool_resp_str = search_web_threat_intel.invoke({"url": "https://bad-site.xyz"})
            tool_data = json.loads(tool_resp_str)
            assert tool_data["status"] == "success"
            assert tool_data["risk_signal"] == "HIGH_RISK"


# ===========================================================================
# 2. PDF Threat Report Generation Agent Tests
# ===========================================================================

class TestPDFReportAgent:
    def test_pdf_report_generation_from_scan_data(self, sample_scan_report, sample_png_b64):
        """PDFReportAgent generates a valid vector PDF document with header bytes."""
        agent = PDFReportAgent()
        url_analysis = {
            "hostname": "boc-ebank-login.xyz",
            "domain_age_days": 4,
            "ssl_certificate": {"is_trusted": False, "issuer": "Self-Signed"},
            "server_location": {"country": "Seychelles", "ip_address": "185.220.101.5"},
        }

        pdf_bytes = agent.generate_pdf(
            url="https://boc-ebank-login.xyz/login",
            report=sample_scan_report,
            screenshot_data=sample_png_b64,
            url_analysis_data=url_analysis,
            duration=2.45
        )

        assert isinstance(pdf_bytes, (bytes, bytearray))
        assert len(pdf_bytes) > 1000, "Generated PDF must contain binary document bytes"
        # Standard PDF document magic header
        assert pdf_bytes.startswith(b"%PDF-"), "Output must be a valid PDF file"

    def test_pdf_generation_minimal_data(self):
        """PDFReportAgent generates report even with minimal / fallback data."""
        agent = PDFReportAgent()
        minimal_report = {
            "risk_score": 10,
            "risk_level": "SAFE",
            "summary": "Legitimate verified site."
        }

        pdf_bytes = agent.generate_pdf(
            url="https://google.com",
            report=minimal_report,
            screenshot_data=None,
            url_analysis_data=None,
            duration=1.1
        )

        assert isinstance(pdf_bytes, (bytes, bytearray))
        assert pdf_bytes.startswith(b"%PDF-")
