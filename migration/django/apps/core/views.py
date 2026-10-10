import logging

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from .health import inspect_database_alias

logger = logging.getLogger(__name__)


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
