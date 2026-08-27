"""
PhishLens Agent — Test Suite for Analytics Dashboard, Time-Series Metrics, Radar Dimensions, and Human-in-the-Loop Feedback.
"""

import json
import uuid
import pytest

from backend.agents.models import ChatSession, ChatMessage, UserFeedback
from backend.agents.views import (
    analytics_dashboard_view,
    user_feedback_view,
    generate_hitl_questions,
)


# ===========================================================================
# 1. Analytics Dashboard Tests
# ===========================================================================

class TestAnalyticsDashboard:
    @pytest.mark.parametrize("timeframe", ["live", "1h", "24h", "7d"])
    def test_analytics_dashboard_timeframes(self, request_factory, sample_user, timeframe):
        """GET /api/analytics/?timeframe=<tf> returns structured telemetry and ML metrics."""
        req = request_factory.get(f"/api/analytics/?timeframe={timeframe}")
        req.user = sample_user
        resp = analytics_dashboard_view(req)

        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert data["status"] == "ok"
        assert data["timeframe"] == timeframe

        # Summary
        summary = data["summary"]
        assert "total_scans" in summary
        assert "overall_accuracy" in summary
        assert summary["overall_accuracy"] >= 90.0

        # Traffic timeline points
        assert len(data["traffic_timeline"]) >= 1

        # ML Radar evaluation metrics (6 dimensions)
        radar = data["radar_dimensions"]
        assert len(radar) == 6
        dim_names = [r["dimension"] for r in radar]
        assert "Visual Phishing Detection" in dim_names
        assert "Brand Logo Similarity" in dim_names

        # Model Performance Cards (Stage 1 & Stage 2)
        models = data["models_performance"]
        assert len(models) == 2
        assert any(m["id"] == "phishing_stage1" for m in models)
        assert any(m["id"] == "brand_stage2" for m in models)

    def test_analytics_dashboard_with_user_scans(self, request_factory, sample_user, sample_chat_session, sample_scan_report):
        """Dashboard accurately aggregates user-specific scan history."""
        ChatMessage.objects.create(
            chat=sample_chat_session,
            sender="assistant",
            message_type="scan_result",
            target_url="https://phishing-site.xyz",
            report=sample_scan_report,
            duration_sec=1.8,
            overall_status="COMPLETED"
        )

        req = request_factory.get("/api/analytics/?timeframe=24h")
        req.user = sample_user
        resp = analytics_dashboard_view(req)
        assert resp.status_code == 200
        data = json.loads(resp.content)
        user_usage = data["user_feature_usage"]
        assert "stats" in user_usage
        assert user_usage["stats"]["total_scans"] >= 1


# ===========================================================================
# 2. Human-in-the-Loop (HITL) Dynamic Question Generation Tests
# ===========================================================================

class TestHITLQuestionGeneration:
    def test_generate_hitl_questions_for_phishing(self, sample_scan_report):
        """Generates phishing-targeted feedback questions when threat level is high."""
        questions = generate_hitl_questions(
            url="https://boc-fake.xyz/login",
            report=sample_scan_report,
            reply_text=None,
            user_query=None
        )

        assert isinstance(questions, list)
        assert len(questions) >= 2
        # Checks question content contains domain or brand references
        q_texts = [q["q"] for q in questions]
        assert any("flagged" in qt.lower() or "threat" in qt.lower() or "bank" in qt.lower() or "dangerous" in qt.lower() for qt in q_texts)

    def test_generate_hitl_questions_for_safe_site(self):
        """Generates safety confirmation questions when threat score is low."""
        safe_report = {
            "risk_score": 5,
            "risk_level": "SAFE",
            "summary": "Verified safe official domain."
        }
        questions = generate_hitl_questions(
            url="https://google.com",
            report=safe_report
        )
        assert isinstance(questions, list)
        assert len(questions) >= 1

    def test_generate_hitl_questions_conversational_fallback(self):
        """Generates fallback feedback questions for conversational queries."""
        questions = generate_hitl_questions(
            url=None,
            report=None,
            reply_text="SSL certificate valid until 2027.",
            user_query="How do I verify the SSL certificate?"
        )
        assert isinstance(questions, list)
        assert len(questions) >= 1


# ===========================================================================
# 3. User Feedback Endpoint Tests
# ===========================================================================

class TestUserFeedbackAPI:
    def test_submit_user_feedback_success(self, request_factory, sample_user, sample_chat_session, sample_chat_message):
        """POST /api/feedback/ creates feedback record and returns 201."""
        feedback_payload = {
            "chat_id": str(sample_chat_session.id),
            "message_id": str(sample_chat_message.id),
            "target_url": "https://boc-fake.xyz",
            "feedback_type": "hitl_approval",
            "responses": {
                "0": {"question": "Was this accurate?", "selected": ["Yes, spot on"]}
            },
            "rating": 5
        }

        req = request_factory.post(
            "/api/feedback/",
            data=json.dumps(feedback_payload),
            content_type="application/json"
        )
        req.user = sample_user
        resp = user_feedback_view(req)

        assert resp.status_code in [200, 201]
        data = json.loads(resp.content)
        assert data.get("status") in ["success", "ok"] or "id" in data
        assert UserFeedback.objects.filter(chat=sample_chat_session).exists()

    def test_submit_feedback_duplicate_prevention(self, request_factory, sample_user, sample_chat_session, sample_chat_message):
        """POST /api/feedback/ prevents duplicate submissions for the same chat session."""
        UserFeedback.objects.create(
            user=sample_user,
            chat=sample_chat_session,
            message=sample_chat_message,
            target_url="https://boc-fake.xyz",
            feedback_type="hitl_approval",
            rating=5
        )

        feedback_payload = {
            "chat_id": str(sample_chat_session.id),
            "message_id": str(sample_chat_message.id),
            "target_url": "https://boc-fake.xyz",
            "rating": 4
        }

        req = request_factory.post(
            "/api/feedback/",
            data=json.dumps(feedback_payload),
            content_type="application/json"
        )
        req.user = sample_user
        resp = user_feedback_view(req)

        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert data.get("status") == "already_submitted"

    def test_get_user_feedback_history(self, request_factory, sample_user):
        """GET /api/feedback/ returns feedback records list."""
        req = request_factory.get("/api/feedback/")
        req.user = sample_user
        resp = user_feedback_view(req)

        assert resp.status_code == 200
        data = json.loads(resp.content)
        assert "feedbacks" in data or "data" in data or isinstance(data, list)
