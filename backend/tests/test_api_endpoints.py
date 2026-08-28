"""
PhishLens Agent — Test Suite for Core API Endpoints (Scans, Chat CRUD, Follow-ups, Screenshots, Scan Logs, PDF Exports).
"""

import json
import uuid
from unittest.mock import patch
from django.test import RequestFactory
import pytest

from backend.agents.models import ChatSession, ChatMessage
from backend.agents.views import (
    health_check,
    scan_url_view,
    chats_list_create_view,
    chat_detail_view,
    chat_message_view,
    chat_memory_view,
    user_screenshots_view,
    scan_logs_view,
    user_pdf_reports_view,
    export_pdf_view,
    export_chat_pdf_view,
)


# ===========================================================================
# 1. Health & Status Endpoints
# ===========================================================================

class TestHealthCheck:
    def test_health_check_endpoint(self, request_factory):
        """GET /api/health/ returns 200 OK with operational status."""
        req = request_factory.get("/api/health/")
        resp = health_check(req)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert data["status"] == "ok"
        assert "database" in data


# ===========================================================================
# 2. Scanning API Endpoints
# ===========================================================================

class TestScanEndpoint:
    def test_scan_url_missing_url(self, request_factory, sample_user):
        """POST /api/scan/ with missing URL returns 400 Bad Request."""
        req = request_factory.post(
            "/api/scan/",
            data=json.dumps({}),
            content_type="application/json"
        )
        req.user = sample_user
        resp = scan_url_view(req)
        assert resp.status_code == 400
        data = json.loads(resp.content)
        assert "error" in data

    def test_scan_url_successful_execution(self, request_factory, sample_user, sample_scan_report):
        """POST /api/scan/ triggers orchestrator run and returns structured scan result."""
        chat_id = str(uuid.uuid4())
        mock_result = {
            "target_url": "https://boc-fake-login.xyz",
            "chat_id": chat_id,
            "overall_status": "COMPLETED",
            "total_duration_sec": 2.3,
            "report": sample_scan_report,
            "screenshot_data": "data:image/png;base64,sample",
            "tool_trace": [{"step": "tool_call", "tool": "analyze_url_features"}],
        }

        with patch("backend.agents.orchestrator.OrchestratorAgent.run", return_value=mock_result):
            req = request_factory.post(
                "/api/scan/",
                data=json.dumps({
                    "url": "https://boc-fake-login.xyz",
                    "chat_id": chat_id
                }),
                content_type="application/json"
            )
            req.user = sample_user
            resp = scan_url_view(req)

            assert resp.status_code == 200
            data = json.loads(resp.content)
            assert data["report"]["risk_score"] == 88


# ===========================================================================
# 3. Chat Session CRUD & Message API Endpoints
# ===========================================================================

