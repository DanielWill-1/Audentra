import json
import logging

from django.conf import settings
from django.core.exceptions import RequestDataTooBig, TooManyFieldsSent, TooManyFilesSent
from django.http import HttpRequest, JsonResponse
from django.http.multipartparser import MultiPartParserError

from apps.api.boundary import RequestBodyError, service_boundary
from apps.api.consent import has_cloud_ai_consent, missing_cloud_ai_consent_response

from .exceptions import SpeechProviderError
from .services import (
    AudioInputError,
    TextInputError,
    synthesize_speech,
    transcribe_audio,
    validate_multipart_audio,
)

logger = logging.getLogger(__name__)


def _read_json(request: HttpRequest) -> dict[str, object]:
    if request.content_type != "application/json":
        raise RequestBodyError("Content-Type must be application/json", 415)
    try:
        body = request.body
    except RequestDataTooBig as error:
        raise RequestBodyError("Request body too large", 413) from error
    if len(body) > settings.P3_MAX_REQUEST_BYTES:
        raise RequestBodyError("Request body too large", 413)
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RequestBodyError("Malformed JSON body") from error
    if not isinstance(payload, dict):
        raise RequestBodyError("JSON body must be an object")
    return payload


def _request_audio(request: HttpRequest) -> tuple[bytes, str, str]:
    if request.content_type == "multipart/form-data":
        try:
            uploaded = request.FILES.get("audio")
            mime_type = request.POST.get("mimeType", "")
            if uploaded is None:
                raise AudioInputError("Missing audio or mimeType in request body")
            audio, mime_type = validate_multipart_audio(uploaded, mime_type)
            return audio, mime_type, "multipart"
        except (
            MultiPartParserError,
            RequestDataTooBig,
            TooManyFieldsSent,
            TooManyFilesSent,
        ) as error:
            status = 413 if isinstance(error, RequestDataTooBig) else 400
            raise RequestBodyError("Malformed multipart body", status) from error
    raise RequestBodyError("Audio uploads must use multipart/form-data", 415)


@service_boundary
def transcribe(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    if settings.SPEECH_BACKEND != "mock" and not has_cloud_ai_consent(request):
        return missing_cloud_ai_consent_response()
    try:
        audio, mime_type, input_contract = _request_audio(request)
        logger.info("p3_service_request endpoint=transcribe input=%s", input_contract)
        transcript = transcribe_audio(audio, mime_type)
        return JsonResponse({"transcript": transcript})
    except RequestBodyError as error:
        return JsonResponse({"error": str(error)}, status=error.status)
    except AudioInputError as error:
        return JsonResponse({"error": str(error)}, status=400)
    except SpeechProviderError as error:
        logger.warning("P3 transcription provider failed (%s).", type(error).__name__)
        messages = {
            400: "The audio request was rejected. Check the recording and try again.",
            401: "Speech provider authentication failed. Check the server configuration.",
            413: "The recording is too large to transcribe.",
            415: "This recording format is not supported.",
            429: "The speech provider limit was reached. Try again later.",
            503: "Groq speech is not configured on this server.",
            504: "Transcription took too long. Try a shorter recording.",
        }
        return JsonResponse(
            {"error": messages.get(error.status, "Failed to transcribe audio")},
            status=error.status,
        )
    except Exception as error:
        logger.warning("P3 transcription failed (%s).", type(error).__name__)
        return JsonResponse({"error": "Failed to transcribe audio"}, status=500)


@service_boundary
def synthesize(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    if settings.TTS_BACKEND != "mock" and not has_cloud_ai_consent(request):
        return missing_cloud_ai_consent_response()
    try:
        payload = _read_json(request)
        logger.info("p3_service_request endpoint=tts input=json")
        result = synthesize_speech(
            payload.get("text"), payload.get("voice"), payload.get("options")
        )
        return JsonResponse(result)
    except RequestBodyError as error:
        return JsonResponse({"error": str(error)}, status=error.status)
    except TextInputError as error:
        return JsonResponse({"error": str(error)}, status=400)
    except SpeechProviderError as error:
        logger.warning("P3 text-to-speech provider failed (%s).", type(error).__name__)
        messages = {
            400: "The response is too long or cannot be spoken by this voice.",
            401: "Speech provider authentication failed. Check the server configuration.",
            429: "The speech provider limit was reached. Try again later.",
            503: "Groq speech is not configured on this server.",
            504: "Speech generation took too long. Try again.",
        }
        return JsonResponse(
            {"error": messages.get(error.status, "Failed to generate speech")},
            status=error.status,
        )
    except Exception as error:
        logger.warning("P3 text-to-speech failed (%s).", type(error).__name__)
        return JsonResponse({"error": "Failed to generate speech"}, status=500)
