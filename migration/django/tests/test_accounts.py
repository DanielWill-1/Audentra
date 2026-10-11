from time import time
from typing import Any, cast
from unittest.mock import Mock, patch
from uuid import UUID

import httpx
import pytest
from apps.accounts.principals import SupabaseUser
from apps.accounts.services.gotrue import AuthServiceError, AuthTokens, GoTrueClient, parse_tokens
from apps.accounts.services.tokens import AUTH_SESSION_KEY, authenticate_session
from apps.accounts.sessions import SessionStore
from django.conf import settings
from django.contrib.sessions.backends.base import UpdateError
from django.contrib.sessions.models import Session
from django.test import Client, RequestFactory, override_settings

SUBJECT = "00000000-0000-4000-8000-000000000001"
ACCESS = "synthetic-access-token"
REFRESH = "synthetic-refresh-token"
DJANGO_ORIGIN = "http://127.0.0.1:8000"
VITE_ORIGIN = "http://localhost:5173"
MARKER = "voiceform-p3"


def principal(subject: str = SUBJECT) -> SupabaseUser:
    return SupabaseUser(UUID(subject), "synthetic@example.test", {"first_name": "Test"})


def tokens(*, access: str = ACCESS, refresh: str = REFRESH) -> AuthTokens:
    return AuthTokens(
        subject=SUBJECT,
        email="synthetic@example.test",
        user_metadata={"first_name": "Test"},
        access_token=access,
        refresh_token=refresh,
        expires_at=int(time()) + 3600,
    )


def make_session(client: Client) -> str:
    store = SessionStore()
    store[AUTH_SESSION_KEY] = {
        "version": 1,
        "subject": SUBJECT,
        "email": "synthetic@example.test",
        "user_metadata": {},
        "access_token": ACCESS,
        "refresh_token": REFRESH,
        "access_expires_at": int(time()) + 3600,
        "absolute_expires_at": int(time()) + 3600,
        "remember_me": False,
        "generation": 1,
    }
    store.create()
    key = store.session_key
    assert key is not None
    client.cookies[settings.SESSION_COOKIE_NAME] = key
    return key


def service_client(*, origin: str = VITE_ORIGIN, bearer: str | None = ACCESS) -> Client:
    client = Client(
        HTTP_HOST="127.0.0.1:8000",
        HTTP_ORIGIN=origin,
        HTTP_X_INTERNAL_API_TOKEN=MARKER,
    )
    if bearer is not None:
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {bearer}"
    return client


@pytest.mark.django_db
def test_independent_session_stores_preserve_newer_auth_and_do_not_resurrect_logout() -> None:
    original = SessionStore()
    original[AUTH_SESSION_KEY] = {"generation": 1, "access_token": "old"}
    original.create()
    key = original.session_key
    stale = SessionStore(session_key=key)
    assert stale[AUTH_SESSION_KEY]["generation"] == 1

    current = SessionStore(session_key=key)
    current[AUTH_SESSION_KEY] = {"generation": 2, "access_token": "new"}
    current.save()
    stale["unrelated"] = "write"
    stale.save()

    assert SessionStore(session_key=key).load()[AUTH_SESSION_KEY] == {
        "generation": 2,
        "access_token": "new",
    }
    original.delete()
    stale["late_write"] = True
    with pytest.raises(UpdateError):
        stale.save()
    assert not Session.objects.filter(session_key=key).exists()


@pytest.mark.django_db
def test_refresh_rotates_pair_without_extending_absolute_expiry_or_losing_stale_writes() -> None:
    store = SessionStore()
    absolute_expiry = int(time()) + 3000
    store[AUTH_SESSION_KEY] = {
        "version": 1,
        "subject": SUBJECT,
        "email": "synthetic@example.test",
        "user_metadata": {},
        "access_token": "old-access",
        "refresh_token": "old-refresh",
        "access_expires_at": int(time()) + 1,
        "absolute_expires_at": absolute_expiry,
        "remember_me": True,
        "generation": 4,
    }
    store.create()
    stale = SessionStore(session_key=store.session_key)
    request = RequestFactory().get("/")
    cast(Any, request).session = SessionStore(session_key=store.session_key)
    auth = Mock()
    auth.refresh.return_value = tokens(access="new-access", refresh="new-refresh")
    auth.get_user.return_value = (SUBJECT, "synthetic@example.test", {"first_name": "Test"})

    assert authenticate_session(request, client=auth) == principal()
    rotated = SessionStore(session_key=store.session_key).load()[AUTH_SESSION_KEY]
    assert rotated["access_token"] == "new-access"
    assert rotated["refresh_token"] == "new-refresh"
    assert rotated["generation"] == 5
    assert rotated["absolute_expires_at"] == absolute_expiry

    stale["unrelated"] = "kept"
    stale.save()
    latest = SessionStore(session_key=store.session_key).load()
    assert latest["unrelated"] == "kept"
    assert latest[AUTH_SESSION_KEY]["generation"] == 5
    assert latest[AUTH_SESSION_KEY]["refresh_token"] == "new-refresh"


