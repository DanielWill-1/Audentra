import base64
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import UUID

import pytest
from apps.accounts.principals import SupabaseUser
from apps.speech.backends import google, mock
from apps.speech.services import (
    AudioInputError,
    TextInputError,
    clean_tts_text,
    synthesize_speech,
    transcribe_audio,
    validate_audio,
    validate_multipart_audio,
)
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, override_settings
from google.api_core import exceptions as google_exceptions
from google.cloud import speech_v1

from tests.reference_contracts import (
    mounted_stt_request,
    mounted_transcript,
    mounted_tts_request,
    mounted_tts_success,
)

ORIGIN = "http://localhost:5173"
HOST = "127.0.0.1:8000"
MARKER = "voiceform-p3"


@pytest.fixture(autouse=True)
def clear_boundary_state(monkeypatch: pytest.MonkeyPatch) -> None:
    from apps.api.throttling import clear_rate_limits

    clear_rate_limits()
    monkeypatch.setattr(
        "apps.api.middleware.authenticate_bearer",
        lambda _token: SupabaseUser(
            id=UUID("00000000-0000-4000-8000-000000000001"),
            email="synthetic@example.test",
            user_metadata={},
        ),
    )


def service_client() -> Client:
    return Client(
        HTTP_HOST=HOST,
        HTTP_ORIGIN=ORIGIN,
        HTTP_X_INTERNAL_API_TOKEN=MARKER,
        HTTP_AUTHORIZATION="Bearer synthetic-access",
    )


def test_legacy_audio_data_url_checks_and_decodes_strictly() -> None:
    assert validate_audio("data:audio/webm;base64,YWJj", "audio/webm") == (
        b"abc",
        "audio/webm",
    )
    with pytest.raises(AudioInputError, match="format"):
        validate_audio("YWJj", "audio/webm")
    with pytest.raises(AudioInputError, match="base64"):
        validate_audio("data:audio/webm;base64,not base64", "audio/webm")


def test_audio_character_cap_and_multipart_byte_cap() -> None:
    with override_settings(P3_MAX_BASE64_CHARS=4, P3_MAX_AUDIO_BYTES=3):
        with pytest.raises(AudioInputError, match="too large"):
            validate_audio("data:audio/webm;base64,YWJjZA==", "audio/webm")
        upload = SimpleUploadedFile("audio.webm", b"abcd", content_type="audio/webm")
        with pytest.raises(AudioInputError, match="too large"):
            validate_multipart_audio(upload, "audio/webm")


def test_multipart_empty_audio_is_rejected() -> None:
    upload = SimpleUploadedFile("audio.webm", b"", content_type="audio/webm")
    with pytest.raises(AudioInputError, match="empty"):
        validate_multipart_audio(upload, "audio/webm")


def test_mock_transcription_is_deterministic_and_empty_provider_result_falls_back() -> None:
    audio, mime_type = validate_audio("data:audio/webm;base64,YWJj", "audio/webm")
    assert transcribe_audio(audio, mime_type, use_mock=True).startswith("This is a mock")
    assert transcribe_audio(audio, mime_type, backend=lambda _audio, _mime: "") == (
        "Transcription failed"
    )


