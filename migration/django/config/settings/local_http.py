"""Explicit DEBUG=False local HTTP profile for the native Windows server."""

import os

from config.p10_logging import operational_logging

from .base import *  # noqa: F403

DEBUG = False
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]
DJANGO_PUBLIC_ORIGIN = "http://127.0.0.1:8000"
CSRF_TRUSTED_ORIGINS = ["http://127.0.0.1:8000", "http://localhost:8000"]
P3_ALLOWED_ORIGINS = list(
    dict.fromkeys([*P3_ALLOWED_ORIGINS, *CSRF_TRUSTED_ORIGINS])  # noqa: F405
)
P3_SERVICE_ACCESS_MODE = "loopback"
P3_PROXY_TOKEN = ""

SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_PROXY_SSL_HEADER = None
USE_X_FORWARDED_HOST = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"

MIDDLEWARE = [  # noqa: F405
    MIDDLEWARE[0],  # noqa: F405
    "whitenoise.middleware.WhiteNoiseMiddleware",
    *MIDDLEWARE[1:],  # noqa: F405
]
STORAGES = {  # noqa: F405
    **STORAGES,  # noqa: F405
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
WHITENOISE_AUTOREFRESH = False
WHITENOISE_USE_FINDERS = False
WHITENOISE_MANIFEST_STRICT = True
LOGGING = operational_logging(  # noqa: F405
    BASE_DIR,  # noqa: F405
    os.getenv("DJANGO_LOG_FILE", ""),
)