def test_sdk_client_uses_public_key_and_password_payload_without_persisting_identity() -> None:
    import json

    requests: list[httpx.Request] = []
    session_payload = {
        "access_token": ACCESS,
        "refresh_token": REFRESH,
        "expires_in": 3600,
        "token_type": "bearer",
        "user": {
            "id": SUBJECT,
            "email": "synthetic@example.test",
            "user_metadata": {"first_name": "Test"},
            "app_metadata": {},
            "aud": "authenticated",
            "created_at": "2026-10-10T00:00:00Z",
        },
    }

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=session_payload)

    client = GoTrueClient(transport=httpx.MockTransport(respond))
    with override_settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_PUBLISHABLE_KEY="sb_publishable_test",
        AUTH_TIMEOUT_SECONDS=2,
    ):
        first = client.sign_in("synthetic@example.test", "correct horse battery staple")
        second = client.sign_in("other@example.test", "different password")

    assert first.subject == second.subject == SUBJECT
    assert len(requests) == 2
    assert requests[0].method == "POST"
    assert requests[0].url.params["grant_type"] == "password"
    assert requests[0].headers["apikey"] == "sb_publishable_test"
    assert ACCESS not in requests[1].headers.get("Authorization", "")
    assert json.loads(requests[0].read())["email"] == "synthetic@example.test"
    assert json.loads(requests[1].read())["email"] == "other@example.test"


@pytest.mark.django_db
def test_login_uses_opaque_browser_cookie_and_rotates_csrf() -> None:
    client = Client(enforce_csrf_checks=True)
    initial = client.get("/login/")
    csrf_before = client.cookies[settings.CSRF_COOKIE_NAME].value
    with patch("apps.accounts.views.GoTrueClient") as auth:
        auth.return_value.sign_in.return_value = tokens()
        response = client.post(
            "/login/",
            {
                "email": "synthetic@example.test",
                "password": "correct horse battery staple",
                "next": "https://attacker.invalid/",
            },
            HTTP_X_CSRFTOKEN=csrf_before,
        )

    assert initial.status_code == 200
    assert response.status_code == 302
    assert response["Location"] == "/auth/session/"
    session_cookie = response.cookies[settings.SESSION_COOKIE_NAME]
    assert session_cookie["httponly"]
    assert session_cookie["samesite"] == "Lax"
    assert not session_cookie["max-age"]
    assert session_cookie.value != ACCESS
    assert response.cookies[settings.CSRF_COOKIE_NAME].value != csrf_before
    stored = SessionStore(session_key=session_cookie.value).load()[AUTH_SESSION_KEY]
    assert stored["access_token"] == ACCESS
    assert stored["refresh_token"] == REFRESH
    assert ACCESS.encode() not in response.content


@pytest.mark.django_db
def test_remember_me_issues_persistent_cookie_with_the_same_absolute_cap() -> None:
    client = Client(enforce_csrf_checks=True)
    csrf = client.get("/login/").cookies[settings.CSRF_COOKIE_NAME].value
    before = int(time())
    with patch("apps.accounts.views.GoTrueClient") as auth:
        auth.return_value.sign_in.return_value = tokens()
        response = client.post(
            "/login/",
            {
                "email": "synthetic@example.test",
                "password": "correct horse battery staple",
                "remember_me": "on",
            },
            HTTP_X_CSRFTOKEN=csrf,
        )

    cookie = response.cookies[settings.SESSION_COOKIE_NAME]
    assert response.status_code == 302
    assert int(cookie["max-age"]) == 14 * 24 * 60 * 60
    assert cookie["httponly"]
    assert cookie["samesite"] == "Lax"
    stored = SessionStore(session_key=cookie.value).load()[AUTH_SESSION_KEY]
    assert stored["remember_me"] is True
    cap = 14 * 24 * 60 * 60
    assert before + cap <= stored["absolute_expires_at"] <= int(time()) + cap


