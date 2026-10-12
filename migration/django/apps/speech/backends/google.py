from email.message import Message
from pathlib import Path
from typing import Any

import google.auth
from django.conf import settings
from google.api_core import exceptions as google_exceptions
from google.api_core.exceptions import GoogleAPICallError
from google.cloud import speech_v1, texttospeech_v1


class SpeechProviderError(RuntimeError):
    def __init__(self, message: str, *, status: int = 502) -> None:
        super().__init__(message)
        self.status = status


ENCODING_NAMES = {
    "audio/wav": "LINEAR16",
    "audio/x-wav": "LINEAR16",
    "audio/webm": "WEBM_OPUS",
    "audio/ogg": "OGG_OPUS",
    "audio/mp3": "MP3",
    "audio/mpeg": "MP3",
    "audio/flac": "FLAC",
}
SAMPLE_RATES = {
    "audio/webm": 48000,
    "audio/ogg": 48000,
    "audio/wav": 16000,
    "audio/x-wav": 16000,
}


def _credentials() -> Any:
    credential_file = settings.GOOGLE_APPLICATION_CREDENTIALS
    try:
        if credential_file:
            resolved_path = Path(credential_file).expanduser().resolve(strict=True)
            return google.auth.load_credentials_from_file(  # type: ignore[no-untyped-call]
                str(resolved_path)
            )[0]
        return google.auth.default()[0]
    except Exception as error:
        raise SpeechProviderError("Google Cloud credentials are unavailable", status=401) from error


def _encoding_mime_type(mime_type: str) -> str:
    parsed = Message()
    parsed["content-type"] = mime_type
    base_type = parsed.get_content_type().lower()
    parameters = {
        name.lower(): value
        for name, value in (parsed.get_params() or [])[1:]
        if isinstance(name, str)
    }
    if not parameters:
        return mime_type
    if (
        base_type in {"audio/webm", "audio/ogg"}
        and set(parameters) == {"codecs"}
        and isinstance(parameters["codecs"], str)
        and parameters["codecs"].strip().lower() == "opus"
    ):
        return base_type
    raise SpeechProviderError("Unsupported audio MIME parameters", status=415)


def transcribe(audio: bytes, mime_type: str) -> str:
    encoding_mime_type = _encoding_mime_type(mime_type)
    encoding_type = getattr(
        speech_v1.RecognitionConfig.AudioEncoding,
        ENCODING_NAMES.get(encoding_mime_type, "ENCODING_UNSPECIFIED"),
    )
    config_args: dict[str, object] = {
        "encoding": encoding_type,
        "language_code": "en-US",
        "enable_automatic_punctuation": True,
    }
    sample_rate = SAMPLE_RATES.get(encoding_mime_type)
    if sample_rate:
        config_args["sample_rate_hertz"] = sample_rate
    request = speech_v1.RecognizeRequest(
        audio=speech_v1.RecognitionAudio(content=audio),
        config=speech_v1.RecognitionConfig(**config_args),
    )
    client = speech_v1.SpeechClient(credentials=_credentials())
    try:
        response = client.recognize(
            request=request, timeout=settings.P3_PROVIDER_TIMEOUT_SECONDS, retry=None
        )
    except GoogleAPICallError as error:
        raise SpeechProviderError("Google speech recognition failed") from error
    finally:
        close = getattr(client, "close", None)
        if callable(close):
            close()
    return "\n".join(
        result.alternatives[0].transcript for result in response.results if result.alternatives
    )


def synthesize(text: str, voice: dict[str, object], options: dict[str, object]) -> bytes:
    voice_config = texttospeech_v1.VoiceSelectionParams(**voice)
    audio_config = texttospeech_v1.AudioConfig(**options)
    request = texttospeech_v1.SynthesizeSpeechRequest(
        input=texttospeech_v1.SynthesisInput(text=text),
        voice=voice_config,
        audio_config=audio_config,
    )
    client = texttospeech_v1.TextToSpeechClient(credentials=_credentials())
    try:
        response = client.synthesize_speech(
            request=request, timeout=settings.P3_PROVIDER_TIMEOUT_SECONDS, retry=None
        )
    except GoogleAPICallError as error:
        mapped_status = {
            google_exceptions.InvalidArgument: 400,
            google_exceptions.ResourceExhausted: 429,
            google_exceptions.Unauthenticated: 401,
        }
        status = next(
            (
                status
                for error_type, status in mapped_status.items()
                if isinstance(error, error_type)
            ),
            502,
        )
        raise SpeechProviderError("Google text to speech failed", status=status) from error
    finally:
        close = getattr(client, "close", None)
        if callable(close):
            close()
    return bytes(response.audio_content or b"")