@pytest.mark.parametrize(
    ("mime_type", "encoding", "sample_rate"),
    [
        ("audio/wav", "LINEAR16", 16000),
        ("audio/x-wav", "LINEAR16", 16000),
        ("audio/webm", "WEBM_OPUS", 48000),
        ("audio/ogg", "OGG_OPUS", 48000),
        ("audio/mp3", "MP3", None),
        ("audio/mpeg", "MP3", None),
        ("audio/flac", "FLAC", None),
        ("audio/unknown", "ENCODING_UNSPECIFIED", None),
    ],
)
def test_google_stt_request_preserves_mounted_route_configuration(
    mime_type: str, encoding: str, sample_rate: int | None
) -> None:
    response = speech_v1.RecognizeResponse(
        results=[
            speech_v1.SpeechRecognitionResult(
                alternatives=[speech_v1.SpeechRecognitionAlternative(transcript="one")]
            ),
            speech_v1.SpeechRecognitionResult(
                alternatives=[speech_v1.SpeechRecognitionAlternative(transcript="two")]
            ),
        ]
    )
    mock_client = SimpleNamespace(recognize=Mock(return_value=response), close=Mock())
    with (
        patch("apps.speech.backends.google._credentials", return_value=None),
        patch("apps.speech.backends.google.speech_v1.SpeechClient", return_value=mock_client),
    ):
        assert google.transcribe(b"abc", mime_type) == mounted_transcript([["one"], ["two"]])
    request = mock_client.recognize.call_args.kwargs["request"]
    expected_config = mounted_stt_request("YWJj", mime_type)["config"]
    assert isinstance(expected_config, dict)
    assert request.audio.content == b"abc"
    assert request.config.encoding.name == expected_config["encoding"] == encoding
    assert request.config.language_code == expected_config["languageCode"]
    assert (
        request.config.enable_automatic_punctuation is expected_config["enableAutomaticPunctuation"]
    )
    assert request.config.sample_rate_hertz == expected_config.get("sampleRateHertz", 0)
    assert (expected_config.get("sampleRateHertz") or None) == sample_rate
    assert mock_client.recognize.call_args.kwargs["timeout"] > 0
    assert mock_client.recognize.call_args.kwargs["retry"] is None
    mock_client.close.assert_called_once()


def test_tts_ascii_filter_and_terminal_punctuation() -> None:
    assert clean_tts_text("  Héllo—   world\u00a0!") == "Hllo world !"
    assert clean_tts_text("Already finished?") == "Already finished?"
    assert clean_tts_text("plain text") == "plain text."
    assert clean_tts_text("!!!") == "!!!"
    with pytest.raises(TextInputError, match="5000"):
        clean_tts_text("a" * 5001)
    assert clean_tts_text("😀" * 2499 + "aa") == "aa."
    with pytest.raises(TextInputError, match="5000"):
        clean_tts_text("😀" * 2500 + "a")
    with pytest.raises(TextInputError, match="required"):
        clean_tts_text("")


def test_tts_js_falsy_defaults_and_legacy_metadata() -> None:
    received: dict[str, object] = {}

    def synthesize(text: str, voice: dict[str, object], options: dict[str, object]) -> bytes:
        received.update(text=text, voice=voice, options=options)
        return b"synthetic-mp3-fixture"

    result = synthesize_speech(
        "Hello",
        {"name": "", "languageCode": "en-GB"},
        {"audioEncoding": "", "speakingRate": 0, "pitch": 0},
        backend=synthesize,
    )
    expected = mounted_tts_request(
        "Hello.",
        {"name": "", "languageCode": "en-GB"},
        {"audioEncoding": "", "speakingRate": 0, "pitch": 0},
    )
    expected_voice = expected["voice"]
    expected_audio = expected["audioConfig"]
    assert isinstance(expected_voice, dict)
    assert isinstance(expected_audio, dict)
    assert received["text"] == expected["input"]["text"]
    assert received["voice"] == {
        "language_code": expected_voice["languageCode"],
        "name": expected_voice["name"],
        "ssml_gender": expected_voice["ssmlGender"],
    }
    assert received["options"] == {
        "audio_encoding": expected_audio["audioEncoding"],
        "speaking_rate": expected_audio["speakingRate"],
        "pitch": expected_audio["pitch"],
        "volume_gain_db": expected_audio["volumeGainDb"],
        "effects_profile_id": expected_audio["effectsProfileId"],
    }
    assert result == mounted_tts_success(
        b"synthetic-mp3-fixture", "Hello.", "en-US-Neural2-D", "MP3"
    )


def test_default_mock_audio_is_an_mp3_fixture_for_the_browser() -> None:
    assert mock.MOCK_AUDIO.startswith(b"ID3")
    response = synthesize_speech("Test playback", use_mock=True)
    assert base64.b64decode(response["audioContent"]) == mock.MOCK_AUDIO


