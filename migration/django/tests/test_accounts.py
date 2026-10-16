from time import time
from typing import Any, cast
from unittest.mock import Mock, patch
from uuid import UUID

import httpx
import pytest
from apps.accounts.forms import SignupForm
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
    assert response["Location"] == "/dashboard"
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
def test_authenticated_login_and_signup_pages_redirect_to_dashboard() -> None:
    client = Client()
    make_session(client)
    with patch("apps.accounts.services.tokens.GoTrueClient") as auth:
        auth.return_value.get_user.return_value = (
            SUBJECT,
            "synthetic@example.test",
            {"first_name": "Test"},
        )
        for path in ("/login/", "/signup/"):
            response = client.get(path)
            assert response.status_code == 302
            assert response["Location"] == "/dashboard"

    assert auth.return_value.get_user.call_count == 2


def test_signup_requires_source_required_name_fields() -> None:
    form = SignupForm(
        data={
            "first_name": "",
            "last_name": "",
            "email": "synthetic@example.test",
            "password": "correct horse battery staple",
            "confirm_password": "correct horse battery staple",
            "accepted_terms": "on",
        }
    )

    assert not form.is_valid()
    assert set(form.errors) >= {"first_name", "last_name"}


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
        assert response["Referrer-Policy"] == "same-origin"
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
        signup_values = {
            "first_name": "Test",
            "last_name": "Account",
            "email": "synthetic@example.test",
            "password": "correct horse battery staple",
            "confirm_password": "correct horse battery staple",
        }
        missing_acceptance = client.post("/signup/", signup_values)
        assert missing_acceptance.status_code == 400
        auth.return_value.sign_up.assert_not_called()
        response = client.post("/signup/", {**signup_values, "accepted_terms": "on"})

    assert response.status_code == 302
    assert response["Location"] == "/dashboard"
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
