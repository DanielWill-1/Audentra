from __future__ import annotations

import re

from django.conf import settings
from django.urls import URLPattern, re_path

from apps.pages.views import PAGE_VIEWS


def url_patterns(rollback_routes: frozenset[str] | None = None) -> list[URLPattern]:
    rolled_back = settings.P7_LEGACY_ROLLBACK_ROUTES if rollback_routes is None else rollback_routes
    patterns: list[URLPattern] = []
    for route, view in PAGE_VIEWS.items():
        if route in rolled_back:
            continue
        route_pattern = r"^$" if route == "/" else rf"^{re.escape(route.lstrip('/'))}/?$"
        patterns.append(
            re_path(
                route_pattern,
                view,
                name=f"page-{route.strip('/').replace('/', '-')}",
            )
        )
    return patterns


urlpatterns = url_patterns()
