from __future__ import annotations

import re

from django.urls import URLPattern, re_path

from .views import APPLICATION_PAGE_VIEWS


def url_patterns() -> list[URLPattern]:
    patterns: list[URLPattern] = []
    for route, view in APPLICATION_PAGE_VIEWS.items():
        route_pattern = rf"^{re.escape(route.lstrip('/'))}/?$"
        patterns.append(
            re_path(
                route_pattern,
                view,
                name=f"app-{route.strip('/').replace('/', '-').lower()}",
            )
        )
    return patterns


urlpatterns = url_patterns()
