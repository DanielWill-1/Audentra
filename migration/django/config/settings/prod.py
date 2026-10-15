"""Strict settings for a TLS-terminating, same-host private reverse proxy."""

import os
from urllib.parse import urlsplit

from django.core.exceptions import ImproperlyConfigured

from config.p10_logging import operational_logging

from .base import *  # noqa: F403


def _https_origin(value: str) -> str | None:
    try:
        parsed = urlsplit(value.strip().rstrip("/"))
        if parsed.scheme != "https" or not parsed.hostname:
            return None
        if parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
            return None
        _ = parsed.port
    except ValueError:
        return None
    return f"https://{parsed.netloc.lower()}"


if SECRET_KEY == "development-only-change-me" or len(SECRET_KEY) < 50:  # noqa: F405
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be a long, private value.")

if not os.getenv("DJANGO_ALLOWED_HOSTS", "").strip():  # noqa: F405
    raise ImproperlyConfigured("Set DJANGO_ALLOWED_HOSTS for production.")
if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS:  # noqa: F405
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must contain explicit hosts.")

public_origin = _https_origin(os.getenv("DJANGO_PUBLIC_ORIGIN", ""))
if public_origin is None:
    raise ImproperlyConfigured("DJANGO_PUBLIC_ORIGIN must be an HTTPS origin.")
public_host = urlsplit(public_origin).hostname
if not public_host or not any(
    host.casefold() == public_host.casefold()
    or (host.startswith(".") and public_host.casefold().endswith(host.casefold()))
    for host in ALLOWED_HOSTS  # noqa: F405
):
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must include the public host.")

csrf_origins = {
    origin
    for raw_origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",")  # noqa: F405
    if (origin := _https_origin(raw_origin)) is not None
}
if not csrf_origins or public_origin not in csrf_origins:
    raise ImproperlyConfigured("DJANGO_CSRF_TRUSTED_ORIGINS must include DJANGO_PUBLIC_ORIGIN.")
if P3_SERVICE_ACCESS_MODE != "trusted-proxy":  # noqa: F405
    raise ImproperlyConfigured("P3_SERVICE_ACCESS_MODE must be trusted-proxy in production.")
if P10_TRUSTED_PROXY_IP not in {"127.0.0.1", "::1"}:  # noqa: F405
    raise ImproperlyConfigured("P10_TRUSTED_PROXY_IP must identify a local reverse proxy.")
if P3_SERVICES_ENABLED:  # noqa: F405
    if len(P3_PROXY_TOKEN) < 32:  # noqa: F405
        raise ImproperlyConfigured("Set P3_PROXY_TOKEN when P3 services are enabled.")
    if len(P3_API_MARKER) < 16 or P3_API_MARKER == "voiceform-p3":  # noqa: F405
        raise ImproperlyConfigured("Set a non-default INTERNAL_API_TOKEN for enabled services.")
    configured_origins = [
        _https_origin(origin)
        for origin in os.getenv("P3_ALLOWED_ORIGINS", "").split(",")  # noqa: F405
        if origin.strip()
    ]
    if not configured_origins or any(origin is None for origin in configured_origins):
        raise ImproperlyConfigured("P3_ALLOWED_ORIGINS must contain explicit HTTPS origins.")
    if public_origin not in configured_origins:
        raise ImproperlyConfigured("P3_ALLOWED_ORIGINS must include DJANGO_PUBLIC_ORIGIN.")

try:
    hsts_seconds = int(os.getenv("DJANGO_HSTS_SECONDS", "0"))
except ValueError as error:
    raise ImproperlyConfigured("DJANGO_HSTS_SECONDS must be a nonnegative integer.") from error
if not 0 <= hsts_seconds <= 31_536_000:
    raise ImproperlyConfigured("DJANGO_HSTS_SECONDS must be between 0 and one year.")

DEBUG = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = hsts_seconds
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SECURE_PROXY_SSL_HEADER = None
USE_X_FORWARDED_HOST = False
CSRF_TRUSTED_ORIGINS = sorted(csrf_origins)
# Django checks middleware by its exact import string; ServiceCsrfMiddleware subclasses it
# and preserves the reviewed bearer exception for service POSTs.
SILENCED_SYSTEM_CHECKS = ["security.W003"]

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
