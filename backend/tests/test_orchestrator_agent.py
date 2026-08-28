"""
PhishLens Agent — Test Suite for ReAct Multi-Agent Orchestrator, State Reducer, Report Parser, and Trace Extraction.
"""

import json
import uuid
from unittest.mock import patch, MagicMock
from langchain_core.messages import AIMessage, ToolMessage, HumanMessage
import pytest

from backend.agents.orchestrator import (
    OrchestratorAgent,
    append_trace,
    PhishLensState,
)
from backend.agents.report_generator import (
    parse_report,
    extract_tool_trace,
    SYSTEM_PROMPT,
)


# ===========================================================================
# 1. State Reducer & Report Parsing Tests
# ===========================================================================

class TestReportParserAndReducer:
    def test_append_trace_reducer(self):
        """append_trace concatenates trace events safely."""
        left = [{"step": "call_1"}]
        right = [{"step": "call_2"}]

        assert append_trace(left, right) == [{"step": "call_1"}, {"step": "call_2"}]
        assert append_trace(None, right) == [{"step": "call_2"}]
        assert append_trace(left, None) == [{"step": "call_1"}]
        assert append_trace([], []) == []

    def test_parse_report_markdown_json_block(self):
        """parse_report extracts JSON inside markdown triple backticks."""
        raw_llm_markdown = """
        Here is the final cybersecurity threat analysis for the target URL:

        ```json
        {
          "risk_score": 92,
          "risk_level": "CRITICAL",
          "findings": [
            {
              "category": "Typosquatting",
              "detail": "boc-ebanking-portal.xyz mimics Bank of Ceylon",
              "severity": "critical"
            }
          ],
          "brand_impersonation": {
            "detected": true,
            "brand": "Bank of Ceylon",
            "confidence": 0.94
          },
          "safety_advice": "Do not enter passwords.",
          "summary": "Confirmed phishing scam website."
        }
        ```
        """
        parsed = parse_report(raw_llm_markdown)
        assert isinstance(parsed, dict)
        assert parsed["risk_score"] == 92
        assert parsed["risk_level"] == "CRITICAL"
        assert parsed["brand_impersonation"]["brand"] == "Bank of Ceylon"

    def test_parse_report_raw_json(self):
        """parse_report handles plain JSON string without markdown fences."""
        raw_json = json.dumps({
            "risk_score": 15,
            "risk_level": "SAFE",
            "summary": "Official legitimate domain."
        })
        parsed = parse_report(raw_json)
        assert parsed["risk_score"] == 15
        assert parsed["risk_level"] == "SAFE"

    def test_parse_report_invalid_text_fallback(self):
        """parse_report returns parse_error fallback dict when LLM output is non-JSON."""
        raw_text = "I cannot determine if this is phishing because the page did not load."
        parsed = parse_report(raw_text)
        assert "parse_error" in parsed
        assert parsed["raw_response"] == raw_text

    def test_parse_report_empty(self):
        """parse_report returns None on empty input."""
        assert parse_report("") is None
        assert parse_report(None) is None

    def test_extract_tool_trace(self):
        """extract_tool_trace extracts tool calls and results from message sequence."""
        messages = [
            HumanMessage(content="Analyze https://example.com"),
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "analyze_url_features", "args": {"url": "https://example.com"}, "id": "call_1"},
                    {"name": "extract_html_features", "args": {"url": "https://example.com"}, "id": "call_2"},
                ]
            ),
            ToolMessage(content='{"status": "success", "entropy": 3.4}', tool_call_id="call_1", name="analyze_url_features"),
            ToolMessage(content='{"status": "success", "forms": 1}', tool_call_id="call_2", name="extract_html_features"),
        ]

        trace = extract_tool_trace(messages)
        assert len(trace) == 4
        assert trace[0]["step"] == "tool_call"
        assert trace[0]["tool"] == "analyze_url_features"
        assert trace[1]["step"] == "tool_call"
        assert trace[2]["step"] == "tool_result"
        assert "status" in trace[2]["content_preview"]


# ===========================================================================
# 2. Orchestrator ReAct Graph Execution Tests
# ===========================================================================

class TestOrchestratorAgent:
    def test_orchestrator_initialization(self):
        """OrchestratorAgent compiles state graph and initializes components."""
        orchestrator = OrchestratorAgent()
        assert orchestrator.agent is not None
        assert hasattr(orchestrator, "llm")

    def test_orchestrator_run_mocked(self, sample_user, sample_scan_report):
        """Test complete orchestrator run execution with mocked tools and LLM."""
        orchestrator = OrchestratorAgent()
        chat_id = str(uuid.uuid4())

        mock_final_state = {
            "url": "https://boc-fake.xyz",
            "chat_id": chat_id,
            "domain": "boc-fake.xyz",
            "domain_intel": {"scan_count": 1},
            "screenshot_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "screenshot_path": None,
            "annotated_screenshot_data": None,
            "annotated_screenshot_path": None,
            "page_title": "BOC Online Banking",
            "final_url": "https://boc-fake.xyz/login",
            "visual_model_output": {"prediction": "phishing", "probability": 0.92},
            "html_features": {"forms": {"count": 1}},
            "url_features": {"lexical_features": {"entropy": 3.8}},
            "web_search_results": {"risk_signal": "HIGH_RISK"},
            "report": sample_scan_report,
            "raw_llm_response": json.dumps(sample_scan_report),
            "tool_trace": [
                {"step": "tool_call", "tool": "analyze_url_features", "args": {}},
                {"step": "tool_result", "tool": "analyze_url_features", "content_preview": "success"}
            ],
            "error": None,
        }

        with patch.object(orchestrator.agent, "invoke", return_value=mock_final_state):
            result = orchestrator.run(
                url="https://boc-fake.xyz",
                chat_id=chat_id,
                user=sample_user
            )

            assert isinstance(result, dict)
            assert result["target_url"] == "https://boc-fake.xyz"
            assert result["chat_id"] == chat_id
            assert result["overall_status"] == "COMPLETED"
            assert result["report"]["risk_score"] == 88
            assert len(result["tool_trace"]) == 2

    def test_run_followup_chat_mocked(self, sample_user):
        """Test conversational follow-up agent within existing chat thread."""
        orchestrator = OrchestratorAgent()
        chat_id = str(uuid.uuid4())

        mock_ai_message = AIMessage(content="The website was flagged because it uses an unauthorized domain with a credential phishing form.")

        with patch.object(type(orchestrator.llm), "invoke", return_value=mock_ai_message):
            res = orchestrator.run_followup_chat(
                chat_id=chat_id,
                user_message="Why did you flag this website as phishing?",
                user=sample_user
            )

            assert isinstance(res, dict)
            assert res["chat_id"] == chat_id
            assert res["status"] == "success"
            assert "unauthorized domain" in res["reply"]
