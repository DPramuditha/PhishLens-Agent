"""
PhishLens Agent — Unit tests for OAuth verification utilities, LangChain tools,
system prompts, report parsers, and abstract base agent data structures.
"""

import json
from unittest.mock import MagicMock, patch
import pytest
from django.contrib.auth.models import User

from backend.core.security.oauth import (
    verify_google_id_token,
    verify_google_access_token,
    get_or_create_google_user,
)
from backend.agents.tools import (
    _extract_domain,
    capture_screenshot,
    run_visual_ml_model,
)
from backend.agents.report_generator import (
    SYSTEM_PROMPT,
    parse_report,
)
from backend.agents.base_agent import (
    AgentStatus,
    AgentResult,
    BaseAgent,
)


@pytest.mark.django_db
class TestGoogleOAuthUtilities:
    """Test suite for server-side Google OAuth token verification and user syncing."""

    def test_verify_google_id_token_empty_input(self):
        assert verify_google_id_token("") is None
        assert verify_google_id_token(None) is None

    @patch("backend.core.security.oauth.GOOGLE_AUTH_AVAILABLE", True)
    @patch("google.oauth2.id_token.verify_oauth2_token")
    def test_verify_google_id_token_with_valid_claims(self, mock_verify):
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "email": "analyst@phishlens.lk",
            "name": "Lead Threat Analyst",
            "sub": "google-100200300",
        }
        claims = verify_google_id_token("fake-valid-id-token")
        assert claims is not None
        assert claims["email"] == "analyst@phishlens.lk"
        assert claims["name"] == "Lead Threat Analyst"

    @patch("backend.core.security.oauth.GOOGLE_AUTH_AVAILABLE", False)
    @patch("requests.get")
    def test_verify_google_id_token_tokeninfo_fallback_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "iss": "accounts.google.com",
            "email": "cert-officer@domain.gov.lk",
            "name": "CERT Officer",
        }
        mock_get.return_value = mock_resp

        claims = verify_google_id_token("valid-tokeninfo-id-token")
        assert claims is not None
        assert claims["email"] == "cert-officer@domain.gov.lk"

    @patch("backend.core.security.oauth.GOOGLE_AUTH_AVAILABLE", False)
    @patch("requests.get")
    def test_verify_google_id_token_tokeninfo_fallback_network_error(self, mock_get):
        mock_get.side_effect = Exception("Connection timeout")
        claims = verify_google_id_token("network-fail-token")
        assert claims is None

    @patch("requests.get")
    def test_verify_google_access_token_success(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "email": "user@gmail.com",
            "given_name": "Dimuthu",
            "family_name": "Pramuditha",
        }
        mock_get.return_value = mock_resp

        claims = verify_google_access_token("valid-access-token-xyz")
        assert claims is not None
        assert claims["email"] == "user@gmail.com"

    def test_verify_google_access_token_empty_and_error(self):
        assert verify_google_access_token("") is None
        with patch("requests.get", side_effect=Exception("API unreachable")):
            assert verify_google_access_token("some-token") is None

    def test_get_or_create_google_user_new_user(self):
        claims = {
            "email": "new.analyst@phishlens.ai",
            "name": "Alice Cyber",
            "given_name": "Alice",
            "family_name": "Cyber",
        }
        user = get_or_create_google_user(claims)
        assert user is not None
        assert user.email == "new.analyst@phishlens.ai"
        assert user.first_name == "Alice"
        assert user.last_name == "Cyber"
        assert user.has_usable_password() is False

    def test_get_or_create_google_user_existing_user_sync_name(self):
        import uuid
        test_email = f"sync_{uuid.uuid4().hex[:8]}@phishlens.ai"
        User.objects.create_user(
            username=test_email,
            email=test_email,
            first_name="OldFirst",
            last_name="OldLast",
        )

        claims = {
            "email": test_email,
            "name": "NewFirst NewLast",
            "given_name": "NewFirst",
            "family_name": "NewLast",
        }
        user = get_or_create_google_user(claims)
        assert user is not None
        assert user.first_name == "NewFirst"
        assert user.last_name == "NewLast"

    def test_get_or_create_google_user_empty_email(self):
        assert get_or_create_google_user({}) is None
        assert get_or_create_google_user({"email": "   "}) is None


