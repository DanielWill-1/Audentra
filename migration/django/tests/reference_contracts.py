"""Source-derived oracle for mounted Express speech requests; not a live differential run."""

from __future__ import annotations

import base64
import json
from typing import Any

SOURCE_REVISION = "b66efbb"
SOURCE_FILES = (
    "legacy/server/routes/transcription.ts",
    "legacy/server/routes/tts.ts",
)
STT_ENCODINGS = {
    "audio/wav": "LINEAR16",
    "audio/x-wav": "LINEAR16",
    "audio/webm": "WEBM_OPUS",
    "audio/ogg": "OGG_OPUS",
    "audio/mp3": "MP3",
    "audio/mpeg": "MP3",
    "audio/flac": "FLAC",
}
STT_SAMPLE_RATES = {
    "audio/webm": 48000,
    "audio/ogg": 48000,
    "audio/wav": 16000,
    "audio/x-wav": 16000,
}


def mounted_stt_request(audio_content: str, mime_type: str) -> dict[str, Any]:
    config: dict[str, object] = {
        "encoding": STT_ENCODINGS.get(mime_type, "ENCODING_UNSPECIFIED"),
        "languageCode": "en-US",
        "enableAutomaticPunctuation": True,
    }
    sample_rate = STT_SAMPLE_RATES.get(mime_type)
    if sample_rate:
        config["sampleRateHertz"] = sample_rate
    return {"audio": {"content": audio_content}, "config": config}


def mounted_transcript(results: list[list[str]]) -> str:
    """First alternative per result, newline joined, with Express's empty fallback."""
    transcript = "\n".join(alternatives[0] for alternatives in results if alternatives)
    return transcript or "Transcription failed"


def _js_or(value: Any, fallback: Any) -> Any:
    if value is None or value is False or value == 0 or value == "":
        return fallback
    return value


def mounted_tts_request(
    clean_text: str,
    voice: dict[str, Any] | None = None,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    voice = voice or {}
    options = options or {}
    return {
        "input": {"text": clean_text},
        "voice": {
            "languageCode": _js_or(voice.get("languageCode"), "en-US"),
            "name": _js_or(voice.get("name"), "en-US-Neural2-D"),
            "ssmlGender": _js_or(voice.get("ssmlGender"), "MALE"),
        },
        "audioConfig": {
            "audioEncoding": _js_or(options.get("audioEncoding"), "MP3"),
            "speakingRate": _js_or(options.get("speakingRate"), 1.0),
            "pitch": _js_or(options.get("pitch"), 0.0),
            "volumeGainDb": _js_or(options.get("volumeGainDb"), 0.0),
            "effectsProfileId": _js_or(options.get("effectsProfileId"), []),
        },
    }


def mounted_tts_success(
    audio_bytes: bytes, clean_text: str, voice_name: str, encoding: str
) -> dict[str, Any]:
    audio_content = base64.b64encode(audio_bytes).decode("ascii")
    return {
        "audioContent": audio_content,
        "metadata": {
            "textLength": len(clean_text),
            "audioSize": len(audio_content),
            "voice": voice_name,
            "encoding": encoding,
        },
    }


def fixture_bundle() -> dict[str, Any]:
    tts_request = mounted_tts_request("Hello.")
    voice = tts_request["voice"]
    audio_config = tts_request["audioConfig"]
    assert isinstance(voice, dict)
    assert isinstance(audio_config, dict)
    return {
        "fixture_kind": "source-derived reference; not recorded or live provider data",
        "source_revision": SOURCE_REVISION,
        "source_files": list(SOURCE_FILES),
        "stt_request": mounted_stt_request("YWJj", "audio/webm"),
        "stt_empty_result": mounted_transcript([]),
        "tts_request": tts_request,
        "tts_success": mounted_tts_success(
            b"synthetic-mp3-fixture",
            "Hello.",
            str(voice["name"]),
            str(audio_config["audioEncoding"]),
        ),
    }


if __name__ == "__main__":
    print(json.dumps(fixture_bundle(), indent=2, sort_keys=True))