def test_login_rate_limit_is_sanitized_and_returns_429() -> None:
    client = Client()
    with patch("apps.accounts.views.GoTrueClient") as auth:
        auth.return_value.sign_in.side_effect = AuthServiceError(
            "upstream response contains private details", kind="rate_limited"
        )
        response = client.post(
            "/login/",
            {"email": "synthetic@example.test", "password": "wrong"},
        )

    assert response.status_code == 429
    assert b"Too many attempts" in response.content
    assert b"private details" not in response.content


def test_django_auth_pages_do_not_render_browser_auth_storage_or_tokens() -> None:
    client = Client()
    for path in ("/login/", "/signup/", "/forgot-password/", "/change-password/"):
        response = client.get(path)
        assert response["Cache-Control"] == "no-store"
        assert response["Referrer-Policy"] == "no-referrer"
        assert b"localStorage" not in response.content
        assert b"sb-" not in response.content
        assert ACCESS.encode() not in response.content
        assert REFRESH.encode() not in response.content


@pytest.mark.django_db
def test_logout_clears_local_session_even_when_gotrue_is_unavailable() -> None:
    client = Client(enforce_csrf_checks=True)
    csrf = client.get("/login/").cookies[settings.CSRF_COOKIE_NAME].value
    key = make_session(client)
    with (
        patch("apps.accounts.middleware.authenticate_session", return_value=principal()),
        patch("apps.accounts.services.tokens.GoTrueClient") as auth,
    ):
        auth.return_value.sign_out_local.side_effect = AuthServiceError("offline")
        response = client.post("/logout/", HTTP_X_CSRFTOKEN=csrf)

    assert response.status_code == 503
    assert b"Signed out locally" in response.content
    assert not Session.objects.filter(session_key=key).exists()
    assert response.cookies[settings.SESSION_COOKIE_NAME]["max-age"] == 0


def test_api_requires_identity_after_marker_and_allowed_origin() -> None:
    with (
        override_settings(
            P3_SERVICES_ENABLED=True,
            P3_ALLOWED_ORIGINS=[VITE_ORIGIN, DJANGO_ORIGIN],
        ),
        patch("apps.api.middleware.authenticate_bearer") as verify,
    ):
        no_identity = Client(
            HTTP_HOST="127.0.0.1:8000",
            HTTP_ORIGIN=VITE_ORIGIN,
            HTTP_X_INTERNAL_API_TOKEN=MARKER,
        ).post("/api/tts/", {"text": "hello"}, content_type="application/json")
        wrong_origin = service_client(origin="http://attacker.invalid").post(
            "/api/tts/", {"text": "hello"}, content_type="application/json"
        )
        malformed = service_client(bearer="bad token").post(
            "/api/tts/", {"text": "hello"}, content_type="application/json"
        )

    assert no_identity.status_code == 401
    assert wrong_origin.status_code == 403
    assert malformed.status_code == 401
    assert verify.call_count == 0


def test_bearer_only_api_call_is_verified_cors_readable_and_does_not_create_session() -> None:
    with (
        override_settings(
            P3_SERVICES_ENABLED=True,
            P3_ALLOWED_ORIGINS=[VITE_ORIGIN],
            TTS_BACKEND="mock",
        ),
        patch("apps.api.middleware.authenticate_bearer", return_value=principal()),
    ):
        response = service_client().post(
            "/api/tts/", {"text": "hello"}, content_type="application/json"
        )

    assert response.status_code == 200
    assert response["Access-Control-Allow-Origin"] == VITE_ORIGIN
    assert settings.SESSION_COOKIE_NAME not in response.cookies


