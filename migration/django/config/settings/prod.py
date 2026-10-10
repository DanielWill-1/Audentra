import os

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

if SECRET_KEY == "development-only-change-me":  # noqa: F405
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY for production settings.")

if P3_SERVICES_ENABLED:  # noqa: F405
    raise ImproperlyConfigured("P3 provider endpoints are limited to loopback development.")

DEBUG = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "true").lower() == "true"  # noqa: F405
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")  # noqa: F405
    if origin.strip()
]
