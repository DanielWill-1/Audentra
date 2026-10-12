import json
from time import time
from typing import Any, cast
from unittest.mock import patch

import pytest
from apps.accounts.services.tokens import AUTH_SESSION_KEY
from apps.accounts.sessions import SessionStore
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.http import HttpResponse
from django.test import Client, override_settings

SUBJECT = "00000000-0000-4000-8000-000000000001"
ORIGIN = "http://127.0.0.1:8000"
MARKER = "fixture-p8-marker"


def _client_with_session(*, expired: bool = False) -> Client:
    client = Client(enforce_csrf_checks=True, HTTP_HOST="127.0.0.1:8000")
    client.get("/login/")
    now = int(time())
    store = SessionStore()
    store[AUTH_SESSION_KEY] = {
        "version": 1,
        "subject": SUBJECT,
        "email": "synthetic@example.test",
        "user_metadata": {},
        "access_token": "synthetic-access-token",
        "refresh_token": "synthetic-refresh-token",
        "access_expires_at": now + 3600,
        "absolute_expires_at": now - 1 if expired else now + 3600,
        "remember_me": False,
        "generation": 1,
    }
    store.create()
    assert store.session_key
    client.cookies[settings.SESSION_COOKIE_NAME] = store.session_key
    return client


def _post_audio(
    client: Client, csrf: str, *, origin: str = ORIGIN, marker: str = MARKER
) -> HttpResponse:
    return cast(
        HttpResponse,
        client.post(
            "/api/transcribe/",
            {
                "audio": SimpleUploadedFile("recording.webm", b"synthetic-audio"),
                "mimeType": "audio/webm;codecs=opus",
            },
            HTTP_ORIGIN=origin,
            HTTP_X_INTERNAL_API_TOKEN=marker,
            HTTP_X_CSRFTOKEN=csrf,
        ),
    )


@pytest.mark.django_db
def test_session_csrf_multipart_reaches_transcriber_without_authorization_header() -> None:
    client = _client_with_session()
    csrf = client.cookies[settings.CSRF_COOKIE_NAME].value
    identity: tuple[str, str, dict[str, Any]] = (SUBJECT, "synthetic@example.test", {})
    received: list[tuple[bytes, str]] = []

    def transcribe(audio: bytes, mime_type: str) -> str:
        received.append((audio, mime_type))
        return "Deterministic transcript"

    with (
        override_settings(
            P3_SERVICES_ENABLED=True,
            P3_ALLOWED_ORIGINS=[ORIGIN],
            P3_API_MARKER=MARKER,
        ),
        patch("apps.accounts.services.tokens.GoTrueClient.get_user", return_value=identity),
        patch("apps.api.middleware.authenticate_bearer") as bearer,
        patch("apps.speech.views.transcribe_audio", side_effect=transcribe),
    ):
        response = _post_audio(client, csrf)

    assert response.status_code == 200
    assert json.loads(response.content) == {"transcript": "Deterministic transcript"}
    assert received == [(b"synthetic-audio", "audio/webm;codecs=opus")]
    bearer.assert_not_called()
    assert "HTTP_AUTHORIZATION" not in client.defaults


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("case", "expected_status"),
    [
        ("missing-session", 401),
        ("expired-session", 401),
        ("wrong-csrf", 403),
        ("wrong-origin", 403),
        ("missing-marker", 403),
    ],
)
def test_session_multipart_rejections_never_reach_transcriber(
    case: str, expected_status: int
) -> None:
    client = Client(enforce_csrf_checks=True, HTTP_HOST="127.0.0.1:8000")
    client.get("/login/")
    csrf = client.cookies[settings.CSRF_COOKIE_NAME].value
    if case == "expired-session":
        client = _client_with_session(expired=True)
        csrf = client.cookies[settings.CSRF_COOKIE_NAME].value
    elif case != "missing-session":
        client = _client_with_session()
        csrf = client.cookies[settings.CSRF_COOKIE_NAME].value

    kwargs = {
        "origin": "http://attacker.invalid" if case == "wrong-origin" else ORIGIN,
        "marker": "" if case == "missing-marker" else MARKER,
    }
    csrf_header = "wrong-csrf" if case == "wrong-csrf" else csrf
    identity: tuple[str, str, dict[str, Any]] = (SUBJECT, "synthetic@example.test", {})

    with (
        override_settings(
            P3_SERVICES_ENABLED=True,
            P3_ALLOWED_ORIGINS=[ORIGIN],
            P3_API_MARKER=MARKER,
        ),
        patch("apps.accounts.services.tokens.GoTrueClient.get_user", return_value=identity),
        patch("apps.speech.views.transcribe_audio") as transcribe,
    ):
        response = _post_audio(client, csrf_header, **kwargs)

    assert response.status_code == expected_status
    transcribe.assert_not_called()