@pytest.mark.django_db
def test_session_api_requires_csrf_and_valid_matching_bearer_keeps_csrf() -> None:
    client = Client(enforce_csrf_checks=True)
    key = make_session(client)
    with patch("apps.accounts.middleware.authenticate_session", return_value=principal()):
        csrf_page = client.get("/auth/session/")
    csrf = client.cookies[settings.CSRF_COOKIE_NAME].value
    assert csrf_page.status_code == 200

    with (
        override_settings(
            P3_SERVICES_ENABLED=True,
            P3_ALLOWED_ORIGINS=[VITE_ORIGIN, DJANGO_ORIGIN],
            TTS_BACKEND="mock",
        ),
        patch("apps.accounts.middleware.authenticate_session", return_value=principal()),
        patch("apps.api.middleware.authenticate_session", return_value=principal()),
        patch("apps.api.middleware.authenticate_bearer", return_value=principal()),
    ):
        no_csrf = client.post(
            "/api/tts/",
            {"text": "hello"},
            content_type="application/json",
            HTTP_HOST="127.0.0.1:8000",
            HTTP_ORIGIN=DJANGO_ORIGIN,
            HTTP_X_INTERNAL_API_TOKEN=MARKER,
            HTTP_AUTHORIZATION=f"Bearer {ACCESS}",
        )
        with_csrf = client.post(
            "/api/tts/",
            {"text": "hello"},
            content_type="application/json",
            HTTP_HOST="127.0.0.1:8000",
            HTTP_ORIGIN=DJANGO_ORIGIN,
            HTTP_X_INTERNAL_API_TOKEN=MARKER,
            HTTP_AUTHORIZATION=f"Bearer {ACCESS}",
            HTTP_X_CSRFTOKEN=csrf,
        )

    assert no_csrf.status_code == 403
    assert no_csrf["Access-Control-Allow-Origin"] == DJANGO_ORIGIN
    assert with_csrf.status_code == 200
    assert Session.objects.filter(session_key=key).exists()


@pytest.mark.django_db
def test_invalid_bearer_never_falls_back_and_conflicting_identity_is_rejected() -> None:
    client = Client()
    make_session(client)
    with (
        override_settings(P3_SERVICES_ENABLED=True, P3_ALLOWED_ORIGINS=[VITE_ORIGIN]),
        patch(
            "apps.api.middleware.authenticate_bearer",
            side_effect=AuthServiceError("invalid", kind="invalid"),
        ),
        patch("apps.api.middleware.authenticate_session", return_value=principal()) as session_auth,
    ):
        invalid_bearer = client.post(
            "/api/tts/",
            {"text": "hello"},
            content_type="application/json",
            HTTP_HOST="127.0.0.1:8000",
            HTTP_ORIGIN=VITE_ORIGIN,
            HTTP_X_INTERNAL_API_TOKEN=MARKER,
            HTTP_AUTHORIZATION=f"Bearer {ACCESS}",
        )
    assert invalid_bearer.status_code == 401
    session_auth.assert_not_called()

    with (
        override_settings(P3_SERVICES_ENABLED=True, P3_ALLOWED_ORIGINS=[VITE_ORIGIN]),
        patch("apps.api.middleware.authenticate_bearer", return_value=principal()),
        patch(
            "apps.api.middleware.authenticate_session",
            return_value=principal("00000000-0000-4000-8000-000000000002"),
        ),
    ):
        mismatch = client.post(
            "/api/tts/",
            {"text": "hello"},
            content_type="application/json",
            HTTP_HOST="127.0.0.1:8000",
            HTTP_ORIGIN=VITE_ORIGIN,
            HTTP_X_INTERNAL_API_TOKEN=MARKER,
            HTTP_AUTHORIZATION=f"Bearer {ACCESS}",
        )
    assert mismatch.status_code == 403
    assert mismatch.json() == {"error": "Credentials identify different users"}


def test_api_verifier_outage_and_unknown_preflight_header_fail_without_provider_call() -> None:
    with (
        override_settings(P3_SERVICES_ENABLED=True, P3_ALLOWED_ORIGINS=[VITE_ORIGIN]),
        patch(
            "apps.api.middleware.authenticate_bearer",
            side_effect=AuthServiceError("offline"),
        ) as verify,
    ):
        unavailable = service_client().post(
            "/api/tts/", {"text": "hello"}, content_type="application/json"
        )
        preflight = Client(HTTP_HOST="127.0.0.1:8000").options(
            "/api/tts/",
            HTTP_ORIGIN=VITE_ORIGIN,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS=(
                "content-type, x-internal-api-token, authorization, x-unknown"
            ),
        )

    assert unavailable.status_code == 503
    assert unavailable["Access-Control-Allow-Origin"] == VITE_ORIGIN
    assert preflight.status_code == 403
    verify.assert_called_once()


