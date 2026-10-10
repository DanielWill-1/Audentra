import base64
import binascii
from base64 import b64encode
from collections.abc import Callable
from typing import Any

from django.conf import settings

from .backends import mock

Transcriber = Callable[[bytes, str], str]
Synthesizer = Callable[[str, dict[str, object], dict[str, object]], bytes]


class AudioInputError(ValueError):
    pass


class TextInputError(ValueError):
    pass


def validate_audio(audio: object, mime_type: object) -> tuple[bytes, str]:
    if not isinstance(audio, str) or not audio or not isinstance(mime_type, str) or not mime_type:
        raise AudioInputError("Missing audio or mimeType in request body")
    if "," not in audio:
        raise AudioInputError("Invalid audio data format: Base64 content is missing.")
    content = audio.split(",", 1)[1]
    if len(content) > settings.P3_MAX_BASE64_CHARS:
        raise AudioInputError("Audio file too large")
    try:
        decoded = base64.b64decode(content, validate=True)
    except (ValueError, binascii.Error) as error:
        raise AudioInputError("Invalid base64 audio data") from error
    if not decoded:
        raise AudioInputError("Audio content is empty")
    return decoded, mime_type


def validate_multipart_audio(audio: Any, mime_type: str) -> tuple[bytes, str]:
    if not mime_type:
        raise AudioInputError("Missing audio or mimeType in request body")
    content = audio.read(settings.P3_MAX_AUDIO_BYTES + 1)
    if not content:
        raise AudioInputError("Audio content is empty")
    if len(content) > settings.P3_MAX_AUDIO_BYTES:
        raise AudioInputError("Audio file too large")
    return content, mime_type


def transcribe_audio(
    audio: bytes,
    mime_type: str,
    *,
    backend: Transcriber | None = None,
    use_mock: bool | None = None,
) -> str:
    mock_selected = settings.SPEECH_BACKEND == "mock" if use_mock is None else use_mock
    if backend is None and not mock_selected and settings.SPEECH_BACKEND != "google":
        raise RuntimeError("SPEECH_BACKEND must be mock or google")
    selected = backend or (mock.transcribe if mock_selected else None)
    if selected is None:
        from .backends.google import transcribe

        selected = transcribe
    result = selected(audio, mime_type)
    return result or "Transcription failed"


def clean_tts_text(text: object) -> str:
    import re

    if not isinstance(text, str) or not text:
        raise TextInputError("Text is required")
    if not text.strip():
        raise TextInputError("Text cannot be empty")
    if len(text.encode("utf-16-le", errors="surrogatepass")) // 2 > 5000:
        raise TextInputError("Text too long (max 5000 characters)")

    js_whitespace = (
        r"\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a"
        r"\u2028\u2029\u202f\u205f\u3000\ufeff"
    )
    cleaned = re.sub(f"[{js_whitespace}]+", " ", text).strip(
        "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680"
        "\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009"
        "\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
    )
    allowed = (
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_"
        "\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029"
        "\u202f\u205f\u3000\ufeff.,!?;:()\\-'\""
    )
    cleaned = re.sub(f"[^{allowed}]", "", cleaned)
    if not re.search(r"[.!?]$", cleaned):
        cleaned += "."
    return cleaned


def _js_or(value: Any, default: Any) -> Any:
    if value is None or value is False or value == "" or value == 0:
        return default
    if isinstance(value, float) and value != value:
        return default
    return value


def _mapping(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _provider_tts_config(voice: Any, options: Any) -> tuple[dict[str, object], dict[str, object]]:
    voice = _mapping(voice)
    options = _mapping(options)
    voice_config = {
        "language_code": _js_or(voice.get("languageCode"), "en-US"),
        "name": _js_or(voice.get("name"), "en-US-Neural2-D"),
        "ssml_gender": _js_or(voice.get("ssmlGender"), "MALE"),
    }
    audio_config = {
        "audio_encoding": _js_or(options.get("audioEncoding"), "MP3"),
        "speaking_rate": _js_or(options.get("speakingRate"), 1.0),
        "pitch": _js_or(options.get("pitch"), 0.0),
        "volume_gain_db": _js_or(options.get("volumeGainDb"), 0.0),
        "effects_profile_id": _js_or(options.get("effectsProfileId"), []),
    }
    return voice_config, audio_config


def synthesize_speech(
    text: object,
    voice: Any = None,
    options: Any = None,
    *,
    backend: Synthesizer | None = None,
    use_mock: bool | None = None,
) -> dict[str, Any]:
    clean_text = clean_tts_text(text)
    voice_config, audio_config = _provider_tts_config(voice, options)
    selected_mock = settings.TTS_BACKEND == "mock" if use_mock is None else use_mock
    if backend is None and not selected_mock and settings.TTS_BACKEND != "google":
        raise RuntimeError("TTS_BACKEND must be mock or google")
    selected = backend or (mock.synthesize if selected_mock else None)
    if selected is None:
        from .backends.google import synthesize

        selected = synthesize
    audio_content = selected(clean_text, voice_config, audio_config)
    if not audio_content:
        raise RuntimeError("No audio content generated")
    encoded_audio = b64encode(audio_content).decode("ascii")
    return {
        "audioContent": encoded_audio,
        "metadata": {
            "textLength": len(clean_text),
            "audioSize": len(encoded_audio),
            "voice": voice_config["name"],
            "encoding": audio_config["audio_encoding"],
        },
    }
