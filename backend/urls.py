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
from django.urls import path
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
)
from backend.auth_views import (
    google_auth_view,
    current_user_view,
    logout_view,
    email_login_view,
    email_register_view,
    update_profile_view,
    change_password_view,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/scan/', scan_url_view, name='scan_url'),
    path('api/health/', health_check, name='health_check'),
    # Chat & Agent Memory Endpoints
    path('api/chats/', chats_list_create_view, name='chats_list_create'),
    path('api/chats/<uuid:chat_id>/', chat_detail_view, name='chat_detail'),
    path('api/chats/<uuid:chat_id>/message/', chat_message_view, name='chat_message'),
    path('api/chats/<uuid:chat_id>/memory/', chat_memory_view, name='chat_memory'),
    path('api/screenshots/', user_screenshots_view, name='user_screenshots'),
    # Authentication endpoints
    path('api/auth/google/', google_auth_view, name='google_auth'),
    path('api/auth/me/', current_user_view, name='current_user'),
    path('api/auth/profile/update/', update_profile_view, name='update_profile'),
    path('api/auth/change-password/', change_password_view, name='change_password'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('api/auth/login/', email_login_view, name='email_login'),
    path('api/auth/register/', email_register_view, name='email_register'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