@pytest.mark.django_db
def test_signup_provisions_profile_before_session_without_confirmation() -> None:
    client = Client()
    with (
        patch("apps.accounts.views.GoTrueClient") as auth,
        patch("apps.accounts.views.ensure_profile") as ensure_profile,
    ):
        auth.return_value.sign_up.return_value = {
            "access_token": ACCESS,
            "refresh_token": REFRESH,
            "expires_in": 3600,
            "user": {"id": SUBJECT, "email": "synthetic@example.test", "user_metadata": {}},
        }
        response = client.post(
            "/signup/",
            {
                "first_name": "Test",
                "last_name": "Account",
                "email": "synthetic@example.test",
                "password": "correct horse battery staple",
                "confirm_password": "correct horse battery staple",
            },
        )

    assert response.status_code == 302
    assert response["Location"] == "/auth/session/"
    auth.return_value.sign_up.assert_called_once_with(
        "synthetic@example.test",
        "correct horse battery staple",
        {"first_name": "Test", "last_name": "Account"},
    )
    assert client.session[AUTH_SESSION_KEY]["subject"] == SUBJECT
    assert b"confirmation email" not in response.content.lower()
    ensure_profile.assert_called_once()
    assert str(ensure_profile.call_args.args[0].id) == SUBJECT


def test_forgotten_password_is_honest_and_does_not_send_email() -> None:
    with patch("apps.accounts.views.GoTrueClient") as auth:
        page = Client().get("/forgot-password/")
        submitted = Client().post("/forgot-password/", {"email": "synthetic@example.test"})
    assert page.status_code == submitted.status_code == 200
    assert b"Email recovery unavailable" in page.content
    assert b"on its way" not in submitted.content
    auth.assert_not_called()


def test_password_change_requires_verified_session() -> None:
    with patch("apps.accounts.views.GoTrueClient") as auth:
        response = Client().post(
            "/change-password/",
            {"password": "new secure passphrase", "confirm_password": "new secure passphrase"},
        )
    assert response.status_code == 302
    assert response["Location"].startswith("/login?next=")
    auth.assert_not_called()


@pytest.mark.parametrize("expires_in", [True, float("inf"), float("nan"), 0, -1, "3600"])
def test_malformed_auth_expiry_is_rejected(expires_in: object) -> None:
    with pytest.raises(AuthServiceError):
        parse_tokens(
            {
                "access_token": ACCESS,
                "refresh_token": REFRESH,
                "expires_in": expires_in,
                "user": {"id": SUBJECT},
            }
        )


def test_gotrue_rate_limits_timeouts_and_malformed_replies_are_sanitized() -> None:
    def rate_limited(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"message": "private upstream detail"})

    with override_settings(
        SUPABASE_URL="https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY="sb_publishable_test"
    ):
        with pytest.raises(AuthServiceError) as rate_error:
            GoTrueClient(transport=httpx.MockTransport(rate_limited)).sign_in("a@b.test", "bad")
        assert rate_error.value.kind == "rate_limited"
        assert "private upstream detail" not in str(rate_error.value)

        def timeout(_request: httpx.Request) -> httpx.Response:
            raise httpx.TimeoutException("private timeout detail")

        with pytest.raises(AuthServiceError) as timeout_error:
            GoTrueClient(transport=httpx.MockTransport(timeout)).sign_in("a@b.test", "bad")
        assert timeout_error.value.kind == "unavailable"
        assert "private timeout detail" not in str(timeout_error.value)

        def malformed(_request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, content=b"not json")

        with pytest.raises(AuthServiceError) as malformed_error:
            GoTrueClient(transport=httpx.MockTransport(malformed)).sign_in("a@b.test", "bad")
        assert "not json" not in str(malformed_error.value)


def test_gotrue_rejects_invalid_provider_origins_before_network_access() -> None:
    transport = Mock()
    with override_settings(
        SUPABASE_URL="https://[", SUPABASE_PUBLISHABLE_KEY="sb_publishable_test"
    ):
        with pytest.raises(AuthServiceError, match="origin is invalid"):
            GoTrueClient(transport=transport).sign_in("a@b.test", "bad")
    transport.handle_request.assert_not_called()