def test_google_tts_constructs_legacy_voice_and_audio_request() -> None:
    mock_client = SimpleNamespace(
        synthesize_speech=Mock(return_value=SimpleNamespace(audio_content=b"fixture-mp3")),
        close=Mock(),
    )
    with (
        patch("apps.speech.backends.google._credentials", return_value=None),
        patch(
            "apps.speech.backends.google.texttospeech_v1.TextToSpeechClient",
            return_value=mock_client,
        ),
    ):
        audio = google.synthesize(
            "Hello.",
            {
                "language_code": "en-US",
                "name": "en-US-Neural2-D",
                "ssml_gender": "MALE",
            },
            {
                "audio_encoding": "MP3",
                "speaking_rate": 1.0,
                "pitch": 0.0,
                "volume_gain_db": 0.0,
                "effects_profile_id": [],
            },
        )
    request = mock_client.synthesize_speech.call_args.kwargs["request"]
    assert audio == b"fixture-mp3"
    assert request.input.text == "Hello."
    assert request.voice.name == "en-US-Neural2-D"
    assert request.audio_config.audio_encoding.name == "MP3"
    assert mock_client.synthesize_speech.call_args.kwargs["timeout"] > 0
    assert mock_client.synthesize_speech.call_args.kwargs["retry"] is None
    mock_client.close.assert_called_once()


@pytest.mark.parametrize(
    ("error_type", "expected_status"),
    [
        (google_exceptions.InvalidArgument, 400),
        (google_exceptions.ResourceExhausted, 429),
        (google_exceptions.Unauthenticated, 401),
    ],
)
def test_google_tts_sdk_errors_keep_mounted_http_status(
    error_type: type[Exception], expected_status: int
) -> None:
    mock_client = SimpleNamespace(
        synthesize_speech=Mock(side_effect=error_type("synthetic provider failure")),
        close=Mock(),
    )
    with (
        override_settings(P3_SERVICES_ENABLED=True, TTS_BACKEND="google"),
        patch("apps.speech.backends.google._credentials", return_value=None),
        patch(
            "apps.speech.backends.google.texttospeech_v1.TextToSpeechClient",
            return_value=mock_client,
        ),
    ):
        response = service_client().post(
            "/api/tts/", {"text": "Hello"}, content_type="application/json"
        )

    assert response.status_code == expected_status
    assert "synthetic provider failure" not in response.content.decode()
    assert mock_client.synthesize_speech.call_args.kwargs["retry"] is None
    mock_client.close.assert_called_once()


def test_service_endpoints_accept_both_contracts_and_slash_forms() -> None:
    payload = {"audio": "data:audio/webm;base64,YWJj", "mimeType": "audio/webm"}
    with override_settings(P3_SERVICES_ENABLED=True):
        for route in ("/api/transcribe", "/api/transcribe/"):
            response = service_client().post(route, payload, content_type="application/json")
            assert response.status_code == 200
            assert response.json()["transcript"].startswith("This is a mock")

        response = service_client().post(
            "/api/transcribe/",
            {"audio": SimpleUploadedFile("sample.webm", b"abc"), "mimeType": "audio/webm"},
        )
        assert response.status_code == 200
        assert response.json()["transcript"].startswith("This is a mock")

        for route in ("/api/tts", "/api/tts/"):
            response = service_client().post(
                route, {"text": "Hello"}, content_type="application/json"
            )
            assert response.status_code == 200
            assert response.json()["metadata"]["voice"] == "en-US-Neural2-D"

        for route in ("/api/ai/extract", "/api/ai/extract/"):
            response = service_client().post(
                route,
                {
                    "userInput": "Hello",
                    "formFields": [{"id": "name", "label": "Name", "type": "text"}],
                    "currentFormData": {},
                    "conversation": [],
                },
                content_type="application/json",
            )
            assert response.status_code == 200
            assert response.json()["extractedData"]["email"] == "test@example.com"


