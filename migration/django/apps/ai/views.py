import json
import logging

from django.conf import settings
from django.core.exceptions import RequestDataTooBig
from django.http import HttpRequest, JsonResponse

from apps.api.boundary import RequestBodyError, service_boundary

from .services import extract

logger = logging.getLogger(__name__)


@service_boundary
def extract_data(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
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
    result = extract(
        payload.get("userInput"),
        payload.get("formFields"),
        payload.get("currentFormData"),
        payload.get("conversation"),
    )
    return JsonResponse(result)
