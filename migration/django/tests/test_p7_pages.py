from __future__ import annotations

import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path

import httpx
import pytest
from apps.application.urls import url_patterns as application_url_patterns
from apps.application.views import APPLICATION_PAGE_VIEWS
from apps.core import legacy
from apps.pages.urls import url_patterns as page_url_patterns
from apps.pages.views import HELP_ARTICLES, PAGE_VIEWS
from django.http import HttpResponse
from django.http.response import HttpResponseBase
from django.test import Client, RequestFactory, override_settings
from django.urls import resolve
from django.urls.resolvers import RegexPattern, URLPattern, URLResolver

ROOT = Path(__file__).resolve().parents[3]
W1_ROUTES = (
    "/terms",
    "/privacy",
    "/open",
    "/about",
    "/security",
    "/pricing",
    "/industries",
    "/features",
    "/contact",
    "/status",
    "/help-center",
)
EXPECTED_HEADINGS = {
    "/terms": "Terms of Use",
    "/privacy": "Privacy Notice",
    "/open": "Open Source License & Attribution",
    "/about": "Forms shouldn’t require",
    "/security": "Enterprise-Grade",
    "/pricing": "Simple, Transparent",
    "/industries": "Specialized for Your Industry",
    "/features": "Voice in.",
    "/contact": "Get in Touch",
    "/status": "System Status",
    "/help-center": "Help Center",
}