class TestChatSessionsAndMessages:
    def test_chats_list_create_view(self, request_factory, sample_user):
        """GET /api/chats/ returns user's chats and POST creates a new chat."""
        # 1. Create a new chat
        post_req = request_factory.post(
            "/api/chats/",
            data=json.dumps({"title": "Test Threat Investigation"}),
            content_type="application/json"
        )
        post_req.user = sample_user
        create_resp = chats_list_create_view(post_req)
        assert create_resp.status_code in [200, 201]
        created_data = json.loads(create_resp.content)
        chat_id = created_data["id"]

        # 2. List chats
        get_req = request_factory.get("/api/chats/")
        get_req.user = sample_user
        list_resp = chats_list_create_view(get_req)
        assert list_resp.status_code == 200
        list_data = json.loads(list_resp.content)
        assert any(c["id"] == chat_id for c in list_data["chats"])

    def test_chat_detail_patch_and_delete(self, request_factory, sample_user, sample_chat_session):
        """Test GET, PATCH (rename), and DELETE on /api/chats/<id>/."""
        chat_id = str(sample_chat_session.id)

        # GET detail
        req_get = request_factory.get(f"/api/chats/{chat_id}/")
        req_get.user = sample_user
        resp_get = chat_detail_view(req_get, chat_id=chat_id)
        assert resp_get.status_code == 200

        # PATCH rename
        req_patch = request_factory.patch(
            f"/api/chats/{chat_id}/",
            data=json.dumps({"title": "Renamed Investigation"}),
            content_type="application/json"
        )
        req_patch.user = sample_user
        resp_patch = chat_detail_view(req_patch, chat_id=chat_id)
        assert resp_patch.status_code == 200
        sample_chat_session.refresh_from_db()
        assert sample_chat_session.title == "Renamed Investigation"

        # DELETE chat
        req_del = request_factory.delete(f"/api/chats/{chat_id}/")
        req_del.user = sample_user
        resp_del = chat_detail_view(req_del, chat_id=chat_id)
        assert resp_del.status_code == 200
        assert not ChatSession.objects.filter(id=sample_chat_session.id).exists()

    def test_chat_message_view(self, request_factory, sample_user, sample_chat_session):
        """POST /api/chats/<id>/message/ sends conversational user message."""
        chat_id = str(sample_chat_session.id)
        mock_reply = {
            "chat_id": chat_id,
            "reply": "The SSL certificate was issued by an untrusted CA.",
            "status": "success",
            "duration_sec": 0.8
        }

        with patch("backend.agents.orchestrator.OrchestratorAgent.run_followup_chat", return_value=mock_reply):
            req = request_factory.post(
                f"/api/chats/{chat_id}/message/",
                data=json.dumps({"message": "What about the SSL cert?"}),
                content_type="application/json"
            )
            req.user = sample_user
            resp = chat_message_view(req, chat_id=chat_id)

            assert resp.status_code == 200
            data = json.loads(resp.content)
            assert "SSL certificate" in data["reply"]


# ===========================================================================
# 4. Artifacts, Screenshots, Scan Logs & PDF Export Endpoints
# ===========================================================================

class TestArtifactsAndExports:
    def test_user_screenshots_view(self, request_factory, sample_user, sample_chat_session, sample_png_b64):
        """GET /api/user/screenshots/ returns gallery of captured screenshots."""
        ChatMessage.objects.create(
            chat=sample_chat_session,
            sender="assistant",
            message_type="scan_result",
            target_url="https://fake-bank.xyz",
            screenshot_data=sample_png_b64,
            overall_status="COMPLETED"
        )

        req = request_factory.get("/api/user/screenshots/")
        req.user = sample_user
        resp = user_screenshots_view(req)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert "screenshots" in data
        assert len(data["screenshots"]) >= 1

    def test_scan_logs_view(self, request_factory, sample_user, sample_chat_session):
        """GET /api/logs/ returns recent scan activity logs."""
        ChatMessage.objects.create(
            chat=sample_chat_session,
            sender="assistant",
            message_type="scan_result",
            target_url="https://suspicious-log-test.lk",
            overall_status="COMPLETED"
        )

        req = request_factory.get("/api/logs/")
        req.user = sample_user
        resp = scan_logs_view(req)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert "logs" in data

    def test_export_pdf_view(self, request_factory, sample_user, sample_scan_report):
        """POST /api/export-pdf/ returns downloadable application/pdf binary response."""
        req = request_factory.post(
            "/api/export-pdf/",
            data=json.dumps({
                "url": "https://boc-fake.xyz",
                "report": sample_scan_report
            }),
            content_type="application/json"
        )
        req.user = sample_user
        resp = export_pdf_view(req)
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"
        assert resp.content.startswith(b"%PDF-")

    def test_export_chat_pdf_view(self, request_factory, sample_user, sample_chat_session, sample_scan_report):
        """GET /api/chats/<id>/export-pdf/ downloads PDF for existing chat scan."""
        ChatMessage.objects.create(
            chat=sample_chat_session,
            sender="assistant",
            message_type="scan_result",
            target_url="https://boc-fake-chat.xyz",
            report=sample_scan_report,
            overall_status="COMPLETED"
        )

        chat_id = str(sample_chat_session.id)
        req = request_factory.get(f"/api/chats/{chat_id}/export-pdf/")
        req.user = sample_user
        resp = export_chat_pdf_view(req, chat_id=chat_id)
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"
        assert resp.content.startswith(b"%PDF-")
