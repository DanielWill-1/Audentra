import json
import logging

from django.conf import settings
from django.core.exceptions import RequestDataTooBig
from django.http import HttpRequest, JsonResponse

from apps.api.boundary import RequestBodyError, service_boundary
from apps.api.consent import has_cloud_ai_consent, missing_cloud_ai_consent_response
from apps.voice import services as voice_services

from .services import AIProviderError, extract

logger = logging.getLogger(__name__)


@service_boundary
def extract_data(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    if not settings.USE_MOCK_AI and not has_cloud_ai_consent(request):
        return missing_cloud_ai_consent_response()
    if request.content_type != "application/json":
        return JsonResponse({"error": "Content-Type must be application/json"}, status=415)
    try:
        body = request.body
        if len(body) > settings.P3_MAX_REQUEST_BYTES:
            raise RequestBodyError("Request body too large", 413)
        payload = json.loads(body.decode("utf-8"))
    except RequestDataTooBig:
        return JsonResponse({"error": "Request body too large"}, status=413)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"error": "Malformed JSON body"}, status=400)
    except RequestBodyError as error:
        return JsonResponse({"error": str(error)}, status=error.status)
    if not isinstance(payload, dict):
        return JsonResponse({"error": "JSON body must be an object"}, status=400)

    logger.info("p3_service_request endpoint=ai_extract input=json")
    try:
        result = extract(
            payload.get("userInput"),
            payload.get("formFields"),
            payload.get("currentFormData"),
            payload.get("conversation"),
        )
    except AIProviderError:
        return JsonResponse({"error": "AI extraction is temporarily unavailable"}, status=503)
    raw_form_fields = payload.get("formFields")
    form_fields = (
        [item for item in raw_form_fields if isinstance(item, dict)]
        if isinstance(raw_form_fields, list)
        else []
    )
    current = payload.get("currentFormData")
    current_data = current if isinstance(current, dict) else {}
    extracted = result.get("extractedData")
    if isinstance(extracted, dict):
        updated, rejected = voice_services.apply_validated_extraction(
            extracted, form_fields, current_data
        )
        result["extractedData"] = {}
        for field in form_fields:
            field_id = field.get("id")
            if (
                isinstance(field_id, str)
                and field_id in updated
                and updated[field_id] != current_data.get(field_id)
            ):
                result["extractedData"][field_id] = updated[field_id]
        if rejected:
            result["response"] = voice_services.validation_question(rejected[0])
    return JsonResponse(result)
