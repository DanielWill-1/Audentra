import re
from collections.abc import Callable
from typing import Any, cast

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.http.response import HttpResponseBase
from django.middleware.csrf import CsrfViewMiddleware

from apps.accounts.principals import AnonymousSupabaseUser, SupabaseUser
from apps.accounts.services.gotrue import AuthServiceError
from apps.accounts.services.tokens import (
    AUTH_SESSION_KEY,
    authenticate_bearer,
    authenticate_session,
)

from .boundary import SERVICE_PATHS, check_service_boundary, cors_response

BEARER_PATTERN = re.compile(r"Bearer ([A-Za-z0-9._~+/=-]+)", re.IGNORECASE)


def _error(request: HttpRequest, detail: str, status: int) -> HttpResponse:
    return cors_response(request, JsonResponse({"error": detail}, status=status))


class ServiceCsrfMiddleware(CsrfViewMiddleware):
    """Keep normal Django CSRF checks and tightly scope the verified bearer exception."""

    def process_view(  # type: ignore[override]
        self,
        request: HttpRequest,
        callback: Callable[..., HttpResponseBase],
        callback_args: tuple[Any, ...],
        callback_kwargs: dict[str, Any],
    ) -> HttpResponse | None:
        if request.path_info not in SERVICE_PATHS:
            return cast(
                HttpResponse | None,
                super().process_view(request, callback, callback_args, callback_kwargs),
            )

        boundary_error = check_service_boundary(request)
        if boundary_error is not None:
            return boundary_error
        if request.method == "OPTIONS":
            return cast(HttpResponse | None, request.META["P4_BOUNDARY_RESPONSE"])

        auth_header = request.headers.get("Authorization")
        bearer_user: SupabaseUser | None = None
        if auth_header is not None:
            match = BEARER_PATTERN.fullmatch(auth_header)
            if match is None:
                return _error(request, "A valid bearer token is required", 401)
            try:
                bearer_user = authenticate_bearer(match.group(1))
            except AuthServiceError as error:
                if error.kind == "invalid":
                    return _error(request, "Authentication required", 401)
                return _error(request, "Authentication service unavailable", 503)

        session_user: SupabaseUser | None = None
        stored = request.session.get(AUTH_SESSION_KEY)
        if isinstance(stored, dict):
            try:
                session_user = authenticate_session(request)
            except AuthServiceError:
                request.META["P4_AUTH_UNAVAILABLE"] = True
                return _error(request, "Authentication service unavailable", 503)

        if (
            bearer_user is not None
            and session_user is not None
            and bearer_user.id != session_user.id
        ):
            return _error(request, "Credentials identify different users", 403)
        principal = bearer_user or session_user
        if principal is None:
            cast(Any, request).user = AnonymousSupabaseUser()
            return _error(request, "Authentication required", 401)
        cast(Any, request).user = principal

        has_session_cookie = settings.SESSION_COOKIE_NAME in request.COOKIES
        if bearer_user is not None and session_user is None and not has_session_cookie:
            return None

        csrf_response = cast(
            HttpResponse | None,
            super().process_view(request, callback, callback_args, callback_kwargs),
        )
        if csrf_response is not None:
            return _error(request, "CSRF verification failed", 403)
        return None