def test_service_boundary_rejects_missing_disallowed_and_mismatched_origin() -> None:
    with override_settings(P3_SERVICES_ENABLED=True):
        no_origin = Client(HTTP_HOST=HOST, HTTP_X_INTERNAL_API_TOKEN=MARKER)
        no_origin_response = no_origin.post(
            "/api/tts/", {"text": "hi"}, content_type="application/json"
        )
        assert no_origin_response.status_code == 403

        blocked = Client(
            HTTP_HOST=HOST,
            HTTP_ORIGIN="http://localhost.attacker.invalid",
            HTTP_X_INTERNAL_API_TOKEN=MARKER,
        )
        blocked_response = blocked.post(
            "/api/tts/", {"text": "hi"}, content_type="application/json"
        )
        assert blocked_response.status_code == 403

        mismatch = service_client()
        response = mismatch.post(
            "/api/tts/",
            {"text": "hi"},
            content_type="application/json",
            HTTP_REFERER="http://127.0.0.1:5173/voice",
        )
        assert response.status_code == 403


def test_service_boundary_requires_marker_and_valid_host() -> None:
    with override_settings(P3_SERVICES_ENABLED=True):
        missing_marker = Client(HTTP_HOST=HOST, HTTP_ORIGIN=ORIGIN)
        assert (
            missing_marker.post(
                "/api/tts/", {"text": "hi"}, content_type="application/json"
            ).status_code
            == 403
        )
        bad_host = Client(
            HTTP_HOST="attacker.invalid",
            HTTP_ORIGIN=ORIGIN,
            HTTP_X_INTERNAL_API_TOKEN=MARKER,
        )
        assert (
            bad_host.post("/api/tts/", {"text": "hi"}, content_type="application/json").status_code
            == 400
        )

        remote = Client(
            HTTP_HOST=HOST,
            HTTP_ORIGIN=ORIGIN,
            HTTP_X_INTERNAL_API_TOKEN=MARKER,
            REMOTE_ADDR="192.0.2.10",
            HTTP_X_FORWARDED_FOR="127.0.0.1",
        )
        assert (
            remote.post("/api/tts/", {"text": "hi"}, content_type="application/json").status_code
            == 403
        )


def test_service_preflight_and_rate_limit() -> None:
    with override_settings(P3_SERVICES_ENABLED=True):
        response = Client(HTTP_HOST=HOST).options(
            "/api/tts/",
            HTTP_ORIGIN=ORIGIN,
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type, x-internal-api-token, authorization",
        )
        assert response.status_code == 204
        assert response["Access-Control-Allow-Origin"] == ORIGIN
        assert "Authorization" in response["Access-Control-Allow-Headers"]
        assert "Access-Control-Allow-Credentials" not in response

    with override_settings(P3_SERVICES_ENABLED=True, P3_RATE_LIMIT_REQUESTS=0):
        limited = service_client().post(
            "/api/tts/", {"text": "hi"}, content_type="application/json"
        )
        assert limited.status_code == 429
        assert limited["Retry-After"] == "60"


def test_disabled_services_and_oversized_request_are_rejected() -> None:
    disabled = service_client().post("/api/tts/", {"text": "hi"}, content_type="application/json")
    assert disabled.status_code == 404
    with override_settings(P3_SERVICES_ENABLED=True, P3_MAX_REQUEST_BYTES=10):
        oversized = service_client().post(
            "/api/tts/",
            b"{}",
            content_type="application/json",
            CONTENT_LENGTH="11",
        )
        assert oversized.status_code == 413


def test_malformed_json_and_api_errors_are_sanitized() -> None:
    with override_settings(P3_SERVICES_ENABLED=True):
        malformed = service_client().post("/api/tts/", b"{bad", content_type="application/json")
        assert malformed.status_code == 400
        invalid_audio = service_client().post(
            "/api/transcribe/",
            {"audio": "no-comma", "mimeType": "audio/webm"},
            content_type="application/json",
        )
        assert invalid_audio.status_code == 400


def test_p3_logs_contract_kind_without_audio_payload() -> None:
    with override_settings(P3_SERVICES_ENABLED=True), patch("apps.speech.views.logger.info") as log:
        payload = {"audio": "data:audio/webm;base64,YWJj", "mimeType": "audio/webm"}
        response = service_client().post(
            "/api/transcribe/", payload, content_type="application/json"
        )
    assert response.status_code == 200
    assert log.call_args.args == ("p3_service_request endpoint=transcribe input=%s", "legacy_json")
    assert "YWJj" not in str(log.call_args)
