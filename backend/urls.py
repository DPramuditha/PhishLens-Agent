"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from backend.agents.views import (
    scan_url_view,
    health_check,
    chats_list_create_view,
    chat_detail_view,
    chat_message_view,
    chat_memory_view,
    user_screenshots_view,
    scan_logs_view,
    export_pdf_view,
    export_chat_pdf_view,
    analytics_dashboard_view,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/scan/', scan_url_view, name='scan_url'),
    path('api/scan/pdf/', export_pdf_view, name='export_scan_pdf'),
    path('api/health/', health_check, name='health_check'),
    # Chat & Agent Memory Endpoints
    path('api/chats/', chats_list_create_view, name='chats_list_create'),
    path('api/chats/<uuid:chat_id>/', chat_detail_view, name='chat_detail'),
    path('api/chats/<uuid:chat_id>/pdf/', export_chat_pdf_view, name='export_chat_pdf'),
    path('api/chats/<uuid:chat_id>/message/', chat_message_view, name='chat_message'),
    path('api/chats/<uuid:chat_id>/memory/', chat_memory_view, name='chat_memory'),
    path('api/screenshots/', user_screenshots_view, name='user_screenshots'),
    path('api/scan-logs/', scan_logs_view, name='scan_logs'),
    path('api/analytics/', analytics_dashboard_view, name='analytics_dashboard'),
    # Modular Authentication Endpoints
    path('api/auth/', include('backend.apps.authentication.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

