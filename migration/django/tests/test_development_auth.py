from time import time
from unittest.mock import patch

import httpx
import jwt
import pytest
from apps.accounts.services.gotrue import AuthServiceError, GoTrueClient
from apps.accounts.services.tokens import AUTH_SESSION_KEY
from django.conf import settings
from django.contrib.sessions.models import Session
from django.db import DatabaseError
from django.test import Client, override_settings

from tests.test_accounts import ACCESS, REFRESH, SUBJECT, make_session, principal

USER = {
    "id": SUBJECT,
    "email": "synthetic@example.test",
    "user_metadata": {},
    "app_metadata": {},
    "aud": "authenticated",
    "created_at": "2026-10-10T00:00:00Z",
}


@pytest.mark.django_db
def test_authenticated_password_change_is_csrf_protected_and_signs_out() -> None:
    client = Client(enforce_csrf_checks=True)
    old_key = make_session(client)
    with (
        patch("apps.accounts.middleware.authenticate_session", return_value=principal()),
        patch("apps.accounts.views.GoTrueClient") as auth,
        patch("apps.accounts.services.tokens.GoTrueClient") as logout_auth,
    ):
        page = client.get("/change-password/")
        assert page.status_code == 200
        csrf = client.cookies[settings.CSRF_COOKIE_NAME].value
        values = {"password": "a new secure password", "confirm_password": "a new secure password"}
        assert client.post("/change-password/", values).status_code == 403
        auth.return_value.update_password.assert_not_called()
        changed = client.post(
            "/change-password/", values, HTTP_X_CSRFTOKEN=csrf, HTTP_HX_REQUEST="true"
        )
    assert changed.status_code == 200
    assert changed["HX-Redirect"] == "/login/"
    assert not Session.objects.filter(session_key=old_key).exists()
    auth.return_value.update_password.assert_called_once_with(values["password"], ACCESS, REFRESH)
    logout_auth.return_value.sign_out_local.assert_called_once_with(ACCESS)
    assert AUTH_SESSION_KEY not in client.session


@pytest.mark.django_db
def test_signup_only_needs_email_and_matching_password_and_supports_htmx() -> None:
    client = Client(enforce_csrf_checks=True)
    page = client.get("/signup/")
    assert b'hx-boost="true"' in page.content
    assert b"htmx-2.0.8.min.js" in page.content
    csrf = client.cookies[settings.CSRF_COOKIE_NAME].value
    values = {
        "email": USER["email"],
        "password": "secure passphrase",
        "confirm_password": "secure passphrase",
    }
    with (
        patch("apps.accounts.views.GoTrueClient") as auth,
        patch("apps.accounts.views.ensure_profile") as ensure_profile,
    ):
        auth.return_value.sign_up.return_value = {
            "access_token": ACCESS,
            "refresh_token": REFRESH,
            "expires_in": 3600,
            "user": USER,
        }
        assert client.post("/signup/", values).status_code == 403
        auth.return_value.sign_up.assert_not_called()
        signed_up = client.post("/signup/", values, HTTP_X_CSRFTOKEN=csrf, HTTP_HX_REQUEST="true")
    assert signed_up["HX-Redirect"] == "/auth/session/"
    assert client.session[AUTH_SESSION_KEY]["subject"] == SUBJECT
    assert client.cookies[settings.SESSION_COOKIE_NAME]["httponly"]
    assert client.cookies[settings.SESSION_COOKIE_NAME]["samesite"] == "Lax"
    ensure_profile.assert_called_once()
    assert str(ensure_profile.call_args.args[0].id) == SUBJECT


@pytest.mark.django_db
def test_signup_does_not_start_session_when_profile_provisioning_fails() -> None:
    client = Client()
    with (
        patch("apps.accounts.views.GoTrueClient") as auth,
        patch("apps.accounts.views.ensure_profile", side_effect=DatabaseError),
    ):
        auth.return_value.sign_up.return_value = {
            "access_token": ACCESS,
            "refresh_token": REFRESH,
            "expires_in": 3600,
            "user": USER,
        }
        response = client.post(
            "/signup/",
            {
                "email": USER["email"],
                "password": "secure passphrase",
                "confirm_password": "secure passphrase",
            },
        )

    assert response.status_code == 503
    assert b"account was created" in response.content
    assert AUTH_SESSION_KEY not in client.session


def test_signup_does_not_claim_success_when_confirmation_has_been_reenabled() -> None:
    with patch("apps.accounts.views.GoTrueClient") as auth:
        auth.return_value.sign_up.return_value = {"user": USER}
        response = Client().post(
            "/signup/",
            {
                "email": USER["email"],
                "password": "secure passphrase",
                "confirm_password": "secure passphrase",
            },
        )
    assert response.status_code == 503
    assert b"Confirmation required" in response.content


def test_removed_oauth_and_email_token_routes_are_not_supported() -> None:
    for path in ("/auth/oauth/google/", "/auth/callback/", "/auth/confirm/", "/reset-password/"):
        assert Client().get(path).status_code == 404
    assert Client().get("/logout/").status_code == 405
    assert "django.contrib.auth" not in settings.INSTALLED_APPS


def test_sdk_changes_password_using_verified_user_jwt_and_does_not_auto_refresh() -> None:
    access = jwt.encode(
        {"sub": SUBJECT, "exp": int(time()) + 3600},
        "test-signature-key-long-enough-32",
        algorithm="HS256",
    )
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=USER)

    with override_settings(
        SUPABASE_URL="https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY="sb_publishable_test"
    ):
        GoTrueClient(transport=httpx.MockTransport(respond)).update_password(
            "secure changed password", access, REFRESH
        )
    assert [request.method for request in requests] == ["GET", "PUT"]
    assert all(request.url.path == "/auth/v1/user" for request in requests)
    assert all(request.headers["Authorization"] == f"Bearer {access}" for request in requests)
    assert requests[-1].read() == b'{"password":"secure changed password"}'


def test_sdk_logout_revokes_supplied_user_jwt_with_public_project_key() -> None:
    requests: list[httpx.Request] = []

    def respond(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(204)

    with override_settings(
        SUPABASE_URL="https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY="sb_publishable_test"
    ):
        GoTrueClient(transport=httpx.MockTransport(respond)).sign_out_local(ACCESS)
    assert len(requests) == 1
    assert requests[0].url.params["scope"] == "local"
    assert requests[0].headers["Authorization"] == f"Bearer {ACCESS}"
    assert requests[0].headers["apikey"] == "sb_publishable_test"


def test_sdk_rejects_server_only_key_before_network_and_disables_refresh_timer() -> None:
    with override_settings(
        SUPABASE_URL="https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY="invalid-server-key"
    ):
        with patch("apps.accounts.services.gotrue.create_client") as create:
            with pytest.raises(AuthServiceError):
                GoTrueClient().sign_in("synthetic@example.test", "secure passphrase")
            create.assert_not_called()
    with override_settings(
        SUPABASE_URL="https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY="sb_publishable_test"
    ):
        with patch("apps.accounts.services.gotrue.create_client") as create:
            with GoTrueClient().sdk():
                options = create.call_args.kwargs["options"]
                assert options.persist_session is False
                assert options.auto_refresh_token is False
            assert options.httpx_client.is_closed