class TestLangChainTools:
    """Test suite for LangChain @tool wrappers in agents/tools.py."""

    def test_extract_domain_helper(self):
        assert _extract_domain("https://boc.lk/ebanking") == "boc.lk"
        assert _extract_domain("http://192.168.1.1:8080/portal") == "192.168.1.1"
        assert _extract_domain("https://sub.portal.bank.lk/login") == "sub.portal.bank.lk"

    @patch("playwright.async_api.async_playwright")
    def test_capture_screenshot_tool_mocked(self, mock_playwright):
        from unittest.mock import AsyncMock

        # Mock Playwright execution
        mock_p_ctx = MagicMock()
        mock_playwright.return_value.__aenter__.return_value = mock_p_ctx
        mock_browser = AsyncMock()
        mock_p_ctx.chromium.launch = AsyncMock(return_value=mock_browser)
        mock_context = AsyncMock()
        mock_browser.new_context = AsyncMock(return_value=mock_context)
        mock_page = AsyncMock()
        mock_context.new_page = AsyncMock(return_value=mock_page)

        mock_page.title = AsyncMock(return_value="Test Security Portal")
        mock_page.url = "https://phishlens.ai"
        mock_page.screenshot = AsyncMock(return_value=b"fake_png_image_binary_data_at_least_500_bytes_" + b"0" * 500)

        output = capture_screenshot.invoke("https://phishlens.ai")
        assert isinstance(output, str)
        parsed = json.loads(output)
        assert parsed["status"] == "success"
        assert "data:image/png;base64," in parsed["screenshot_data"]
        assert parsed["has_valid_screenshot"] is True

    def test_run_visual_ml_model_empty_input(self):
        res = run_visual_ml_model.invoke({"screenshot_data": "", "screenshot_path": ""})
        parsed = json.loads(res)
        assert parsed["status"] == "error"
        assert "No screenshot input" in parsed["error"]

    @patch("backend.agents.visual_model.predict_screenshot")
    def test_run_visual_ml_model_mocked_prediction(self, mock_predict):
        mock_predict.return_value = {
            "prediction": "phishing",
            "probability": 0.96,
            "brand_impersonation": {
                "detected": True,
                "brand": "Bank of Ceylon",
                "confidence": 0.94,
            },
        }
        res = run_visual_ml_model.invoke({"screenshot_data": "data:image/png;base64,fakeimage"})
        parsed = json.loads(res)
        assert parsed["prediction"] == "phishing"
        assert parsed["probability"] == 0.96
        assert parsed["brand_impersonation"]["brand"] == "Bank of Ceylon"


class TestReportGenerator:
    """Test suite for LLM system prompt definition and report parsing logic."""

    def test_system_prompt_structure_and_keys(self):
        assert "PhishLens" in SYSTEM_PROMPT
        assert "risk_score" in SYSTEM_PROMPT
        assert "risk_level" in SYSTEM_PROMPT
        assert "brand_impersonation" in SYSTEM_PROMPT
        assert "Bank of Ceylon" in SYSTEM_PROMPT

    def test_parse_report_markdown_json_fences(self):
        markdown_text = (
            "Here is the finalized phishing analysis for the requested target:\n\n"
            "```json\n"
            "{\n"
            '  "risk_score": 92,\n'
            '  "risk_level": "CRITICAL",\n'
            '  "brand_impersonation": {\n'
            '    "detected": true,\n'
            '    "brand": "Bank of Ceylon"\n'
            "  },\n"
            '  "summary": "Deceptive portal impersonating Bank of Ceylon credentials."\n'
            "}\n"
            "```\n\n"
            "Analysis complete."
        )
        report = parse_report(markdown_text)
        assert report is not None
        assert report["risk_score"] == 92
        assert report["risk_level"] == "CRITICAL"
        assert report["brand_impersonation"]["brand"] == "Bank of Ceylon"

    def test_parse_report_raw_json_string(self):
        raw_json = json.dumps({
            "risk_score": 10,
            "risk_level": "SAFE",
            "summary": "Official domain.",
        })
        report = parse_report(raw_json)
        assert report is not None
        assert report["risk_score"] == 10
        assert report["risk_level"] == "SAFE"

    def test_parse_report_invalid_syntax_and_empty(self):
        assert parse_report("") is None
        assert parse_report(None) is None

        broken_json = "```json\n{ risk_score: invalid_json_without_quotes \n```"
        fallback = parse_report(broken_json)
        assert fallback is not None
        assert bool(fallback.get("parse_error")) is True


class TestBaseAgentDataStructures:
    """Test suite for AgentStatus, AgentResult, and BaseAgent abstract contract."""

    def test_agent_status_enums(self):
        assert AgentStatus.NOT_STARTED.value == "NOT_STARTED"
        assert AgentStatus.RUNNING.value == "RUNNING"
        assert AgentStatus.COMPLETED.value == "COMPLETED"
        assert AgentStatus.FAILED.value == "FAILED"

    def test_agent_result_dataclass(self):
        res = AgentResult(
            name="UrlFeatureAgent",
            status=AgentStatus.COMPLETED,
            duration_sec=0.125,
            data={"entropy": 4.5},
        )
        assert res.name == "UrlFeatureAgent"
        assert res.status == AgentStatus.COMPLETED
        assert res.duration_sec == 0.125
        assert res.error is None
        assert res.data["entropy"] == 4.5

    def test_base_agent_abstract_instantiation(self):
        # BaseAgent cannot be instantiated without implementing run()
        with pytest.raises(TypeError):
            BaseAgent(name="TestAgent")

        # Concrete implementation should instantiate
        class ConcreteAgent(BaseAgent):
            async def run(self, url: str) -> AgentResult:
                return AgentResult(
                    name=self.name,
                    status=AgentStatus.COMPLETED,
                    duration_sec=0.01,
                )

        agent = ConcreteAgent(name="ConcreteWorker")
        assert agent.name == "ConcreteWorker"
