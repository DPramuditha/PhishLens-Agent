"""
PhishLens Agent — Test Suite for Database Models (ChatSession, ChatMessage, AgentMemoryRecord, UserFeedback) and LangGraph Memory Architecture.
"""

import json
import uuid
import pytest
from django.contrib.auth.models import User

from backend.agents.models import ChatSession, ChatMessage, AgentMemoryRecord, UserFeedback
from backend.agents.memory import (
    ShortTermMemoryManager,
    LongTermMemoryManager,
    short_term_memory,
    long_term_memory,
    get_domain_threat_history,
    check_domain_whitelist,
    save_domain_threat_intel,
)


# ===========================================================================
# 1. Django Models Tests
# ===========================================================================

class TestDjangoModels:
    def test_chat_session_creation_and_properties(self, sample_user):
        """Test ChatSession creation, relationships, and last_message property."""
        session_id = uuid.uuid4()
        session = ChatSession.objects.create(
            id=session_id,
            user=sample_user,
            title="Scan: phishing-test.com",
            metadata={"source": "pytest"}
        )
        assert session.id == session_id
        assert session.user == sample_user
        assert str(session).startswith(f"ChatSession {session_id}")
        assert session.last_message is None

        # Add message
        msg1 = ChatMessage.objects.create(
            chat=session,
            sender="user",
            message_type="text",
            text="Scan this link please"
        )
        assert session.last_message.id == msg1.id

        msg2 = ChatMessage.objects.create(
            chat=session,
            sender="assistant",
            message_type="scan_result",
            text="High risk phishing detected"
        )
        # Refresh session to check newest last_message
        assert session.last_message.id == msg2.id

    def test_chat_session_cascade_delete(self, sample_chat_session, sample_chat_message):
        """Deleting a ChatSession must delete all associated ChatMessages."""
        chat_id = sample_chat_session.id
        msg_id = sample_chat_message.id

        assert ChatMessage.objects.filter(id=msg_id).exists()
        sample_chat_session.delete()
        assert not ChatMessage.objects.filter(id=msg_id).exists()

    def test_chat_message_fields_and_types(self, sample_chat_session, sample_png_b64, sample_scan_report):
        """Test comprehensive ChatMessage artifact fields, Base64 screenshot, and JSON reports."""
        msg = ChatMessage.objects.create(
            chat=sample_chat_session,
            sender="assistant",
            message_type="scan_result",
            text="Scan completed with findings",
            target_url="https://fake-boc-portal.lk/login",
            screenshot_data=sample_png_b64,
            annotated_screenshot_data=sample_png_b64,
            report=sample_scan_report,
            url_analysis_data={"domain_entropy": 3.84},
            tool_trace=[{"tool": "extract_html_features", "step": "tool_call"}],
            overall_status="COMPLETED",
            duration_sec=2.1,
        )
        assert msg.id is not None
        assert msg.sender == "assistant"
        assert msg.message_type == "scan_result"
        assert msg.report["risk_score"] == 88
        assert msg.screenshot_data.startswith("data:image/png;base64,")
        assert "ChatMessage" in str(msg)

    def test_agent_memory_record_uniqueness(self, sample_user):
        """AgentMemoryRecord unique_together on ('namespace', 'key')."""
        ns = f"test_ns_{uuid.uuid4().hex[:6]}"
        key = "domain_intel_test"

        rec1 = AgentMemoryRecord.objects.create(
            user=sample_user,
            namespace=ns,
            key=key,
            value={"risk_score": 90, "brand": "PayPal"}
        )
        assert rec1.id is not None
        assert rec1.value["brand"] == "PayPal"

        # Unique together enforcement
        with pytest.raises(Exception):
            AgentMemoryRecord.objects.create(
                user=sample_user,
                namespace=ns,
                key=key,
                value={"risk_score": 50}
            )

    def test_user_feedback_creation(self, sample_user, sample_chat_session, sample_chat_message):
        """Test UserFeedback creation and relations."""
        fb = UserFeedback.objects.create(
            user=sample_user,
            chat=sample_chat_session,
            message=sample_chat_message,
            target_url="https://boc-fake.lk",
            llm_response_summary={"risk_score": 88, "summary": "Phishing site"},
            feedback_type="hitl_approval",
            responses={
                "accuracy": {"question": "Accurate?", "selected": ["Yes"]}
            },
            rating=5
        )
        assert fb.id is not None
        assert fb.user == sample_user
        assert fb.rating == 5
        assert "Feedback from" in str(fb)


