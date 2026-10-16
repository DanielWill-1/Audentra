from collections.abc import Callable
from functools import wraps
from hmac import compare_digest
from ipaddress import ip_address
from typing import cast

from django.conf import settings
from django.core.exceptions import DisallowedHost
from django.http import HttpRequest, HttpResponse, JsonResponse

from .throttling import allow_request

SERVICE_PATHS = {
    "/api/transcribe",
    "/api/transcribe/",
    "/api/tts",
    "/api/tts/",
    "/api/ai/extract",
    "/api/ai/extract/",
}
PRIVATE_PROXY_HEADER = "X-VoiceForm-Proxy-Token"


class RequestBodyError(ValueError):
    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


def _json_error(message: str, status: int) -> JsonResponse:
    return JsonResponse({"error": message}, status=status)


def _private_client_is_authorized(request: HttpRequest) -> bool:
    mode = getattr(settings, "P3_SERVICE_ACCESS_MODE", "loopback")
    if mode == "loopback":
        try:
            return ip_address(request.META.get("REMOTE_ADDR", "")).is_loopback
        except ValueError:
            return False
    if mode == "trusted-proxy":
        expected = getattr(settings, "P3_PROXY_TOKEN", "")
        supplied = request.headers.get(PRIVATE_PROXY_HEADER, "")
        return len(expected) >= 32 and compare_digest(supplied, expected)
    return False


def check_service_boundary(request: HttpRequest) -> HttpResponse | None:
    """Validate and cache service availability, private access and request limits."""
    if request.META.get("P4_BOUNDARY_CHECKED"):
        return request.META.get("P4_BOUNDARY_RESPONSE")
    request.META["P4_BOUNDARY_CHECKED"] = True
    response: HttpResponse | None = None
    if not settings.P3_SERVICES_ENABLED:
        response = _json_error("Service unavailable", 404)
    else:
        try:
            request.get_host()
        except DisallowedHost:
            response = _json_error("Host not allowed", 400)
        else:
            if not _private_client_is_authorized(request):
                response = _json_error("Private service upstream required", 403)
            elif request.headers.get("X-Internal-Api-Token") is not None:
                response = _json_error("Request markers are not supported", 400)
            elif request.method != "POST":
                response = _json_error("Method not allowed", 405)
                response["Allow"] = "POST"
            else:
                length = request.META.get("CONTENT_LENGTH", "")
                if length:
                    try:
                        too_large = int(length) > settings.P3_MAX_REQUEST_BYTES
                    except ValueError:
                        response = _json_error("Invalid content length", 400)
                    else:
                        if too_large:
                            response = _json_error("Request body too large", 413)
                if response is None and not allow_request(
                    request.META.get("REMOTE_ADDR", "unknown")
                ):
                    response = _json_error("Rate limit exceeded", 429)
                    response["Retry-After"] = str(settings.P3_RATE_LIMIT_WINDOW_SECONDS)
    request.META["P4_BOUNDARY_RESPONSE"] = response
    return response


def service_boundary(
    view: Callable[[HttpRequest], HttpResponse],
) -> Callable[[HttpRequest], HttpResponse]:
    """Apply the private-upstream and request-size boundary to service views."""

    @wraps(view)
    def wrapped(request: HttpRequest) -> HttpResponse:
        rejection = check_service_boundary(request)
        if rejection is not None:
            return rejection
        return view(request)

    return cast(Callable[[HttpRequest], HttpResponse], wrapped)
