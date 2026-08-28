"""
PhishLens Agent — Authentication Models.
"""

from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    """
    Extended profile information for a PhishLens user.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    avatar_url = models.URLField(max_length=1024, blank=True, null=True)
    organization = models.CharField(max_length=255, blank=True, null=True)
    role = models.CharField(max_length=50, default="Security Analyst")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_avatar_url(self, request=None) -> str:
        """
        Returns accessible URL for the profile avatar.
        Prefers uploaded avatar file, then external avatar_url, or empty string.
        """
        if self.avatar and hasattr(self.avatar, "url"):
            url = self.avatar.url
            if request:
                return request.build_absolute_uri(url)
            return url
        return self.avatar_url or ""

    def __str__(self):
        return f"Profile for {self.user.username}"

