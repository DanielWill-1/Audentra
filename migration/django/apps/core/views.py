import ipaddress
import logging
from urllib.parse import urlsplit

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import render
from django.urls import path
from django.views.decorators.http import require_GET

from .health import inspect_database_alias

logger = logging.getLogger(__name__)


def _preview_host_is_loopback(request: HttpRequest) -> bool:
    host = (urlsplit(f"//{request.get_host()}").hostname or "").casefold()
    if host == "localhost":
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return False


def shell_preview(request: HttpRequest) -> HttpResponse:
    if (
        not settings.DEBUG
        or not settings.P6_PREVIEW_ENABLED
        or not _preview_host_is_loopback(request)
    ):
        return HttpResponse("Not found.", status=404, content_type="text/plain")
    if request.path == "/__p6/public":
        return render(
            request,
            "core/preview_public.html",
            {
                "active_route": "/",
                "modal_title": "Shell preview",
                "modal_copy": (
                    "This shared dialog is a shell fixture. Product actions are implemented "
                    "with their page in a later phase."
                ),
            },
        )
    return render(
        request,
        "core/preview_app.html",
        {
            "active_route": "/dashboard",
            "modal_title": "Shell preview",
            "modal_copy": (
                "This shared dialog is a shell fixture. Product actions are implemented "
                "with their page in a later phase."
            ),
        },
    )


preview_urlpatterns = [
    path("__p6/public", shell_preview, name="p6-preview-public"),
    path("__p6/app", shell_preview, name="p6-preview-app"),
]


@require_GET
def healthz(request: HttpRequest) -> JsonResponse:
    del request
    for alias in ("default", "supabase"):
        try:
            inspect_database_alias(alias)
        except Exception as error:  # A health failure must stay generic in the HTTP response.
            logger.warning("Health probe failed for %s (%s).", alias, type(error).__name__)
            return JsonResponse({"status": "unavailable"}, status=503)
    return JsonResponse({"status": "ok", "checks": {"default": "ok", "supabase": "ok"}})
