"""Check local or production-style settings without revealing their values."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlsplit

PROFILE_MODULES = {
    "local-http": "config.settings.local_http",
    "local-supabase": "config.settings.local_supabase",
    "demo-http": "config.settings.demo_http",
    "production": "config.settings.prod",
}
LOCAL_PROFILES = {"local-http", "local-supabase"}
PROJECT_DIR = Path(__file__).resolve().parents[1]
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))


def _has_https_url(value: str) -> bool:
    try:
        parsed = urlsplit(value)
        return (
            parsed.scheme == "https"
            and bool(parsed.hostname)
            and not (parsed.username or parsed.password)
        )
    except ValueError:
        return False


def _database_uses_role(url: str, expected_role: str, supabase_url: str) -> bool:
    try:
        parsed = urlsplit(url)
        if parsed.scheme not in {"postgres", "postgresql"} or not parsed.hostname:
            return False
        username = unquote(parsed.username or "")
        if username == expected_role:
            return True
        project_host = urlsplit(supabase_url).hostname or ""
        project_ref = project_host.split(".", maxsplit=1)[0]
        return (
            parsed.hostname.endswith(".pooler.supabase.com")
            and bool(project_ref)
            and username == f"{expected_role}.{project_ref}"
        )
    except ValueError:
        return False


def _local_supabase_url(value: str) -> bool:
    try:
        parsed = urlsplit(value)
        host = (parsed.hostname or "").casefold()
        loopback = host in {"localhost", "127.0.0.1", "::1"}
        return (
            parsed.scheme == "http"
            and loopback
            and parsed.port == 54321
            and parsed.username is None
            and parsed.password is None
            and parsed.path in {"", "/"}
            and not parsed.query
            and not parsed.fragment
        )
    except ValueError:
        return False


def _local_database_uses_role(url: str, expected_role: str) -> bool:
    try:
        parsed = urlsplit(url)
        host = (parsed.hostname or "").casefold()
        loopback = host in {"localhost", "127.0.0.1", "::1"}
        return (
            parsed.scheme in {"postgres", "postgresql"}
            and loopback
            and parsed.port == 54322
            and unquote(parsed.username or "") == expected_role
            and bool(parsed.password)
            and parsed.path == "/postgres"
            and parsed.query == "sslmode=disable"
        )
    except ValueError:
        return False


def _provider_status(settings: Any) -> tuple[dict[str, str], list[dict[str, str]]]:
    modes = {
        "speech": settings.SPEECH_BACKEND,
        "tts": settings.TTS_BACKEND,
        "extraction": "mock" if settings.USE_MOCK_AI else "groq",
    }
    issues: list[dict[str, str]] = []
    if modes["speech"] not in {"mock", "google", "groq"}:
        issues.append({"setting": "SPEECH_BACKEND", "issue": "unsupported_mode"})
    if modes["tts"] not in {"mock", "google", "groq"}:
        issues.append({"setting": "TTS_BACKEND", "issue": "unsupported_mode"})

    google_selected = modes["speech"] == "google" or modes["tts"] == "google"
    if google_selected:
        credentials = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "").strip()
        credential_file = Path(credentials)
        if not credential_file.is_absolute():
            credential_file = settings.BASE_DIR / credential_file
        if not credentials or not credential_file.is_file():
            issues.append(
                {"setting": "GOOGLE_APPLICATION_CREDENTIALS", "issue": "file_not_available"}
            )
    if modes["speech"] == "groq" and not settings.GROQ_STT_MODEL:
        issues.append({"setting": "GROQ_STT_MODEL", "issue": "not_configured"})
    if modes["tts"] == "groq":
        if not settings.GROQ_TTS_MODEL:
            issues.append({"setting": "GROQ_TTS_MODEL", "issue": "not_configured"})
        if settings.GROQ_TTS_VOICE not in {
            "autumn",
            "diana",
            "hannah",
            "austin",
            "daniel",
            "troy",
        }:
            issues.append({"setting": "GROQ_TTS_VOICE", "issue": "unsupported_voice"})
    if modes["speech"] == "groq" or modes["tts"] == "groq" or modes["extraction"] == "groq":
        if not settings.GROQ_API_KEY:
            issues.append({"setting": "GROQ_API_KEY", "issue": "not_configured"})
    if modes["extraction"] == "groq":
        if not _has_https_url(settings.GROQ_API_URL):
            issues.append({"setting": "GROQ_API_URL", "issue": "invalid_https_url"})
        if not settings.GROQ_MODEL.strip():
            issues.append({"setting": "GROQ_MODEL", "issue": "not_configured"})
    return modes, issues


def inspect_configuration(profile: str) -> dict[str, Any]:
    if profile not in PROFILE_MODULES:
        raise ValueError("Unknown P10 profile")
    os.environ["DJANGO_SETTINGS_MODULE"] = PROFILE_MODULES[profile]

    try:
        from django.conf import settings

        _ = settings.SECRET_KEY
    except Exception as error:
        message = str(error)
        known_settings = (
            "DJANGO_SECRET_KEY",
            "DJANGO_ALLOWED_HOSTS",
            "DJANGO_PUBLIC_ORIGIN",
            "DJANGO_CSRF_TRUSTED_ORIGINS",
            "P3_SERVICE_ACCESS_MODE",
            "P3_PROXY_TOKEN",
            "P10_TRUSTED_PROXY_IP",
            "DJANGO_HSTS_SECONDS",
            "P10_LOCAL_DJANGO_SECRET_KEY",
        )
        setting = next(
            (name for name in known_settings if name in message),
            "DJANGO_SETTINGS_MODULE",
        )
        return {
            "profile": profile,
            "ok": False,
            "network_calls": False,
            "failures": [{"setting": setting, "issue": "settings_rejected"}],
            "warnings": [],
        }

    failures: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []
    for setting_name in ("P3_SERVICES_ENABLED", "USE_MOCK_AI"):
        raw_value = os.getenv(setting_name)
        if raw_value is not None and raw_value.strip().lower() not in {"true", "false"}:
            failures.append({"setting": setting_name, "issue": "expected_true_or_false"})
    if settings.SECRET_KEY == "development-only-change-me" or len(settings.SECRET_KEY) < 50:
        secret_setting = (
            "P10_LOCAL_DJANGO_SECRET_KEY" if profile in LOCAL_PROFILES else "DJANGO_SECRET_KEY"
        )
        failures.append({"setting": secret_setting, "issue": "missing_or_too_short"})
    if not settings.SUPABASE_URL or not settings.SUPABASE_PUBLISHABLE_KEY:
        failures.append({"setting": "SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY", "issue": "required"})
    if profile in LOCAL_PROFILES:
        if not _local_supabase_url(settings.SUPABASE_URL):
            failures.append(
                {"setting": "P10_LOCAL_SUPABASE_URL", "issue": "loopback_endpoint_required"}
            )
        if not settings.SUPABASE_PUBLISHABLE_KEY.startswith("sb_publishable_"):
            failures.append(
                {
                    "setting": "P10_LOCAL_SUPABASE_PUBLISHABLE_KEY",
                    "issue": "publishable_key_required",
                }
            )
    elif profile not in LOCAL_PROFILES and not _has_https_url(settings.SUPABASE_URL):
        failures.append({"setting": "SUPABASE_URL", "issue": "invalid_https_url"})
    if profile in LOCAL_PROFILES and settings.P3_SERVICE_ACCESS_MODE != "loopback":
        failures.append(
            {"setting": "P3_SERVICE_ACCESS_MODE", "issue": "local_profile_requires_loopback"}
        )

    default_url = os.getenv(
        "P10_LOCAL_DJANGO_DATABASE_URL" if profile in LOCAL_PROFILES else "DJANGO_DATABASE_URL",
        "",
    ).strip()
    supabase_url = os.getenv(
        "P10_LOCAL_SUPABASE_DATABASE_URL"
        if profile in LOCAL_PROFILES
        else "DJANGO_SUPABASE_DATABASE_URL",
        "",
    ).strip()
    local_database = profile in LOCAL_PROFILES
    database_setting = (
        "P10_LOCAL_DJANGO_DATABASE_URL/P10_LOCAL_SUPABASE_DATABASE_URL"
        if local_database
        else "DJANGO_DATABASE_URL/DJANGO_SUPABASE_DATABASE_URL"
    )
    if bool(default_url) != bool(supabase_url):
        failures.append(
            {
                "setting": database_setting,
                "issue": "both_aliases_required",
            }
        )
    if default_url and supabase_url:
        app_database_ok = (
            _local_database_uses_role(default_url, "django_app")
            if local_database
            else _database_uses_role(default_url, "django_app", settings.SUPABASE_URL)
        )
        data_database_ok = (
            _local_database_uses_role(supabase_url, "django_data")
            if local_database
            else _database_uses_role(supabase_url, "django_data", settings.SUPABASE_URL)
        )
        if not app_database_ok:
            failures.append(
                {
                    "setting": (
                        "P10_LOCAL_DJANGO_DATABASE_URL"
                        if local_database
                        else "DJANGO_DATABASE_URL"
                    ),
                    "issue": "restricted_role_required",
                }
            )
        if not data_database_ok:
            failures.append(
                {
                    "setting": (
                        "P10_LOCAL_SUPABASE_DATABASE_URL"
                        if local_database
                        else "DJANGO_SUPABASE_DATABASE_URL"
                    ),
                    "issue": "restricted_role_required",
                }
            )
        database_mode = (
            "local_supabase_restricted_postgresql" if local_database else "restricted_postgresql"
        )
    elif profile in {"production", "demo-http"}:
        failures.append(
            {
                "setting": database_setting,
                "issue": "required_for_profile",
            }
        )
        database_mode = "incomplete"
    elif profile in LOCAL_PROFILES:
        database_mode = "incomplete"
        failures.append(
            {
                "setting": database_setting,
                "issue": "local_restricted_database_urls_required",
            }
        )
    else:
        database_mode = "offline_sqlite"
        warnings.append(
            {
                "setting": "DJANGO_DATABASE_URL/DJANGO_SUPABASE_DATABASE_URL",
                "issue": "offline_checks_only",
            }
        )

    static_root = Path(settings.STATIC_ROOT).resolve()
    if static_root == Path(settings.BASE_DIR).resolve():
        failures.append({"setting": "DJANGO_STATIC_ROOT", "issue": "must_not_be_project_root"})
    manifest = static_root / "staticfiles.json"
    if not manifest.is_file():
        failures.append({"setting": "DJANGO_STATIC_ROOT", "issue": "run_collectstatic_first"})

    provider_modes, provider_issues = _provider_status(settings)
    if settings.P3_SERVICES_ENABLED and provider_issues:
        failures.extend(provider_issues)
    else:
        warnings.extend(provider_issues)
    if profile in {"production", "demo-http"}:
        if settings.SECURE_HSTS_SECONDS <= 0:
            warnings.append({"setting": "DJANGO_HSTS_SECONDS", "issue": "owner_decision_required"})
        warnings.extend(
            {
                "setting": setting_name,
                "issue": "mock_demo_mode",
            }
            for setting_name, mode in (
                ("SPEECH_BACKEND", provider_modes["speech"]),
                ("TTS_BACKEND", provider_modes["tts"]),
                ("USE_MOCK_AI", provider_modes["extraction"]),
            )
            if mode == "mock"
        )
    return {
        "profile": profile,
        "ok": not failures,
        "network_calls": False,
        "debug": settings.DEBUG,
        "transport_policy": {
            "session_cookie_secure": settings.SESSION_COOKIE_SECURE,
            "csrf_cookie_secure": settings.CSRF_COOKIE_SECURE,
            "ssl_redirect": settings.SECURE_SSL_REDIRECT,
            "django_proxy_ssl_header_enabled": bool(settings.SECURE_PROXY_SSL_HEADER),
        },
        "database_mode": database_mode,
        "service_endpoints": "enabled" if settings.P3_SERVICES_ENABLED else "disabled",
        "provider_modes": provider_modes,
        "provider_configuration_issues": provider_issues,
        "failures": failures,
        "warnings": warnings,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=sorted(PROFILE_MODULES), required=True)
    args = parser.parse_args()
    result = inspect_configuration(args.profile)
    print(json.dumps(result, sort_keys=True))
    return 0 if result["ok"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
