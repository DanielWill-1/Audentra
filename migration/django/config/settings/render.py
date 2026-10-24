"""Secure settings for a public demo hosted behind Render's TLS proxy."""

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


render_hostname = os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip()
if not render_hostname or "/" in render_hostname or ":" in render_hostname:
    raise ImproperlyConfigured("Render must provide RENDER_EXTERNAL_HOSTNAME.")

if SECRET_KEY == "development-only-change-me" or len(SECRET_KEY) < 50:  # noqa: F405
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be a long, private value.")

database_url = os.getenv("DJANGO_DATABASE_URL", "").strip()
supabase_database_url = os.getenv("DJANGO_SUPABASE_DATABASE_URL", "").strip()
if not database_url or not supabase_database_url:
    raise ImproperlyConfigured(
        "Set both restricted PostgreSQL URLs in DJANGO_DATABASE_URL and "
        "DJANGO_SUPABASE_DATABASE_URL."
    )
if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:  # noqa: F405
    raise ImproperlyConfigured("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.")

configured_hosts = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")
    if host.strip()
]
ALLOWED_HOSTS = list(dict.fromkeys([render_hostname, *configured_hosts]))  # noqa: F405
if "*" in ALLOWED_HOSTS:  # noqa: F405
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS cannot contain a wildcard.")

public_origin = _https_origin(
    os.getenv("DJANGO_PUBLIC_ORIGIN", os.getenv("RENDER_EXTERNAL_URL", ""))
)
if public_origin is None:
    raise ImproperlyConfigured("Set DJANGO_PUBLIC_ORIGIN to the public HTTPS origin.")
public_host = urlsplit(public_origin).hostname
if not public_host or not any(
    host.casefold() == public_host.casefold()
    or (host.startswith(".") and public_host.casefold().endswith(host.casefold()))
    for host in ALLOWED_HOSTS  # noqa: F405
):
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must include DJANGO_PUBLIC_ORIGIN.")

csrf_origins: set[str] = set()
for raw_origin in os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "").split(","):
    if not raw_origin.strip():
        continue
    origin = _https_origin(raw_origin)
    if origin is None:
        raise ImproperlyConfigured("DJANGO_CSRF_TRUSTED_ORIGINS must contain HTTPS origins.")
    csrf_origins.add(origin)
csrf_origins.add(public_origin)

if os.getenv("P3_SERVICES_ENABLED", "false").strip().lower() == "true":
    raise ImproperlyConfigured("P3 services are disabled for the public Render demo.")
P3_SERVICES_ENABLED = False  # noqa: F405
P3_SERVICE_ACCESS_MODE = "loopback"  # noqa: F405
P3_PROXY_TOKEN = ""  # noqa: F405
P10_TRUSTED_PROXY_IP = ""  # noqa: F405

try:
    hsts_seconds = int(os.getenv("DJANGO_HSTS_SECONDS", "0"))
except ValueError as error:
    raise ImproperlyConfigured("DJANGO_HSTS_SECONDS must be a nonnegative integer.") from error
if not 0 <= hsts_seconds <= 31_536_000:
    raise ImproperlyConfigured("DJANGO_HSTS_SECONDS must be between 0 and one year.")

DEBUG = False
DJANGO_PUBLIC_ORIGIN = public_origin
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
X_FRAME_OPTIONS = "DENY"
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = hsts_seconds
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
# Waitress sets the WSGI scheme to HTTPS after Render terminates TLS.
SECURE_PROXY_SSL_HEADER = None
USE_X_FORWARDED_HOST = False
CSRF_TRUSTED_ORIGINS = sorted(csrf_origins)
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