class _FirstHeadingText(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.in_heading = False
        self.found_heading = False
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        del attrs
        if tag == "h1" and not self.found_heading:
            self.in_heading = True
            self.found_heading = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "h1" and self.in_heading:
            self.in_heading = False

    def handle_data(self, data: str) -> None:
        if self.in_heading:
            self.parts.append(data)


def _assert_no_legacy_proxy(response: HttpResponseBase, route: str) -> None:
    assert "X-Legacy-Proxy" not in response.headers, route


def _first_heading_text(content: bytes) -> str:
    parser = _FirstHeadingText()
    parser.feed(content.decode("utf-8"))
    return " ".join(" ".join(parser.parts).split())


def _legacy_page_pattern_count(patterns: list[URLPattern]) -> int:
    return sum(
        1
        for pattern in patterns
        if (pattern.name or "").startswith("legacy-") and "asset" not in (pattern.name or "")
    )


def test_real_page_ownership_and_effective_fallback_inventory() -> None:
    ownership = json.loads(
        (ROOT / "migration" / "django" / "config" / "p6_route_ownership.json").read_text(
            encoding="utf-8"
        )
    )
    documented = json.loads(
        (ROOT / "docs" / "pages" / "P7_W1_ROUTE_OWNERSHIP.json").read_text(encoding="utf-8")
    )
    assert set(W1_ROUTES).issubset(PAGE_VIEWS)
    assert set(legacy.DJANGO_PAGE_ROUTES).issuperset(W1_ROUTES)
    assert set(APPLICATION_PAGE_VIEWS) == {
        "/dashboard",
        "/templates",
        "/scheduler",
        "/manage-schedules",
        "/scheduler-settings",
        "/AIVoiceAutoFill",
        "/filledtemplates",
        "/activitylog",
    }
    assert set(legacy.DJANGO_APP_ROUTES) == set(APPLICATION_PAGE_VIEWS)
    assert len(legacy.effective_fallback_routes()) == 0
    assert set(route["path"] for route in documented["routes"]).issuperset(W1_ROUTES)
    assert documented["source_manifest_sha256"] == ownership["source_manifest_sha256"]
    assert documented["effective_fallback_count"] == 10
    assert set(documented["allowed_rollback_routes"]) == set(W1_ROUTES)
    assert sum(route["owner"] == "django-page" for route in ownership["routes"]) == 13
    assert sum(route["owner"] == "django-app" for route in ownership["routes"]) == 8
    assert sum(route["owner"] == "legacy-fallback" for route in ownership["routes"]) == 0
    assert len(legacy.AUTH_ROUTES) == 4


@override_settings(
    DEBUG=False,
    P6_PREVIEW_ENABLED=False,
    P6_LEGACY_FALLBACK_ENABLED=False,
    P7_LEGACY_ROLLBACK_ROUTES=frozenset(),
    ALLOWED_HOSTS=["localhost", "testserver"],
)
@pytest.mark.django_db(databases=[])
def test_all_w1_routes_render_full_django_pages_without_fallback() -> None:
    client = Client()
    for route, expected_heading in EXPECTED_HEADINGS.items():
        response = client.get(route, HTTP_HOST="localhost")
        assert response.status_code == 200, route
        _assert_no_legacy_proxy(response, route)
        assert b'id="root"' not in response.content, route
        assert b"/assets/index-" not in response.content, route
        assert expected_heading in _first_heading_text(response.content), route
        match = resolve(route)
        assert (match.url_name or "").startswith("page-"), route


def test_no_proxy_assertion_rejects_a_present_header() -> None:
    response = HttpResponse()
    response["X-Legacy-Proxy"] = "1"
    with pytest.raises(AssertionError, match="/features"):
        _assert_no_legacy_proxy(response, "/features")


@override_settings(DEBUG=False, P6_PREVIEW_ENABLED=False, ALLOWED_HOSTS=["localhost"])
@pytest.mark.django_db(databases=[])
def test_w2_home_and_documentation_render_full_local_pages() -> None:
    client = Client()
    home = client.get("/", HTTP_HOST="localhost")
    documentation = client.get("/documentation", HTTP_HOST="localhost")
    assert home.status_code == documentation.status_code == 200
    assert "Audentra handles" in _first_heading_text(home.content)
    assert b"From conversation to completed form." in home.content
    assert b"One interface. Different workflows." in home.content
    assert b"Designed with sensitive data in mind." in home.content
    assert b"/AIVoiceAutoFill" in home.content
    assert "Documentation & Architecture Guide" in _first_heading_text(documentation.content)
    assert b'id="quickstart"' in documentation.content
    assert b'id="pipeline"' in documentation.content
    assert b'id="schema-engine"' in documentation.content
    assert b'id="guides"' in documentation.content
    assert b"<button" in documentation.content and b">Copy</button>" in documentation.content
    assert b"ClinicalPatientIntake" in documentation.content
    assert b"git clone https://github.com/audentra/audentra.git" in documentation.content
    assert b'data-active-route="/documentation"' in documentation.content
    assert "aria-live" in (ROOT / "migration" / "django" / "static" / "js" / "pages.js").read_text()
    assert len(legacy.effective_fallback_routes()) == 0


@override_settings(ALLOWED_HOSTS=["localhost"])
@pytest.mark.django_db(databases=[])
def test_w3_reset_link_has_explicit_local_unavailable_state() -> None:
    client = Client()
    response = client.get(
        "/reset-password?access_token=synthetic-secret",
        HTTP_HOST="localhost",
    )
    assert response.status_code == 404
    assert b"Reset link unavailable" in response.content
    assert b"synthetic-secret" not in response.content
    assert response.headers["Cache-Control"] == "no-store"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert client.post("/reset-password", HTTP_HOST="localhost").status_code == 405


@override_settings(
    DEBUG=False,
    P6_PREVIEW_ENABLED=False,
    P6_LEGACY_FALLBACK_ENABLED=False,
    P7_LEGACY_ROLLBACK_ROUTES=frozenset(),
    ALLOWED_HOSTS=["localhost", "testserver"],
)
@pytest.mark.django_db(databases=[])
def test_page_methods_slash_alias_sensitive_queries_and_unmigrated_routes() -> None:
    client = Client()
    assert client.head("/terms", HTTP_HOST="localhost").status_code == 200
    alias = client.get("/terms/", HTTP_HOST="localhost", follow=False)
    assert alias.status_code == 308
    assert alias["Location"] == "/terms"
    assert client.post("/terms", HTTP_HOST="localhost").status_code == 405
    assert client.get("/privacy?access_token=private", HTTP_HOST="localhost").status_code == 400
    encoded = client.get("/%66eatures", HTTP_HOST="localhost", RAW_URI="/%66eatures")
    assert encoded.status_code == 400
    assert client.get("/reset-password", HTTP_HOST="localhost").status_code == 404
    assert client.get("/", HTTP_HOST="localhost").status_code == 200


@override_settings(ALLOWED_HOSTS=["localhost", "testserver"])
@pytest.mark.django_db(databases=[])
@pytest.mark.parametrize(
    ("query", "expected_count", "expected_heading"),
    [
        ("", 6, b"Popular Articles"),
        ("?q=FIRST+VOICE+FORM", 1, b"Popular Articles"),
        ("?category=voice-features", 2, b"Voice Features"),
        ("?q=voice&category=voice-features", 2, b"Voice Features"),
        ("?q=no-such-title", 0, b"No articles found"),
    ],
)
def test_help_center_get_search_category_and_no_match(
    query: str,
    expected_count: int,
    expected_heading: bytes,
) -> None:
    response = Client().get(f"/help-center{query}", HTTP_HOST="localhost")
    assert response.status_code == 200
    assert f"{expected_count} articles found".encode() in response.content
    assert expected_heading in response.content


@override_settings(ALLOWED_HOSTS=["localhost", "testserver"])
@pytest.mark.django_db(databases=[])
def test_help_center_validates_category_and_escapes_search_query() -> None:
    client = Client()
    invalid_category = client.get("/help-center?category=unknown", HTTP_HOST="localhost")
    too_long = client.get(f"/help-center?q={'x' * 121}", HTTP_HOST="localhost")
    escaped = client.get("/help-center?q=%3Cscript%3E", HTTP_HOST="localhost")
    assert invalid_category.status_code == too_long.status_code == 400
    assert escaped.status_code == 200
    assert b'value="&lt;script&gt;"' in escaped.content
    assert b"<script>" not in escaped.content


def test_help_articles_are_bounded_to_the_reviewed_six_source_items() -> None:
    assert len(HELP_ARTICLES) == 6
    required_fields = {"title", "category", "read_time", "rating", "views", "updated"}
    assert all(set(article) >= required_fields for article in HELP_ARTICLES)


@pytest.mark.django_db(databases=[])
def test_w1_snapshot_rollback_counts_are_measured_from_its_route_inventory(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    snapshot_path = ROOT / "docs" / "pages" / "P7_W1_ROUTE_OWNERSHIP.json"
    snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
    routes = tuple(
        {key: route[key] for key in ("path", "category", "owner")}
        for route in snapshot["routes"]
    )
    public_pages = tuple(route["path"] for route in routes if route["owner"] == "django-page")
    app_pages = tuple(route["path"] for route in routes if route["owner"] == "django-app")
    fallback_pages = tuple(route["path"] for route in routes if route["owner"] == "legacy-fallback")
    owned_pages = frozenset((*public_pages, *app_pages))
    eligible_pages = tuple(
        route["path"] for route in routes if route["category"] in {"public", "application"}
    )
    monkeypatch.setattr(legacy, "MANIFEST_ROUTES", routes)
    monkeypatch.setattr(legacy, "DJANGO_PAGE_ROUTES", public_pages)
    monkeypatch.setattr(legacy, "DJANGO_APP_ROUTES", app_pages)
    monkeypatch.setattr(legacy, "BASE_FALLBACK_ROUTES", fallback_pages)
    monkeypatch.setattr(legacy, "DJANGO_OWNED_ROUTES", owned_pages)
    monkeypatch.setattr(legacy, "ELIGIBLE_ROUTES", eligible_pages)

    selected = frozenset({"/features"})
    before = _legacy_page_pattern_count(legacy.url_patterns(frozenset()))
    during = _legacy_page_pattern_count(legacy.url_patterns(selected))
    restored = _legacy_page_pattern_count(legacy.url_patterns(frozenset()))
    measured = (before, during, restored)
    snapshot_fallbacks = snapshot["effective_fallback_count"]
    assert measured == (snapshot_fallbacks, snapshot_fallbacks + 1, snapshot_fallbacks)
    assert measured == (10, 11, 10)


@pytest.mark.parametrize("route", ("/features", "/dashboard"))
def test_route_rollback_changes_actual_owner_and_restores_fallback_count(
    monkeypatch: pytest.MonkeyPatch,
    route: str,
) -> None:
    fallback_body = b"<!doctype html><title>approved legacy fallback</title>"
    monkeypatch.setattr(legacy, "DOCUMENT_SHA256", hashlib.sha256(fallback_body).hexdigest())
    monkeypatch.setattr(legacy, "DOCUMENT_SIZE", len(fallback_body))
    upstream_requests: list[httpx.Request] = []

    def client_factory(timeout: httpx.Timeout) -> httpx.Client:
        def respond(request: httpx.Request) -> httpx.Response:
            upstream_requests.append(request)
            return httpx.Response(
                200,
                headers={"Content-Type": "text/html; charset=utf-8"},
                content=fallback_body,
                request=request,
            )

        return httpx.Client(
            transport=httpx.MockTransport(respond),
            timeout=timeout,
            follow_redirects=False,
            trust_env=False,
            max_redirects=0,
        )

    monkeypatch.setattr(legacy, "_http_client", client_factory)
    selected = frozenset({route})
    baseline_legacy = legacy.url_patterns(frozenset())
    rollback_legacy = legacy.url_patterns(selected)
    restored_legacy = legacy.url_patterns(frozenset())
    baseline_pages = page_url_patterns(frozenset())
    rollback_pages = page_url_patterns(selected)
    restored_pages = page_url_patterns(frozenset())
    baseline_apps = application_url_patterns(frozenset())
    rollback_apps = application_url_patterns(selected)
    restored_apps = application_url_patterns(frozenset())
    assert _legacy_page_pattern_count(baseline_legacy) == 0
    assert _legacy_page_pattern_count(rollback_legacy) == 1
    assert _legacy_page_pattern_count(restored_legacy) == 0
    assert len(baseline_pages) == 13
    assert len(rollback_pages) == 13 - (route in PAGE_VIEWS)
    assert len(restored_pages) == 13
    assert len(baseline_apps) == 8
    assert len(rollback_apps) == 8 - (route in APPLICATION_PAGE_VIEWS)
    assert len(restored_apps) == 8

    with override_settings(
        DEBUG=True,
        ALLOWED_HOSTS=["localhost", "testserver"],
        P6_LEGACY_FALLBACK_ENABLED=True,
        P6_LEGACY_ORIGIN="http://127.0.0.1:5173",
        DJANGO_PUBLIC_ORIGIN="http://127.0.0.1:8000",
        P7_LEGACY_ROLLBACK_ROUTES=selected,
    ):
        rollback_urlconf = URLResolver(
            RegexPattern(r"^/"),
            list(rollback_legacy + rollback_pages + rollback_apps),
        )
        rollback_match = rollback_urlconf.resolve(route)
        callback = rollback_match.func
        request = RequestFactory().get(
            route,
            HTTP_HOST="localhost:8000",
            RAW_URI=route,
        )
        response = callback(request, **rollback_match.kwargs)
        assert response.status_code == 200
        assert response.content == fallback_body
        assert response.headers["X-Legacy-Proxy"] == "1"
        assert len(upstream_requests) == 1

        upstream_requests.clear()
        encoded_path = f"/%{ord(route[1]):02x}{route[2:]}"
        encoded_request = RequestFactory().get(
            route,
            HTTP_HOST="localhost:8000",
            RAW_URI=encoded_path,
        )
        encoded_response = callback(encoded_request, **rollback_match.kwargs)
        post_request = RequestFactory().post(
            route,
            HTTP_HOST="localhost:8000",
            RAW_URI=route,
        )
        post_response = callback(post_request, **rollback_match.kwargs)
        assert encoded_response.status_code == 400
        assert post_response.status_code == 405
        assert upstream_requests == []
    assert len(legacy.effective_fallback_routes(frozenset())) == 0
    restored_urlconf = URLResolver(
        RegexPattern(r"^/"),
        list(restored_legacy + restored_pages + restored_apps),
    )
    restored_match = restored_urlconf.resolve(route)
    expected_owner = PAGE_VIEWS.get(route) or APPLICATION_PAGE_VIEWS[route]
    assert restored_match.func is expected_owner
