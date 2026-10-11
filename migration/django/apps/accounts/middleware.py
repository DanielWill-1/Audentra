from collections.abc import Callable
from typing import Any, Literal, cast

from django.conf import settings
from django.contrib.sessions.backends.base import UpdateError
from django.contrib.sessions.middleware import SessionMiddleware
from django.http import HttpRequest, HttpResponse

from apps.accounts.principals import AnonymousSupabaseUser
from apps.accounts.services.gotrue import AuthServiceError
from apps.accounts.services.tokens import AUTH_SESSION_KEY, authenticate_session


def _is_service_request(request: HttpRequest) -> bool:
    return request.path_info.startswith("/api/")


def _requires_verified_principal(request: HttpRequest) -> bool:
    return request.path_info in {
        "/login",
        "/login/",
        "/signup",
        "/signup/",
        "/forgot-password",
        "/forgot-password/",
        "/auth/session/",
        "/change-password",
        "/change-password/",
        *settings.P7_PUBLIC_SESSION_ROUTES,
        *settings.P7_PROTECTED_PATHS,
    }


class SupabasePrincipalMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        cast(Any, request).user = AnonymousSupabaseUser()
        request.META["P4_AUTH_UNAVAILABLE"] = False
        if not _is_service_request(request) and _requires_verified_principal(request):
            try:
                principal = authenticate_session(request)
            except AuthServiceError:
                principal = None
                request.META["P4_AUTH_UNAVAILABLE"] = True
            if principal is not None:
                cast(Any, request).user = principal
        response = self.get_response(request)
        if (
            request.path_info.startswith(
                (
                    "/auth/",
                    "/login/",
                    "/signup/",
                    "/forgot-password/",
                    "/reset-password",
                    "/change-password/",
                    "/logout/",
                )
            )
            or request.path_info in settings.P7_PROTECTED_PATHS
        ):
            response["Cache-Control"] = "no-store"
            response["Referrer-Policy"] = "no-referrer"
        return response


class SessionCookiePolicyMiddleware:
    """Use a browser-session cookie while retaining its bounded server record."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        name = settings.SESSION_COOKIE_NAME
        if name in response.cookies:
            auth_data = request.session.get(AUTH_SESSION_KEY)
            if isinstance(auth_data, dict) and not auth_data.get("remember_me", False):
                response.set_cookie(
                    name,
                    response.cookies[name].value,
                    max_age=None,
                    expires=None,
                    path=settings.SESSION_COOKIE_PATH,
                    domain=settings.SESSION_COOKIE_DOMAIN,
                    secure=settings.SESSION_COOKIE_SECURE,
                    httponly=settings.SESSION_COOKIE_HTTPONLY,
                    samesite=cast(
                        Literal["Lax", "Strict", "None", False],
                        settings.SESSION_COOKIE_SAMESITE,
                    ),
                )
                response.cookies[name]["max-age"] = ""
                response.cookies[name]["expires"] = ""
        return response


class SafeSessionMiddleware(SessionMiddleware):
    """Do not recreate a server session deleted while an older request was running."""

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        try:
            return super().process_response(request, response)
        except UpdateError:
            response.delete_cookie(
                settings.SESSION_COOKIE_NAME,
                path=settings.SESSION_COOKIE_PATH,
                domain=settings.SESSION_COOKIE_DOMAIN,
                samesite=cast(
                    Literal["Lax", "Strict", "None", False],
                    settings.SESSION_COOKIE_SAMESITE,
                ),
            )
            return response
