from __future__ import annotations

import re

from django.urls import URLPattern, re_path

from apps.pages.views import PAGE_VIEWS


def url_patterns() -> list[URLPattern]:
    patterns: list[URLPattern] = []
    for route, view in PAGE_VIEWS.items():
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
