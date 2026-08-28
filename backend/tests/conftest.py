"""
PhishLens Agent — Pytest & Unittest Shared Fixtures and Global Configuration.
"""

import os
import sys
from pathlib import Path
import json
import uuid
import pytest

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Setup Django Environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
import django
django.setup()

from django.contrib.auth.models import User
from django.test import RequestFactory, Client
from backend.agents.models import ChatSession, ChatMessage, AgentMemoryRecord, UserFeedback
from backend.core.security.jwt_utils import generate_jwt_token


@pytest.fixture
def request_factory():
    """Returns Django RequestFactory instance."""
    return RequestFactory()


@pytest.fixture
def api_client():
    """Returns Django test Client."""
    return Client()


@pytest.fixture
def sample_user():
    """Creates a regular test user in the database."""
    user, _ = User.objects.get_or_create(
        username="testuser@phishlens.ai",
        defaults={
            "email": "testuser@phishlens.ai",
            "first_name": "Test",
            "last_name": "User",
        }
    )
    user.set_password("SecurePassword123!#")
    user.save()
    return user


@pytest.fixture
def admin_user():
    """Creates a staff administrator user in the database."""
    user, _ = User.objects.get_or_create(
        username="admin@phishlens.ai",
        defaults={
            "email": "admin@phishlens.ai",
            "first_name": "Admin",
            "last_name": "PhishLens",
            "is_staff": True,
            "is_superuser": True,
        }
    )
    user.set_password("AdminPass123!#")
    user.save()
    return user


@pytest.fixture
def user_jwt_token(sample_user):
    """Generates a valid JWT access token for sample_user."""
    return generate_jwt_token(sample_user, picture="https://phishlens.ai/avatar.png")


@pytest.fixture
def auth_headers(user_jwt_token):
    """Returns dictionary of HTTP authorization headers containing valid JWT."""
    return {
        "HTTP_AUTHORIZATION": f"Bearer {user_jwt_token}",
    }


@pytest.fixture
def sample_png_b64():
    """Returns a valid 1x1 transparent PNG data URI."""
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


@pytest.fixture
def sample_scan_report():
    """Returns a realistic structured phishing detection report."""
    return {
        "risk_score": 88,
        "risk_level": "CRITICAL",
        "summary": "High confidence credential harvesting phishing website targeting Bank of Ceylon.",
        "findings": [
            {
                "category": "Typosquatting & Domain Spoofing",
                "detail": "Domain 'boc-ebank-login.xyz' mimics official BOC portal but is not authorized.",
                "severity": "critical"
            },
            {
                "category": "Credential Harvesting DOM",
                "detail": "Detected unencrypted password field posting to external foreign server.",
                "severity": "high"
            },
            {
                "category": "Visual Siamese Similarity",
                "detail": "Matched Bank of Ceylon logo with 94.2% cosine similarity.",
                "severity": "critical"
            }
        ],
        "brand_impersonation": {
            "detected": True,
            "brand": "Bank of Ceylon",
            "confidence": 0.942
        },
        "url_analysis": {
            "hostname": "boc-ebank-login.xyz",
            "domain_age_days": 4,
            "entropy": 3.82,
            "ssl_valid": False
        },
        "safety_advice": "Do not enter any login credentials or OTP. The domain has been flagged."
    }


@pytest.fixture
def sample_chat_session(sample_user):
    """Creates a sample ChatSession owned by sample_user."""
    session = ChatSession.objects.create(
        id=uuid.uuid4(),
        user=sample_user,
        title="Scan: boc-ebank-login.xyz",
        metadata={"source": "pytest"}
    )
    return session


@pytest.fixture
def sample_chat_message(sample_chat_session, sample_scan_report, sample_png_b64):
    """Creates a sample scan result ChatMessage in the database."""
    msg = ChatMessage.objects.create(
        chat=sample_chat_session,
        sender="assistant",
        message_type="scan_result",
        text="Analysis complete. Critical phishing threats identified.",
        target_url="https://boc-ebank-login.xyz/login",
        screenshot_data=sample_png_b64,
        report=sample_scan_report,
        url_analysis_data={"domain_age_days": 4, "is_ip_address": False},
        tool_trace=[
            {"step": "tool_call", "tool": "analyze_url_features", "args": {"url": "https://boc-ebank-login.xyz"}},
            {"step": "tool_result", "tool": "analyze_url_features", "content_preview": "risk_indicators: 4"}
        ],
        overall_status="COMPLETED",
        duration_sec=1.85,
    )
    return msg
