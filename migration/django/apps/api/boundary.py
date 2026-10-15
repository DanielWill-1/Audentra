from collections.abc import Callable
from functools import wraps
from hmac import compare_digest
from ipaddress import ip_address
from typing import cast
from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import DisallowedHost
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils.cache import patch_vary_headers

from .throttling import allow_request

ALLOWED_REQUEST_HEADERS = {"content-type", "x-internal-api-token", "authorization"}
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


def _origin_from_url(value: str) -> str | None:
    try:
        parsed = urlsplit(value)
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            return None
        if parsed.username or parsed.password or parsed.path not in {"", "/"}:
            return None
        if parsed.query or parsed.fragment:
            return None
        port = parsed.port
        default_port = (parsed.scheme == "http" and port in {None, 80}) or (
            parsed.scheme == "https" and port in {None, 443}
        )
        host = parsed.hostname.lower()
        return (
            f"{parsed.scheme.lower()}://{host}"
            if default_port
            else f"{parsed.scheme.lower()}://{host}:{port}"
        )
    except ValueError:
        return None


def _allowed_origin(value: str | None, *, referer: bool = False) -> str | None:
    if not value:
        return None
    if referer:
        try:
            parsed = urlsplit(value)
            if parsed.username or parsed.password or not parsed.netloc:
                return None
            value = f"{parsed.scheme}://{parsed.netloc}"
        except ValueError:
            return None
    actual = _origin_from_url(value)
    if actual is None:
        return None
    allowed = {_origin_from_url(item) for item in settings.P3_ALLOWED_ORIGINS}
    return actual if actual in allowed else None


def _json_error(message: str, status: int) -> JsonResponse:
    return JsonResponse({"error": message}, status=status)


def cors_response(request: HttpRequest, response: HttpResponse) -> HttpResponse:
    origin = request.META.get("P4_SERVICE_ORIGIN")
    if origin:
        response["Access-Control-Allow-Origin"] = origin
        patch_vary_headers(response, ("Origin",))
    return response


def _preflight(request: HttpRequest, origin: str) -> HttpResponse:
    requested_method = request.headers.get("Access-Control-Request-Method", "").upper()
    requested_headers = {
        item.strip().lower()
        for item in request.headers.get("Access-Control-Request-Headers", "").split(",")
        if item.strip()
    }
    if requested_method != "POST" or not requested_headers.issubset(ALLOWED_REQUEST_HEADERS):
        return cors_response(request, _json_error("CORS preflight rejected", 403))

    response = HttpResponse(status=204)
    response["Access-Control-Allow-Origin"] = origin
    response["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response["Access-Control-Allow-Headers"] = "Content-Type, X-Internal-Api-Token, Authorization"
    response["Access-Control-Max-Age"] = "600"
    patch_vary_headers(response, ("Origin",))
    return response


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
    """Validate and cache network limits before service auth and CSRF checks."""
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
            else:
                origin = _allowed_origin(request.headers.get("Origin"))
                if origin is None:
                    response = _json_error("Origin not allowed", 403)
                else:
                    request.META["P4_SERVICE_ORIGIN"] = origin
                    referer = request.headers.get("Referer")
                    if referer and _allowed_origin(referer, referer=True) != origin:
                        response = cors_response(
                            request, _json_error("Referer origin mismatch", 403)
                        )
                    elif request.method == "OPTIONS":
                        response = _preflight(request, origin)
                    elif request.method != "POST":
                        response = _json_error("Method not allowed", 405)
                        response["Allow"] = "POST, OPTIONS"
                        response = cors_response(request, response)
                    else:
                        supplied_marker = request.headers.get("X-Internal-Api-Token", "")
                        if not settings.P3_API_MARKER or not compare_digest(
                            supplied_marker, settings.P3_API_MARKER
                        ):
                            response = cors_response(
                                request, _json_error("Request marker required", 403)
                            )
                        else:
                            length = request.META.get("CONTENT_LENGTH", "")
                            if length:
                                try:
                                    too_large = int(length) > settings.P3_MAX_REQUEST_BYTES
                                except ValueError:
                                    response = cors_response(
                                        request, _json_error("Invalid content length", 400)
                                    )
                                else:
                                    response = None
                                    if too_large:
                                        response = cors_response(
                                            request, _json_error("Request body too large", 413)
                                        )
                            else:
                                response = None
                            if response is None and not allow_request(
                                request.META.get("REMOTE_ADDR", "unknown")
                            ):
                                response = _json_error("Rate limit exceeded", 429)
                                response["Retry-After"] = str(settings.P3_RATE_LIMIT_WINDOW_SECONDS)
                                response = cors_response(request, response)
    request.META["P4_BOUNDARY_RESPONSE"] = response
    return response


def service_boundary(
    view: Callable[[HttpRequest], HttpResponse],
) -> Callable[[HttpRequest], HttpResponse]:
    """Apply the opt-in loopback-dev origin, marker and request boundary."""

    @wraps(view)
    def wrapped(request: HttpRequest) -> HttpResponse:
        rejection = check_service_boundary(request)
        if rejection is not None:
            return rejection
        return cors_response(request, view(request))

    return cast(Callable[[HttpRequest], HttpResponse], wrapped)
