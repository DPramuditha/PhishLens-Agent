"""
PhishLens Agent — PostgreSQL Database Models for Chat Sessions, Messages, and Agent Memory.
"""

import uuid
from django.db import models
from django.contrib.auth.models import User


class ChatSession(models.Model):
    """
    Represents a unique conversation / scan session with the PhishLens agent.
    Each session is identified by a unique UUID for /chat/<id> routing.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="chat_sessions",
        help_text="The authenticated user who owns this chat session (null for anonymous/guest sessions).",
    )
    title = models.CharField(max_length=255, default="New Scan")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "Chat Session"
        verbose_name_plural = "Chat Sessions"

    def __str__(self):
        return f"ChatSession {self.id} — {self.title}"

    @property
    def last_message(self):
        return self.messages.order_by("-created_at").first()


class ChatMessage(models.Model):
    """
    Represents an individual message or scan result within a ChatSession.
    Stores screenshots, structured reports, tool traces, and conversational text.
    """
    SENDER_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
        ("system", "System"),
    ]

    MESSAGE_TYPE_CHOICES = [
        ("text", "Text Message"),
        ("scan_result", "URL Scan Result"),
        ("follow_up", "Follow-up Response"),
        ("system_alert", "System Alert"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.CharField(max_length=20, choices=SENDER_CHOICES, default="assistant")
    message_type = models.CharField(max_length=30, choices=MESSAGE_TYPE_CHOICES, default="text")
    text = models.TextField(blank=True, null=True)
    
    # URL & Scan Artifacts (stored directly in DB as Base64 Data URI)
    target_url = models.URLField(max_length=2048, blank=True, null=True)
    screenshot_data = models.TextField(blank=True, null=True, help_text="Base64 encoded screenshot data URI (e.g. data:image/png;base64,...)")
    annotated_screenshot_data = models.TextField(blank=True, null=True, help_text="Base64 encoded annotated screenshot data URI")
    screenshot_path = models.CharField(max_length=512, blank=True, null=True, help_text="Legacy screenshot path or URL")
    screenshot_image = models.ImageField(upload_to="screenshots/", blank=True, null=True)
    
    # Structured Phishing Report & Intelligence
    report = models.JSONField(blank=True, null=True)
    url_analysis_data = models.JSONField(blank=True, null=True)
    tool_trace = models.JSONField(blank=True, null=True)
    
    # Execution Metadata
    overall_status = models.CharField(max_length=30, blank=True, null=True, default="COMPLETED")
    duration_sec = models.FloatField(blank=True, null=True)
    error = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = "Chat Message"
        verbose_name_plural = "Chat Messages"

    def __str__(self):
        return f"ChatMessage [{self.sender}] in {self.chat_id} @ {self.created_at}"


class AgentMemoryRecord(models.Model):
    """
    Persistent backing store for LangGraph long-term memories.
    Organized by hierarchical namespace (e.g. ('user_id', 'domain_history')) and key.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="agent_memories",
    )
    namespace = models.CharField(max_length=255, db_index=True)
    key = models.CharField(max_length=255, db_index=True)
    value = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        unique_together = [("namespace", "key")]
        ordering = ["-updated_at"]
        verbose_name = "Agent Memory Record"
        verbose_name_plural = "Agent Memory Records"

    def __str__(self):
        return f"Memory [{self.namespace}] -> {self.key}"
