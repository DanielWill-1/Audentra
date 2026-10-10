from urllib.parse import urlsplit

from django.db import DatabaseError
from django.http import HttpRequest, HttpResponse
from django.middleware.csrf import rotate_token
from django.shortcuts import redirect, render
from django.urls import Resolver404, resolve, reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from apps.accounts.forms import LoginForm, ResetPasswordForm, SignupForm
from apps.accounts.principals import AnonymousSupabaseUser
from apps.accounts.profile_services import ensure_profile
from apps.accounts.services.gotrue import AuthServiceError, AuthTokens, GoTrueClient, parse_tokens
from apps.accounts.services.tokens import (
    AUTH_SESSION_KEY,
    _principal,
    install_tokens,
    logout_session,
)

SAFE_NEXT_NAMES = {"auth-session", "change-password"}


def _template(
    request: HttpRequest, template: str, context: dict[str, object], status: int = 200
) -> HttpResponse:
    response = render(request, template, context, status=status)
    response["Cache-Control"] = "no-store"
    response["Referrer-Policy"] = "no-referrer"
    return response


def _redirect(request: HttpRequest, destination: str) -> HttpResponse:
    response = redirect(destination)
    if request.headers.get("HX-Request") == "true":
        response.status_code = 200
        response["HX-Redirect"] = response["Location"]
        del response["Location"]
    return response


def _safe_next(request: HttpRequest, candidate: str | None) -> str:
    if not candidate or "\\" in candidate or candidate.startswith("//"):
        return reverse("auth-session")
    if not url_has_allowed_host_and_scheme(
        candidate, allowed_hosts={request.get_host()}, require_https=request.is_secure()
    ):
        return reverse("auth-session")
    try:
        route = resolve(urlsplit(candidate).path)
    except Resolver404:
        return reverse("auth-session")
    return candidate if route.url_name in SAFE_NEXT_NAMES else reverse("auth-session")


def _set_authenticated_session(
    request: HttpRequest, tokens: AuthTokens, *, remember_me: bool
) -> None:
    install_tokens(request, tokens, remember_me=remember_me)
    rotate_token(request)


def _error_text(error: AuthServiceError) -> str:
    return {
        "invalid": "Those details could not be accepted. Check them and try again.",
        "rate_limited": "Too many attempts. Please wait and try again.",
    }.get(error.kind, "Authentication is temporarily unavailable. Please try again.")


def _error_status(error: AuthServiceError) -> int:
    return {"invalid": 400, "rate_limited": 429}.get(error.kind, 503)


@never_cache
@require_http_methods(["GET", "POST"])
def login(request: HttpRequest) -> HttpResponse:
    next_path = _safe_next(
        request, request.POST.get("next") if request.method == "POST" else request.GET.get("next")
    )
    if request.method == "GET" and getattr(request.user, "is_authenticated", False):
        return _redirect(request, next_path)
    form = LoginForm(request.POST if request.method == "POST" else None)
    context: dict[str, object] = {"form": form, "next": next_path}
    status = 200
    if request.method == "POST":
        status = 400
        if form.is_valid():
            try:
                tokens = GoTrueClient().sign_in(
                    form.cleaned_data["email"], form.cleaned_data["password"]
                )
            except AuthServiceError as error:
                context["error"] = _error_text(error)
                status = _error_status(error)
            else:
                _set_authenticated_session(
                    request, tokens, remember_me=form.cleaned_data["remember_me"]
                )
                return _redirect(request, next_path)
    return _template(request, "accounts/login.html", context, status)


@never_cache
@require_http_methods(["GET", "POST"])
def signup(request: HttpRequest) -> HttpResponse:
    form = SignupForm(request.POST if request.method == "POST" else None)
    context: dict[str, object] = {"form": form}
    status = 200
    if request.method == "POST":
        status = 400
        if form.is_valid():
            values = form.cleaned_data
            metadata = {name: values[name] for name in ("first_name", "last_name")}
            try:
                result = GoTrueClient().sign_up(values["email"], values["password"], metadata)
                if isinstance(result, dict) and result.get("access_token"):
                    tokens = parse_tokens(result)
                    ensure_profile(_principal(tokens.subject, tokens.email, tokens.user_metadata))
                    _set_authenticated_session(request, tokens, remember_me=False)
                    return _redirect(request, "auth-session")
            except AuthServiceError as error:
                context["error"] = _error_text(error)
                status = _error_status(error)
            except DatabaseError:
                context["error"] = (
                    "Your account was created, but profile setup is temporarily unavailable. "
                    "Please sign in again shortly."
                )
                status = 503
            else:
                return _template(
                    request,
                    "accounts/message.html",
                    {
                        "title": "Confirmation required",
                        "message": (
                            "This project requires email confirmation. Email signup must be "
                            "configured before this account can sign in."
                        ),
                    },
                    503,
                )
    return _template(request, "accounts/signup.html", context, status)


@never_cache
@require_http_methods(["GET", "POST"])
def forgot_password(request: HttpRequest) -> HttpResponse:
    # Disabled signup confirmation does not enable recovery delivery. Do not send email.
    return _template(
        request,
        "accounts/message.html",
        {
            "title": "Email recovery unavailable",
            "message": (
                "Email-based forgotten-password recovery is not configured for this development "
                "site. If you can sign in, use Change password on your account page."
            ),
        },
    )


@never_cache
@require_http_methods(["GET", "POST"])
def change_password(request: HttpRequest) -> HttpResponse:
    if request.META.get("P4_AUTH_UNAVAILABLE", False):
        return _template(
            request,
            "accounts/message.html",
            {"title": "Session unavailable", "message": "Please try again shortly."},
            503,
        )
    if not getattr(request.user, "is_authenticated", False):
        return _redirect(request, f"{reverse('login')}?next={reverse('change-password')}")
    form = ResetPasswordForm(request.POST if request.method == "POST" else None)
    context: dict[str, object] = {"form": form}
    status = 200
    if request.method == "POST":
        status = 400
        if form.is_valid():
            data = request.session[AUTH_SESSION_KEY]
            try:
                GoTrueClient().update_password(
                    form.cleaned_data["password"], data["access_token"], data["refresh_token"]
                )
            except AuthServiceError as error:
                context["error"] = _error_text(error)
                status = _error_status(error)
            else:
                logout_session(request)
                rotate_token(request)
                return _redirect(request, "login")
    return _template(request, "accounts/change_password.html", context, status)


@never_cache
@require_POST
def logout(request: HttpRequest) -> HttpResponse:
    remote_failed = logout_session(request)
    rotate_token(request)
    if remote_failed:
        return _template(
            request,
            "accounts/message.html",
            {
                "title": "Signed out locally",
                "message": (
                    "Your local session was cleared. The authentication service could not "
                    "confirm remote sign-out; please try again when it is available."
                ),
            },
            503,
        )
    return _redirect(request, "login")


@never_cache
@require_GET
def session_proof(request: HttpRequest) -> HttpResponse:
    if request.META.get("P4_AUTH_UNAVAILABLE", False):
        return _template(
            request,
            "accounts/message.html",
            {
                "title": "Session unavailable",
                "message": ("Authentication is temporarily unavailable. Try again shortly."),
            },
            503,
        )
    user = getattr(request, "user", AnonymousSupabaseUser())
    if not getattr(user, "is_authenticated", False):
        return _redirect(request, f"{reverse('login')}?next={reverse('auth-session')}")
    return _template(request, "accounts/session.html", {"user": user})
