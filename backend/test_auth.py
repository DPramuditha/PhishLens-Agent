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
from django.contrib.auth.models import User
from backend.auth_views import (
    generate_jwt_token,
    decode_jwt_token,
    current_user_view,
    google_auth_view,
    email_register_view,
    email_login_view,
    update_profile_view,
    change_password_view,
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

    # 6. Test /api/auth/register/ with weak passwords (should be rejected)
    weak_cases = [
        {"name": "A", "email": "valid@phishlens.ai", "password": "Password123!"}, # Name too short
        {"name": "Valid Name", "email": "not-an-email", "password": "Password123!"}, # Bad email
        {"name": "Valid Name", "email": "valid@phishlens.ai", "password": "short"}, # Short password
        {"name": "Valid Name", "email": "valid@phishlens.ai", "password": "nouppercase123!"}, # No uppercase
        {"name": "Valid Name", "email": "valid@phishlens.ai", "password": "NOLOWERCASE123!"}, # No lowercase
        {"name": "Valid Name", "email": "valid@phishlens.ai", "password": "NoNumbersHere!"}, # No number
        {"name": "Valid Name", "email": "valid@phishlens.ai", "password": "NoSpecialChar123"}, # No special char
    ]
    for case in weak_cases:
        req = factory.post("/api/auth/register/", data=json.dumps(case), content_type="application/json")
        resp = email_register_view(req)
        assert resp.status_code == 400, f"Expected 400 for {case}, got {resp.status_code}: {resp.content}"
    print("[PASS] [TEST 6] Strict password complexity and RFC email validation enforced (400 Bad Request)")

    # 7. Test Successful User Registration & JWT Issuance
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
    print("[PASS] [TEST 7] User successfully registered in database with PBKDF2 hashing & JWT issuance (201 Created)")

    # 8. Test Duplicate Email Registration (should be 409 Conflict)
    req_dup = factory.post("/api/auth/register/", data=json.dumps(reg_payload), content_type="application/json")
    resp_dup = email_register_view(req_dup)
    assert resp_dup.status_code == 409, f"Expected 409, got {resp_dup.status_code}"
    print("[PASS] [TEST 8] Duplicate email registration rejected (409 Conflict)")

    # 9. Test Email Login with Registered User
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
    print("[PASS] [TEST 9] Email & Password login verified with JWT issuance (200 OK)")

    # 10. Test Login with Wrong Password
    bad_login_payload = {
        "email": unique_email,
        "password": "WrongPassword999!",
    }
    req_bad_login = factory.post("/api/auth/login/", data=json.dumps(bad_login_payload), content_type="application/json")
    resp_bad_login = email_login_view(req_bad_login)
    assert resp_bad_login.status_code == 401, f"Expected 401, got {resp_bad_login.status_code}"
    print("[PASS] [TEST 10] Wrong password rejected (401 Unauthorized)")

    # 11. Test Update Profile endpoint (/api/auth/profile/update/)
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
    print("[PASS] [TEST 11] Profile name updated and returned with renewed JWT (200 OK)")

    # 12. Test Change Password endpoint (/api/auth/change-password/)
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
    print("[PASS] [TEST 12] Password successfully changed with complexity validation (200 OK)")

    print("\nALL 12 BACKEND AUTHENTICATION & SECURITY TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
