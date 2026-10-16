"""One fresh hosted Auth account; real Django/PostgreSQL + optional HTMX browser proof.

No existing account or public application table is changed. The generated account
and its tracked Django sessions are deleted in finally. Credentials stay in memory
or the ignored environment; reports contain only check names and booleans.
"""

# ruff: noqa: E402 -- Django must be bootstrapped before model imports.

from __future__ import annotations

import json
import os
import secrets
import subprocess
import sys
from pathlib import Path
from threading import Thread
from time import time
from wsgiref.simple_server import WSGIRequestHandler, make_server

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

import django

django.setup()

import httpx
from apps.accounts.services.tokens import AUTH_SESSION_KEY
from apps.accounts.sessions import SessionStore
from django.conf import settings
from django.contrib.sessions.models import Session
from django.contrib.staticfiles.handlers import StaticFilesHandler
from django.core.wsgi import get_wsgi_application
from django.db import connection
from django.test import Client, override_settings
from supabase import create_client
from supabase.lib.client_options import SyncClientOptions


class QuietHandler(WSGIRequestHandler):
    def log_message(self, _format: str, *_args: object) -> None:
        pass


def main() -> None:
    results: dict[str, object] = {"checks": [], "accounts_created": 0, "emails_sent": 0}
    checks: list[str] = []
    session_keys: set[str] = set()
    email = f"p4-{secrets.token_hex(8)}@example.com"
    password = secrets.token_urlsafe(24)
    changed_password = secrets.token_urlsafe(24)
    account_id: str | None = None
    stage = "preflight"
    admin_key = os.getenv("SUPABASE_TEST_ADMIN_KEY", "")
    if not admin_key.startswith("sb_secret_"):
        raise RuntimeError("Development cleanup credential missing")
    with httpx.Client(timeout=15) as admin_http:
        admin = create_client(
            settings.SUPABASE_URL,
            admin_key,
            options=SyncClientOptions(
                auto_refresh_token=False, persist_session=False, httpx_client=admin_http
            ),
        )
        client = Client(enforce_csrf_checks=True, HTTP_HOST="127.0.0.1:8000")

        def remember() -> None:
            cookie = client.cookies.get(settings.SESSION_COOKIE_NAME)
            if cookie and cookie.value:
                session_keys.add(cookie.value)

        def post(path: str, values: dict[str, str]) -> object:
            token = client.cookies[settings.CSRF_COOKIE_NAME].value
            response = client.post(path, values, HTTP_X_CSRFTOKEN=token)
            remember()
            return response

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT current_user, current_schema()")
                assert cursor.fetchone() == ("django_app", "django")
            assert "django.contrib.auth" not in settings.INSTALLED_APPS
            public = admin_http.get(
                f"{settings.SUPABASE_URL}/auth/v1/settings",
                headers={"apikey": settings.SUPABASE_PUBLISHABLE_KEY},
            )
            assert public.status_code == 200 and public.json()["mailer_autoconfirm"] is True
            checks.append("development_confirmation_disabled_public_key_verified")
            stage = "signup"
            assert client.get("/signup/").status_code == 200
            response = post(
                "/signup/",
                {
                    "email": email,
                    "password": password,
                    "confirm_password": password,
                },
            )
            assert response.status_code == 302
            account_id = client.session[AUTH_SESSION_KEY]["subject"]
            results["accounts_created"] = 1
            assert client.get("/auth/session/").status_code == 200
            checks.append("fresh_signup_server_session_protected_page")
            stage = "logout_after_signup"
            assert post("/logout/", {}).status_code == 302
            assert client.get("/auth/session/").status_code == 302
            checks.append("logout_removes_session_and_protected_access")
            stage = "password_login"
            assert client.get("/login/").status_code == 200
            assert post("/login/", {"email": email, "password": password}).status_code == 302
            assert client.get("/auth/session/").status_code == 200
            checks.append("password_login")
            stage = "refresh"
            key = client.cookies[settings.SESSION_COOKIE_NAME].value
            store = SessionStore(session_key=key)
            before = store[AUTH_SESSION_KEY]["refresh_token"]
            expired_data = store.load()
            expired_data[AUTH_SESSION_KEY]["access_expires_at"] = int(time())
            # Update only this generated row. SessionStore intentionally rejects
            # same-generation auth overwrites, including a probe's forced expiry.
            Session.objects.filter(session_key=key).update(session_data=store.encode(expired_data))
            assert client.get("/auth/session/").status_code == 200
            refreshed = SessionStore(session_key=key)[AUTH_SESSION_KEY]
            assert refreshed["refresh_token"] != before and refreshed["generation"] == 2
            checks.append("hosted_refresh_rotation_postgres_session")
            stage = "live_api_boundary"
            with override_settings(
                P3_SERVICES_ENABLED=True,
                SPEECH_BACKEND="mock",
                TTS_BACKEND="mock",
                USE_MOCK_AI=True,
            ):
                api_headers = {
                    "HTTP_ORIGIN": "http://127.0.0.1:8000",
                }
                payload = {"text": "Development auth boundary check"}
                assert (
                    client.post(
                        "/api/tts/", payload, content_type="application/json", **api_headers
                    ).status_code
                    == 403
                )
                assert (
                    client.post(
                        "/api/tts/",
                        payload,
                        content_type="application/json",
                        HTTP_X_CSRFTOKEN=client.cookies[settings.CSRF_COOKIE_NAME].value,
                        **api_headers,
                    ).status_code
                    == 200
                )
                anonymous = Client(HTTP_HOST="127.0.0.1:8000")
                assert (
                    anonymous.post(
                        "/api/tts/", payload, content_type="application/json", **api_headers
                    ).status_code
                    == 401
                )
            checks.append("hosted_identity_api_csrf_and_anonymous_rejection_with_mock_speech")
            stage = "csrf_and_password_change"
            assert client.get("/change-password/").status_code == 200
            values = {"password": changed_password, "confirm_password": changed_password}
            assert client.post("/change-password/", values).status_code == 403
            assert post("/change-password/", values).status_code == 302
            assert client.get("/auth/session/").status_code == 302
            assert client.get("/login/").status_code == 200
            assert post("/login/", {"email": email, "password": password}).status_code == 400
            assert (
                post("/login/", {"email": email, "password": changed_password}).status_code == 302
            )
            checks.append("csrf_password_change_old_password_rejected_new_password_accepted")
            stage = "email_recovery_limit"
            assert b"Email recovery unavailable" in client.get("/forgot-password/").content
            checks.append("forgotten_password_limitation_is_explicit")
            stage = "final_logout"
            final_refresh = client.session[AUTH_SESSION_KEY]["refresh_token"]
            assert post("/logout/", {}).status_code == 302
            assert client.get("/auth/session/").status_code == 302
            from apps.accounts.services.gotrue import AuthServiceError, GoTrueClient

            try:
                GoTrueClient().refresh(final_refresh)
            except AuthServiceError as error:
                assert error.kind == "invalid"
            else:
                raise AssertionError("Logged-out refresh token remained valid")
            checks.append("hosted_logout_revokes_refresh_token")

            stage = "browser_htmx"
            with make_server(
                "127.0.0.1",
                0,
                StaticFilesHandler(get_wsgi_application()),
                handler_class=QuietHandler,
            ) as server:
                origin = f"http://127.0.0.1:{server.server_port}"
                thread = Thread(target=server.serve_forever, daemon=True)
                thread.start()
                try:
                    with override_settings(CSRF_TRUSTED_ORIGINS=[origin]):
                        browser = subprocess.run(
                            ["node", str(PROJECT / "scripts/check_p4_htmx.mjs")],
                            input=json.dumps(
                                {"origin": origin, "email": email, "password": changed_password}
                            ),
                            text=True,
                            capture_output=True,
                            timeout=90,
                            cwd=PROJECT.parents[1],
                        )
                    browser_result = json.loads(browser.stdout)
                    session_keys.update(browser_result.pop("session_keys"))
                    results["browser"] = browser_result
                    if browser.returncode:
                        raise RuntimeError("HTMX browser verification failed")
                    checks.append("real_browser_htmx_login_validation_navigation_logout")
                finally:
                    server.shutdown()
                    thread.join(timeout=5)
            results["status"] = "passed"
        except Exception:
            results["status"] = "failed"
            results["failed_stage"] = stage
            raise
        finally:
            remember()
            # Locate only this exact generated address if signup failed before installing a session.
            if account_id is None:
                candidates = admin.auth.admin.list_users(page=1, per_page=1000)
                account_id = next((user.id for user in candidates if user.email == email), None)
            if account_id:
                admin.auth.admin.delete_user(account_id)
            results["generated_account_deleted"] = bool(account_id)
            Session.objects.filter(session_key__in=session_keys).delete()
            results["tracked_sessions_deleted"] = not Session.objects.filter(
                session_key__in=session_keys
            ).exists()
            results["checks"] = checks
            report = PROJECT.parents[1] / "docs/auth/P4_HOSTED_FLOW_RESULTS.json"
            report.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
            print(json.dumps(results), flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print("P4 hosted flow failed; see sanitized stage in the results report.", flush=True)
        sys.exit(1)
