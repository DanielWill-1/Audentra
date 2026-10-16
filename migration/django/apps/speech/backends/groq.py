from email.message import Message
from typing import Any

import httpx
from django.conf import settings

from ..exceptions import SpeechProviderError

GROQ_API_ROOT = "https://api.groq.com/openai/v1"
AUDIO_EXTENSIONS = {
    "audio/flac": ("flac", "audio/flac"),
    "audio/mp3": ("mp3", "audio/mpeg"),
    "audio/mpeg": ("mp3", "audio/mpeg"),
    "audio/mp4": ("mp4", "audio/mp4"),
    "audio/m4a": ("m4a", "audio/mp4"),
    "audio/x-m4a": ("m4a", "audio/mp4"),
    "audio/mpga": ("mpga", "audio/mpeg"),
    "audio/ogg": ("ogg", "audio/ogg"),
    "audio/wav": ("wav", "audio/wav"),
    "audio/x-wav": ("wav", "audio/wav"),
    "audio/webm": ("webm", "audio/webm"),
}
PROVIDER_STATUSES = {400: 400, 401: 401, 413: 413, 429: 429}


def _provider_error_status(status: int) -> int:
    if status in PROVIDER_STATUSES:
        return PROVIDER_STATUSES[status]
    if status >= 500:
        return 502
    return 502


def _configured() -> None:
    if not settings.GROQ_API_KEY:
        raise SpeechProviderError("Groq speech credentials are unavailable", status=503)


def _mime_details(mime_type: str) -> tuple[str, str]:
    parsed = Message()
    parsed["content-type"] = mime_type
    content_type = parsed.get_content_type().lower()
    details = AUDIO_EXTENSIONS.get(content_type)
    if details is None:
        raise SpeechProviderError("Unsupported audio format", status=415)
    extension, normalized_mime = details
    return extension, normalized_mime


def _post(endpoint: str, *, json: dict[str, object] | None = None,
          data: dict[str, str] | None = None,
          files: dict[str, tuple[str, bytes, str]] | None = None) -> httpx.Response:
    _configured()
    try:
        with httpx.Client(timeout=settings.GROQ_AUDIO_TIMEOUT_SECONDS) as client:
            response = client.post(
                f"{GROQ_API_ROOT}{endpoint}",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json=json,
                data=data,
                files=files,
            )
    except httpx.TimeoutException as error:
        raise SpeechProviderError("Groq speech request timed out", status=504) from error
    except httpx.HTTPError as error:
        raise SpeechProviderError("Groq speech request failed") from error
    if response.is_error:
        raise SpeechProviderError(
            "Groq speech request was rejected",
            status=_provider_error_status(response.status_code),
        )
    return response


def transcribe(audio: bytes, mime_type: str) -> str:
    extension, normalized_mime = _mime_details(mime_type)
    data = {"model": settings.GROQ_STT_MODEL, "response_format": "json"}
    if settings.GROQ_STT_LANGUAGE:
        data["language"] = settings.GROQ_STT_LANGUAGE
    response = _post(
        "/audio/transcriptions",
        data=data,
        files={"file": (f"recording.{extension}", audio, normalized_mime)},
    )
    try:
        result: Any = response.json()
    except ValueError as error:
        raise SpeechProviderError("Groq returned an invalid transcription response") from error
    transcript = result.get("text") if isinstance(result, dict) else None
    if not isinstance(transcript, str) or not transcript.strip():
        raise SpeechProviderError("Groq returned an empty transcription")
    return transcript.strip()


def synthesize(text: str, voice: dict[str, object], _options: dict[str, object]) -> bytes:
    if len(text) > 200:
        raise SpeechProviderError("Orpheus accepts at most 200 characters per request", status=400)
    voice_id = voice.get("name") or settings.GROQ_TTS_VOICE
    response = _post(
        "/audio/speech",
        json={
            "model": settings.GROQ_TTS_MODEL,
            "input": text,
            "voice": str(voice_id),
            "response_format": "wav",
        },
    )
    if not response.content:
        raise SpeechProviderError("Groq returned empty audio")
    return response.content
