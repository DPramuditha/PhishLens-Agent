"""
PhishLens Agent — Authentication URL Configuration.
"""

from django.urls import path
from backend.apps.authentication.views import (
    google_auth_view,
    current_user_view,
    email_login_view,
    email_register_view,
    update_profile_view,
    upload_avatar_view,
    delete_avatar_view,
    change_password_view,
    logout_view,
)

app_name = "authentication"

urlpatterns = [
    path("google/", google_auth_view, name="google_auth"),
    path("me/", current_user_view, name="current_user"),
    path("login/", email_login_view, name="email_login"),
    path("register/", email_register_view, name="email_register"),
    path("profile/update/", update_profile_view, name="update_profile"),
    path("profile/avatar/", upload_avatar_view, name="upload_avatar"),
    path("profile/avatar/delete/", delete_avatar_view, name="delete_avatar"),
    path("change-password/", change_password_view, name="change_password"),
    path("logout/", logout_view, name="logout"),
]

