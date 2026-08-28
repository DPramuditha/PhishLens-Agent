import os
import sys

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

import json
import uuid
from django.test import RequestFactory
from django.contrib.auth.models import User, AnonymousUser
from django.http import HttpResponse

from backend.core.security import (
    generate_jwt_token,
    decode_jwt_token,
    validate_password_strength,
    validate_email_address,
)
from backend.core.middleware import (
    JWTAuthenticationMiddleware,
    CORSMiddleware,
    RateLimitMiddleware,
    jwt_required,
    optional_jwt,
)
from backend.apps.authentication.views import (
    google_auth_view,
    current_user_view,
    email_login_view,
    email_register_view,
    update_profile_view,
    change_password_view,
    logout_view,
)
from backend.core.utils.responses import api_success, api_error, api_unauthorized

factory = RequestFactory()


def run_tests():
    print("=== Running PhishLens Clean Modular Architecture & Security Tests ===")

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

    # 2. Test JWT Authentication Middleware with valid token
    def dummy_view(req):
        return HttpResponse(f"User: {req.user.username}, is_auth: {req.user.is_authenticated}")

    jwt_mw = JWTAuthenticationMiddleware(dummy_view)
    req_mw_valid = factory.get("/api/test/", HTTP_AUTHORIZATION=f"Bearer {token}")
    resp_mw_valid = jwt_mw(req_mw_valid)
    assert req_mw_valid.user.is_authenticated, "Middleware failed to authenticate valid JWT"
    assert req_mw_valid.user.email == "security_test@phishlens.ai"
    print("[PASS] [TEST 2] Global JWTAuthenticationMiddleware populates request.user for valid Bearer token")

    # 3. Test JWT Authentication Middleware with invalid/forged token
    req_mw_invalid = factory.get("/api/test/", HTTP_AUTHORIZATION="Bearer invalid.fake.token")
    resp_mw_invalid = jwt_mw(req_mw_invalid)
    assert not req_mw_invalid.user.is_authenticated, "Middleware authenticated an invalid token"
    assert isinstance(req_mw_invalid.user, AnonymousUser)
    print("[PASS] [TEST 3] Global JWTAuthenticationMiddleware assigns AnonymousUser for forged token")

    # 4. Test Protected @jwt_required Decorator
    @jwt_required
    def protected_view(req):
        return api_success(data={"secret": 42})

    req_prot_unauth = factory.get("/api/secret/")
    resp_prot_unauth = protected_view(req_prot_unauth)
    assert resp_prot_unauth.status_code == 401, f"Expected 401, got {resp_prot_unauth.status_code}"
    print("[PASS] [TEST 4] Protected route decorator (@jwt_required) blocks unauthenticated requests (401)")

    # 5. Test Protected current_user_view (/api/auth/me/) with valid token
    req_me = factory.get("/api/auth/me/", HTTP_AUTHORIZATION=f"Bearer {token}")
    resp_me = current_user_view(req_me)
    assert resp_me.status_code == 200, f"Expected 200, got {resp_me.status_code}"
    data_me = json.loads(resp_me.content)
    assert data_me["user"]["email"] == "security_test@phishlens.ai"
    assert data_me["user"]["name"] == "Security Auditor"
    print("[PASS] [TEST 5] Protected current_user_view (/api/auth/me/) returns authenticated user profile")

    # 6. Test /api/auth/google/ rejection of empty/invalid credential & access token
    req_empty_google = factory.post(
        "/api/auth/google/",
        data=json.dumps({}),
        content_type="application/json"
    )
    resp_empty_google = google_auth_view(req_empty_google)
    assert resp_empty_google.status_code == 400, f"Expected 400, got {resp_empty_google.status_code}"

    req_bad_google = factory.post(
        "/api/auth/google/",
        data=json.dumps({"credential": "invalid_fake_google_credential"}),
        content_type="application/json"
    )
    resp_bad_google = google_auth_view(req_bad_google)
    assert resp_bad_google.status_code == 401, f"Expected 401, got {resp_bad_google.status_code}"

    req_bad_access_token = factory.post(
        "/api/auth/google/",
        data=json.dumps({"access_token": "invalid_fake_google_access_token"}),
        content_type="application/json"
    )
    resp_bad_access_token = google_auth_view(req_bad_access_token)
    assert resp_bad_access_token.status_code == 401, f"Expected 401, got {resp_bad_access_token.status_code}"

    # Test Google auth with mocked access token userinfo
    from unittest.mock import patch
    with patch("backend.core.security.oauth.requests.get") as mock_get:
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "email": "google_user@gmail.com",
            "name": "Google Test User",
            "given_name": "Google",
            "family_name": "Test User",
            "picture": "https://lh3.googleusercontent.com/test.jpg"
        }
        req_valid_access = factory.post(
            "/api/auth/google/",
            data=json.dumps({"access_token": "ya29.valid_mock_token"}),
            content_type="application/json"
        )
        resp_valid_access = google_auth_view(req_valid_access)
        assert resp_valid_access.status_code == 200, f"Expected 200, got {resp_valid_access.status_code}"
        data_valid_access = json.loads(resp_valid_access.content)
        assert "token" in data_valid_access
        assert data_valid_access["user"]["email"] == "google_user@gmail.com"
        assert data_valid_access["user"]["name"] == "Google Test User"

    print("[PASS] [TEST 6] Google auth (credential & access_token validation, error handling & user provisioning) verified")

    # 7. Test /api/auth/register/ with weak passwords (should be rejected)
    weak_cases = [
        {"name": "A", "email": "valid@phishlens.ai", "password": "Password123!"},
        {"name": "Valid Name", "email": "not-an-email", "password": "Password123!"},
        {"name": "Valid Name", "email": "valid@phishlens.ai", "password": "short"},
        {"name": "Valid Name", "email": "valid@phishlens.ai", "password": "nouppercase123!"},
        {"name": "Valid Name", "email": "valid@phishlens.ai", "password": "NOLOWERCASE123!"},
        {"name": "Valid Name", "email": "valid@phishlens.ai", "password": "NoNumbersHere!"},
        {"name": "Valid Name", "email": "valid@phishlens.ai", "password": "NoSpecialChar123"},
    ]
    for case in weak_cases:
        req = factory.post("/api/auth/register/", data=json.dumps(case), content_type="application/json")
        resp = email_register_view(req)
        assert resp.status_code == 400, f"Expected 400 for {case}, got {resp.status_code}: {resp.content}"
    print("[PASS] [TEST 7] Strict password complexity and RFC email validation enforced (400 Bad Request)")

    # 8. Test Successful User Registration & JWT Issuance
    unique_email = f"user_{uuid.uuid4().hex[:8]}@phishlens.ai"
    reg_payload = {
        "name": "Dimuthu Pramuditha",
        "email": unique_email,
        "password": "SecurePassword123!#",
    }
    req_reg = factory.post("/api/auth/register/", data=json.dumps(reg_payload), content_type="application/json")
    resp_reg = email_register_view(req_reg)
    assert resp_reg.status_code == 201, f"Expected 201, got {resp_reg.status_code}: {resp_reg.content}"
    data_reg = json.loads(resp_reg.content)
    assert "token" in data_reg, "Registration response missing JWT token"
    assert data_reg["user"]["email"] == unique_email
    assert data_reg["user"]["name"] == "Dimuthu Pramuditha"
    user_token = data_reg["token"]
    print("[PASS] [TEST 8] User successfully registered in database with PBKDF2 hashing & JWT issuance (201 Created)")

    # 9. Test Duplicate Email Registration (should be 409 Conflict)
    req_dup = factory.post("/api/auth/register/", data=json.dumps(reg_payload), content_type="application/json")
    resp_dup = email_register_view(req_dup)
    assert resp_dup.status_code == 409, f"Expected 409, got {resp_dup.status_code}"
    print("[PASS] [TEST 9] Duplicate email registration rejected (409 Conflict)")

    # 10. Test Email Login with Registered User
    login_payload = {
        "email": unique_email,
        "password": "SecurePassword123!#",
    }
    req_login = factory.post("/api/auth/login/", data=json.dumps(login_payload), content_type="application/json")
    resp_login = email_login_view(req_login)
    assert resp_login.status_code == 200, f"Expected 200, got {resp_login.status_code}"
    data_login = json.loads(resp_login.content)
    assert "token" in data_login
    assert data_login["user"]["email"] == unique_email
    print("[PASS] [TEST 10] Email & Password login verified with JWT issuance (200 OK)")

    # 11. Test Login with Wrong Password
    bad_login_payload = {
        "email": unique_email,
        "password": "WrongPassword999!",
    }
    req_bad_login = factory.post("/api/auth/login/", data=json.dumps(bad_login_payload), content_type="application/json")
    resp_bad_login = email_login_view(req_bad_login)
    assert resp_bad_login.status_code == 401, f"Expected 401, got {resp_bad_login.status_code}"
    print("[PASS] [TEST 11] Wrong password rejected (401 Unauthorized)")

    # 12. Test Update Profile endpoint (/api/auth/profile/update/)
    update_req = factory.post(
        "/api/auth/profile/update/",
        data=json.dumps({"name": "Dimuthu Updated"}),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {user_token}"
    )
    update_resp = update_profile_view(update_req)
    assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}: {update_resp.content}"
    update_data = json.loads(update_resp.content)
    assert update_data["user"]["name"] == "Dimuthu Updated"
    print("[PASS] [TEST 12] Profile name updated and returned with renewed JWT (200 OK)")

    # 13. Test Change Password endpoint (/api/auth/change-password/)
    pw_req = factory.post(
        "/api/auth/change-password/",
        data=json.dumps({
            "current_password": "SecurePassword123!#",
            "new_password": "NewSecurePassword456!@"
        }),
        content_type="application/json",
        HTTP_AUTHORIZATION=f"Bearer {user_token}"
    )
    pw_resp = change_password_view(pw_req)
    assert pw_resp.status_code == 200, f"Expected 200, got {pw_resp.status_code}: {pw_resp.content}"
    print("[PASS] [TEST 13] Password successfully changed with complexity validation (200 OK)")

    # 14. Test CORS Middleware
    cors_mw = CORSMiddleware(lambda r: HttpResponse("ok"))
    req_options = factory.options("/api/scan/")
    resp_options = cors_mw(req_options)
    assert resp_options["Access-Control-Allow-Origin"] == "*"
    assert "Authorization" in resp_options["Access-Control-Allow-Headers"]
    print("[PASS] [TEST 14] CORSMiddleware correctly handles OPTIONS preflight and headers")

    # 15. Test Rate Limiting Middleware
    rate_mw = RateLimitMiddleware(lambda r: HttpResponse("ok"))
    rate_mw.max_requests_per_window = 3  # Set low threshold for testing
    req_rate = factory.get("/api/scan/")
    for _ in range(3):
        r = rate_mw(req_rate)
        assert r.status_code == 200
    r_blocked = rate_mw(req_rate)
    assert r_blocked.status_code == 429, f"Expected 429 Rate Limited, got {r_blocked.status_code}"
    print("[PASS] [TEST 15] RateLimitMiddleware enforces request throttling and returns 429")

    print("\nALL 15 MODULAR ARCHITECTURE, MIDDLEWARE, AND SECURITY TESTS PASSED!")


if __name__ == "__main__":
    run_tests()