# ===========================================================================
# 2. Short-Term Memory Manager Tests
# ===========================================================================

class TestShortTermMemory:
    def test_short_term_memory_config(self):
        """get_thread_config returns proper LangGraph configuration."""
        thread_id = str(uuid.uuid4())
        cfg = short_term_memory.get_thread_config(thread_id)
        assert "configurable" in cfg
        assert cfg["configurable"]["thread_id"] == thread_id

    def test_short_term_memory_manager_initialization(self):
        """ShortTermMemoryManager initialises with a checkpointer."""
        mgr = ShortTermMemoryManager()
        assert mgr.checkpointer is not None


# ===========================================================================
# 3. Long-Term Memory Manager Tests
# ===========================================================================

class TestLongTermMemory:
    def test_record_and_get_domain_history(self):
        """Test recording domain scan summary and retrieving history."""
        mgr = LongTermMemoryManager()
        test_domain = f"phish-target-{uuid.uuid4().hex[:6]}.xyz"

        mgr.record_domain_scan(
            domain=test_domain,
            url=f"https://{test_domain}/login",
            risk_score=92,
            risk_level="CRITICAL",
            findings=[{"category": "Typosquatting", "detail": "Fake domain"}],
            brand="Bank of Ceylon",
        )

        history = mgr.get_domain_history(test_domain)
        assert history is not None
        assert history["domain"] == test_domain
        assert history["latest_risk_score"] == 92
        assert history["latest_risk_level"] == "CRITICAL"
        assert history["suspected_brand"] == "Bank of Ceylon"
        assert history["scan_count"] >= 1

    def test_user_preferences_store(self, sample_user):
        """Test storing and retrieving user-specific alert preferences."""
        mgr = LongTermMemoryManager()
        user_id_str = str(sample_user.id)

        mgr.set_user_preference(user_id_str, "alert_sensitivity", "strict")
        mgr.set_user_preference(user_id_str, "technical_depth", "developer")

        prefs = mgr.get_user_preferences(user_id_str)
        assert prefs is not None
        assert prefs.get("alert_sensitivity") == "strict"
        assert prefs.get("technical_depth") == "developer"

    def test_is_whitelisted_global_and_custom(self):
        """Test whitelisting logic for authentic domains."""
        mgr = LongTermMemoryManager()
        assert mgr.is_whitelisted("boc.lk") is True
        assert mgr.is_whitelisted("google.com") is True
        assert mgr.is_whitelisted("unknown-malicious-domain.xyz") is False


# ===========================================================================
# 4. LangChain Memory Tools Tests
# ===========================================================================

class TestLangChainMemoryTools:
    def test_save_and_get_domain_threat_history_tool(self):
        """Test saving threat intel via tool and querying it."""
        unique_domain = f"spoof-domain-{uuid.uuid4().hex[:6]}.com"

        # 1. Record in long_term_memory
        long_term_memory.record_domain_scan(
            domain=unique_domain,
            url=f"https://{unique_domain}/login",
            risk_score=85,
            risk_level="HIGH",
            findings=[{"category": "Credential Harvesting", "detail": "Form detected"}],
            brand="Sampath Vishwa"
        )

        # 2. Query intel via tool
        query_res_str = get_domain_threat_history.invoke({"domain": unique_domain})
        query_data = json.loads(query_res_str)
        assert query_data["status"] == "found"
        assert query_data["latest_risk_score"] == 85
        assert query_data["suspected_brand"] == "Sampath Vishwa"

        # 3. Save threat intel notes via tool
        save_res = save_domain_threat_intel.invoke({
            "domain": unique_domain,
            "notes": "Targeted campaign impersonating Sampath Vishwa login portal."
        })
        assert "Successfully saved" in save_res

    def test_check_domain_whitelist_tool(self):
        """Test domain whitelist checking tool."""
        res_str = check_domain_whitelist.invoke({"domain": "google.com"})
        res_data = json.loads(res_str)
        assert "domain" in res_data
        assert "is_whitelisted" in res_data

    def test_get_domain_threat_history_not_found(self):
        """Querying unseen domain returns status: not_found."""
        unseen = f"never-seen-{uuid.uuid4().hex[:8]}.com"
        res_str = get_domain_threat_history.invoke({"domain": unseen})
        res_data = json.loads(res_str)
        assert res_data["status"] == "not_found"
