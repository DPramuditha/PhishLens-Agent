import os
import sys

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

import json
from django.test import RequestFactory
from django.contrib.auth.models import User
from backend.auth_views import (
    generate_jwt_token,
    decode_jwt_token,
    current_user_view,
    google_auth_view,
    jwt_required,
)
from backend.agents.views import scan_url_view

factory = RequestFactory()

def run_tests():
    print("=== Running PhishLens Authentication & Security Tests ===")

    # 1. Test User & JWT Token Generation
    user, _ = User.objects.get_or_create(
        username="security_test@phishlens.ai",
        defaults={
            "email": "security_test@phishlens.ai",
            "first_name": "Security",
            "last_name": "Auditor",
        }
    )
    token = generate_jwt_token(user, picture="https://lh3.googleusercontent.com/test-pic")
    payload, err = decode_jwt_token(token)
    assert err is None, f"Failed to decode token: {err}"
    assert payload["email"] == "security_test@phishlens.ai"
    assert payload["name"] == "Security Auditor"
    assert payload["picture"] == "https://lh3.googleusercontent.com/test-pic"
    print("[PASS] [TEST 1] JWT Generation and Claims encoding/decoding")

    # 2. Test Unauthenticated /api/scan/
    req_unauth = factory.post("/api/scan/", data=json.dumps({"url": "https://example.com"}), content_type="application/json")
    resp_unauth = scan_url_view(req_unauth)
    assert resp_unauth.status_code == 401, f"Expected 401, got {resp_unauth.status_code}"
    print("[PASS] [TEST 2] Unauthenticated scan request properly rejected (401 Unauthorized)")

    # 3. Test Invalid Token /api/scan/
    req_bad_token = factory.post(
        "/api/scan/",
        data=json.dumps({"url": "https://example.com"}),
        content_type="application/json",
        HTTP_AUTHORIZATION="Bearer invalid.fake.token"
    )
    resp_bad_token = scan_url_view(req_bad_token)
    assert resp_bad_token.status_code == 401, f"Expected 401, got {resp_bad_token.status_code}"
    print("[PASS] [TEST 3] Forged/invalid JWT token properly rejected (401 Unauthorized)")

    # 4. Test /api/auth/me/ with valid token
    req_me = factory.get(
        "/api/auth/me/",
        HTTP_AUTHORIZATION=f"Bearer {token}"
    )
    resp_me = current_user_view(req_me)
    assert resp_me.status_code == 200, f"Expected 200, got {resp_me.status_code}"
    data_me = json.loads(resp_me.content)
    assert data_me["user"]["email"] == "security_test@phishlens.ai"
    assert data_me["user"]["name"] == "Security Auditor"
    print("[PASS] [TEST 4] Protected current_user_view (/api/auth/me/) returns authenticated claims")

    # 5. Test /api/auth/google/ rejection of empty/invalid credential
    req_bad_google = factory.post(
        "/api/auth/google/",
        data=json.dumps({"credential": "invalid_fake_google_credential"}),
        content_type="application/json"
    )
    resp_bad_google = google_auth_view(req_bad_google)
    assert resp_bad_google.status_code == 401, f"Expected 401, got {resp_bad_google.status_code}"
    print("[PASS] [TEST 5] Invalid Google credential properly rejected (401)")

    print("\nALL 5 BACKEND AUTHENTICATION & SECURITY TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
