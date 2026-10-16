from collections.abc import Callable
from typing import Any, cast

from django.http import HttpRequest, HttpResponse, JsonResponse
from django.http.response import HttpResponseBase
from django.middleware.csrf import CsrfViewMiddleware

from apps.accounts.principals import AnonymousSupabaseUser, SupabaseUser
from apps.accounts.services.gotrue import AuthServiceError
from apps.accounts.services.tokens import authenticate_session

from .boundary import SERVICE_PATHS, check_service_boundary


def _error(detail: str, status: int) -> HttpResponse:
    return JsonResponse({"error": detail}, status=status)


class ServiceCsrfMiddleware(CsrfViewMiddleware):
    """Require a verified Django session and normal CSRF checks for service POSTs."""

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
        if request.headers.get("Authorization") is not None:
            return _error("Authorization headers are not supported", 400)

        try:
            principal: SupabaseUser | None = authenticate_session(request)
        except AuthServiceError:
            request.META["P4_AUTH_UNAVAILABLE"] = True
            return _error("Authentication service unavailable", 503)
        if principal is None:
            cast(Any, request).user = AnonymousSupabaseUser()
            return _error("Authentication required", 401)
        cast(Any, request).user = principal

        csrf_response = cast(
            HttpResponse | None,
            super().process_view(request, callback, callback_args, callback_kwargs),
        )
        if csrf_response is not None:
            return _error("CSRF verification failed", 403)
        return None
