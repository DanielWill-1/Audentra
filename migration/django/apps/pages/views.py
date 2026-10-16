from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from urllib.parse import parse_qsl

from django.http import HttpRequest, HttpResponse, HttpResponseBadRequest
from django.shortcuts import render
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.views.decorators.http import require_safe

HELP_CATEGORIES = (
    {"id": "all", "name": "All Topics", "count": 47, "icon": "book-open"},
    {
        "id": "getting-started",
        "name": "Getting Started",
        "count": 8,
        "icon": "lightbulb",
    },
    {"id": "voice-features", "name": "Voice Features", "count": 12, "icon": "zap"},
    {"id": "templates", "name": "Templates", "count": 10, "icon": "file-text"},
    {"id": "security", "name": "Security & Privacy", "count": 6, "icon": "shield"},
    {"id": "team-management", "name": "Team Management", "count": 7, "icon": "users"},
    {"id": "settings", "name": "Settings & Account", "count": 4, "icon": "settings"},
)

HELP_ARTICLES = (
    {
        "title": "How to create your first voice form",
        "category": "getting-started",
        "read_time": "3 min read",
        "rating": "4.9",
        "views": "1247",
        "updated": "2 days ago",
    },
    {
        "title": "Understanding voice accuracy and training",
        "category": "voice-features",
        "read_time": "5 min read",
        "rating": "4.8",
        "views": "892",
        "updated": "1 week ago",
    },
    {
        "title": "Setting up team permissions and roles",
        "category": "team-management",
        "read_time": "4 min read",
        "rating": "4.7",
        "views": "634",
        "updated": "3 days ago",
    },
    {
        "title": "Cloud processing, privacy, and data security",
        "category": "security",
        "read_time": "6 min read",
        "rating": "4.9",
        "views": "1156",
        "updated": "1 day ago",
    },
    {
        "title": "Creating custom form templates",
        "category": "templates",
        "read_time": "7 min read",
        "rating": "4.6",
        "views": "445",
        "updated": "5 days ago",
    },
    {
        "title": "Troubleshooting voice recognition issues",
        "category": "voice-features",
        "read_time": "4 min read",
        "rating": "4.5",
        "views": "723",
        "updated": "1 week ago",
    },
)

_SENSITIVE_QUERY_KEYS = {
    "code",
    "state",
    "token",
    "token_hash",
    "access_token",
    "refresh_token",
    "id_token",
    "provider_token",
    "expires_at",
    "type",
}


def _valid_request(request: HttpRequest, route: str) -> tuple[bool, bool]:
    raw_uri = request.META.get("RAW_URI") or request.META.get("REQUEST_URI")
    raw_path, _, query = (
        raw_uri.partition("?")
        if raw_uri
        else (
            request.path_info,
            "?",
            request.META.get("QUERY_STRING", ""),
        )
    )
    allowed_paths = {route, f"{route}/"}
    if (
        raw_path not in allowed_paths
        or request.path_info not in allowed_paths
        or "%" in raw_path
        or "\\" in raw_path
        or any(ord(character) < 0x20 for character in raw_path + query)
        or len(query) > 2048
    ):
        return False, False
    try:
        query_keys = {
            key.casefold() for key, _ in parse_qsl(query, keep_blank_values=True, max_num_fields=40)
        }
    except ValueError:
        return False, False
    if query_keys & _SENSITIVE_QUERY_KEYS or any(key.endswith("_token") for key in query_keys):
        return False, False
    return True, raw_path != route


def _help_context(request: HttpRequest, route: str) -> dict[str, object] | HttpResponse:
    query = request.GET.get("q", "")
    category = request.GET.get("category", "all")
    if len(query) > 120 or category not in {item["id"] for item in HELP_CATEGORIES}:
        return HttpResponseBadRequest("Invalid help search.", content_type="text/plain")
    folded_query = query.casefold()
    category_names = {item["id"]: item["name"] for item in HELP_CATEGORIES}
    articles = [
        {**article, "category_name": category_names[str(article["category"])]}
        for article in HELP_ARTICLES
        if (category == "all" or article["category"] == category)
        and folded_query in article["title"].casefold()
    ]
    return {
        "active_route": route,
        "query": query,
        "selected_category": category,
        "categories": HELP_CATEGORIES,
        "category_name": category_names[category],
        "articles": articles,
        "article_count": len(articles),
        "help_url": reverse("page-help-center"),
    }


def _reviewed_source_markup(slug: str) -> object:
    # These checked-in HTML fragments come from the dated W2 React capture, not user input.
    content_path = Path(__file__).resolve().parent / "content" / f"{slug}.html"
    return mark_safe(content_path.read_text(encoding="utf-8"))


def _render_page(request: HttpRequest, route: str, slug: str) -> HttpResponse:
    valid, slash_alias = _valid_request(request, route)
    if not valid:
        return HttpResponseBadRequest("Invalid request path.", content_type="text/plain")
    if slash_alias:
        query = request.META.get("QUERY_STRING", "")
        response = HttpResponse(status=308)
        response["Location"] = route + (f"?{query}" if query else "")
        response["Cache-Control"] = "no-store"
        return response
    context: dict[str, object] = {"active_route": route}
    if route == "/help-center":
        help_context = _help_context(request, route)
        if isinstance(help_context, HttpResponse):
            return help_context
        context.update(help_context)
    elif route in {"/", "/documentation"}:
        context.update(
            {"source_markup": _reviewed_source_markup("home" if route == "/" else "documentation")}
        )
    return render(request, f"pages/{slug}.html", context)


def _make_view(route: str, slug: str) -> Callable[[HttpRequest], HttpResponse]:
    @require_safe
    def page_view(request: HttpRequest) -> HttpResponse:
        return _render_page(request, route, slug)

    page_view.__name__ = f"{slug.replace('-', '_')}_page"
    page_view.__qualname__ = page_view.__name__
    return page_view


PAGE_VIEWS: dict[str, Callable[[HttpRequest], HttpResponse]] = {
    "/": _make_view("/", "home"),
    "/documentation": _make_view("/documentation", "documentation"),
    "/terms": _make_view("/terms", "terms"),
    "/privacy": _make_view("/privacy", "privacy"),
    "/open": _make_view("/open", "open"),
    "/about": _make_view("/about", "about"),
    "/security": _make_view("/security", "security"),
    "/pricing": _make_view("/pricing", "pricing"),
    "/industries": _make_view("/industries", "industries"),
    "/features": _make_view("/features", "features"),
    "/contact": _make_view("/contact", "contact"),
    "/status": _make_view("/status", "status"),
    "/help-center": _make_view("/help-center", "help-center"),
}
