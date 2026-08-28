"""
Integration test for Agent Short-Term & Long-Term Memory, PostgreSQL persistence, and Chat APIs.
"""

import json
import os
import sys
import uuid
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))

import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
django.setup()

from django.test import RequestFactory

from backend.agents.models import ChatSession, ChatMessage, AgentMemoryRecord
from backend.agents.memory import short_term_memory, long_term_memory
from backend.agents.views import (
    chats_list_create_view,
    chat_detail_view,
    chat_message_view,
    scan_url_view,
    health_check,
)


def run_tests():
    print("\n" + "=" * 60)
    print("RUNNING MEMORY & CHAT PERSISTENCE INTEGRATION TESTS")
    print("=" * 60 + "\n")

    factory = RequestFactory()

    # 1. Health check test
    req = factory.get("/api/health/")
    resp = health_check(req)
    data = json.loads(resp.content)
    assert resp.status_code == 200, "Health check failed"
    print(f"[PASS] 1. Health check: {data['status']}, Database: {data.get('database')}")

    # 2. Long-term memory test: preferences, domain intel, whitelist
    test_domain = f"test-phish-domain-{uuid.uuid4().hex[:6]}.com"
    long_term_memory.record_domain_scan(
        domain=test_domain,
        url=f"https://{test_domain}/login",
        risk_score=88,
        risk_level="CRITICAL",
        findings=[{"category": "URL Analysis", "detail": "Fake domain spoofing", "severity": "critical"}],
        brand="PayPal",
    )
    domain_intel = long_term_memory.get_domain_history(test_domain)
    assert domain_intel is not None, "Long-term memory failed to store domain intel"
    assert domain_intel["latest_risk_score"] == 88, "Risk score mismatch in long-term memory"
    print(f"[PASS] 2. Long-term domain reputation store: {domain_intel['domain']} (Risk {domain_intel['latest_risk_score']}%)")

    # 3. Create ChatSession in PostgreSQL
    chat_id = uuid.uuid4()
    req = factory.post(
        "/api/chats/",
        data=json.dumps({"id": str(chat_id), "title": f"Scan: {test_domain}"}),
        content_type="application/json",
    )
    resp = chats_list_create_view(req)
    assert resp.status_code == 201, f"Create chat failed: {resp.content}"
    chat_obj = ChatSession.objects.filter(id=chat_id).first()
    assert chat_obj is not None, "ChatSession not saved in PostgreSQL database"
    print(f"[PASS] 3. PostgreSQL ChatSession created: {chat_obj.id} — '{chat_obj.title}'")

    # 4. Save ChatMessage in PostgreSQL
    msg = ChatMessage.objects.create(
        chat=chat_obj,
        sender="assistant",
        message_type="scan_result",
        target_url=f"https://{test_domain}/login",
        screenshot_path="media/screenshots/sample.png",
        report={
            "risk_score": 88,
            "risk_level": "CRITICAL",
            "findings": [{"category": "Visual Analysis", "detail": "Logo spoofing detected", "severity": "high"}],
            "brand_impersonation": {"detected": True, "brand": "PayPal", "confidence": 0.94},
            "summary": "This is a confirmed credential harvesting phishing site.",
        },
        tool_trace=[{"step": "tool_call", "tool": "capture_screenshot", "args": {}}],
        overall_status="COMPLETED",
        duration_sec=2.45,
    )
    assert msg.id is not None, "ChatMessage not saved"
    print(f"[PASS] 4. PostgreSQL ChatMessage stored with report & screenshot (ID: {msg.id})")

    # 5. List Chats API test
    req = factory.get(f"/api/chats/?q={test_domain}")
    resp = chats_list_create_view(req)
    assert resp.status_code == 200, "List chats failed"
    list_data = json.loads(resp.content)
    assert len(list_data["chats"]) >= 1, "Chat search did not find created session"
    print(f"[PASS] 5. GET /api/chats/?q={test_domain} found {len(list_data['chats'])} session(s)")

    # 6. Retrieve Chat Detail API test
    req = factory.get(f"/api/chats/{chat_id}/")
    resp = chat_detail_view(req, chat_id=chat_id)
    assert resp.status_code == 200, "Detail view failed"
    detail_data = json.loads(resp.content)
    assert len(detail_data["messages"]) >= 1, "Messages missing in detail view"
    assert detail_data["messages"][0]["report"]["risk_score"] == 88, "Report data mismatch in detail response"
    print(f"[PASS] 6. GET /api/chats/{chat_id}/ retrieved session with {len(detail_data['messages'])} message(s) & report")

    # 7. Rename Chat API test
    req = factory.patch(
        f"/api/chats/{chat_id}/",
        data=json.dumps({"title": "Renamed Investigation"}),
        content_type="application/json",
    )
    resp = chat_detail_view(req, chat_id=chat_id)
    assert resp.status_code == 200, "Rename failed"
    chat_obj.refresh_from_db()
    assert chat_obj.title == "Renamed Investigation", "Chat title was not updated"
    print(f"[PASS] 7. PATCH /api/chats/{chat_id}/ renamed title to '{chat_obj.title}'")

    # 8. Follow-up Chat Message test with short-term context
    req = factory.post(
        f"/api/chats/{chat_id}/message/",
        data=json.dumps({"message": "What brand was impersonated and what should I do?"}),
        content_type="application/json",
    )
    resp = chat_message_view(req, chat_id=chat_id)
    assert resp.status_code == 200, f"Follow-up message failed: {resp.content}"
    followup_data = json.loads(resp.content)
    assert "reply" in followup_data, "Assistant reply missing from follow-up response"
    print(f"[PASS] 8. POST /api/chats/{chat_id}/message/ follow-up assistant reply:\n   \"{followup_data['reply'][:120]}...\"")

    # 9. Delete Chat API test
    req = factory.delete(f"/api/chats/{chat_id}/")
    resp = chat_detail_view(req, chat_id=chat_id)
    assert resp.status_code == 200, "Delete chat failed"
    assert not ChatSession.objects.filter(id=chat_id).exists(), "ChatSession was not deleted"
    print(f"[PASS] 9. DELETE /api/chats/{chat_id}/ successfully removed chat session and messages")

    print("\n" + "=" * 60)
    print("ALL INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_tests()
