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
    selected = backend or (mock.transcribe if mock_selected else None)
    if selected is None:
        if settings.SPEECH_BACKEND == "google":
            from .backends.google import transcribe

            selected = transcribe
        elif settings.SPEECH_BACKEND == "groq":
            from .backends.groq import transcribe

            selected = transcribe
        else:
            raise RuntimeError("SPEECH_BACKEND must be mock, google, or groq")
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
    default_voice = (
        settings.GROQ_TTS_VOICE if settings.TTS_BACKEND == "groq" else "en-US-Neural2-D"
    )
    voice_config = {
        "language_code": _js_or(voice.get("languageCode"), "en-US"),
        "name": _js_or(voice.get("name"), default_voice),
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
    selected = backend or (mock.synthesize if selected_mock else None)
    if selected is None:
        if settings.TTS_BACKEND == "google":
            from .backends.google import synthesize

            selected = synthesize
        elif settings.TTS_BACKEND == "groq":
            from .backends.groq import synthesize

            selected = synthesize
        else:
            raise RuntimeError("TTS_BACKEND must be mock, google, or groq")
    groq_live = settings.TTS_BACKEND == "groq" and not selected_mock
    if groq_live and len(clean_text) > 200:
        raise TextInputError("Groq Orpheus accepts at most 200 characters per request")
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
            "encoding": "wav" if groq_live else audio_config["audio_encoding"],
        },
    }
