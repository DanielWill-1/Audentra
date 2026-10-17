from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path

import pytest
from apps.pages.views import HELP_ARTICLES
from django.http import HttpResponse
from django.http.response import HttpResponseBase
from django.test import Client, override_settings
from django.urls import resolve

ROOT = Path(__file__).resolve().parents[3]
EXPECTED_HEADINGS = {
    "/terms": "Terms of Use",
    "/privacy": "Privacy Notice",
    "/open": "Open Source License & Attribution",
    "/about": "Forms shouldn’t require",
    "/security": "Security",
    "/pricing": "Simple, Transparent",
    "/industries": "Specialized for Your Industry",
    "/features": "Voice in.",
    "/contact": "Get in Touch",
    "/status": "Service status",
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



@override_settings(
    DEBUG=False,
    P6_PREVIEW_ENABLED=False,
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
    assert "Documentation" == _first_heading_text(documentation.content)
    for anchor in (
        "quickstart",
        "pipeline",
        "schema-engine",
        "guides",
        "saved-forms",
        "activity",
        "settings-preview",
        "voice-data",
        "local-start",
        "http-reference",
    ):
        assert f'id="{anchor}"'.encode() in documentation.content
        assert f'href="#{anchor}"'.encode() in documentation.content
    assert b'>Copy</button>' in documentation.content
    for code_id in ("code-form-fields", "code-start-local", "code-extract-request"):
        assert f'id="{code_id}"'.encode() in documentation.content
        assert f'data-copy-code="{code_id}"'.encode() in documentation.content
    for route in (
        "/templates",
        "/AIVoiceAutoFill",
        "/filledtemplates",
        "/activitylog",
        "/scheduler",
        "/scheduler-settings",
        "/privacy",
        "/security",
        "/help-center",
    ):
        assert f'href="{route}"'.encode() in documentation.content
    assert b"powershell -NoProfile -ExecutionPolicy Bypass -File .\\start-local.ps1" in documentation.content
    assert b"/api/transcribe/" in documentation.content
    assert b"/api/tts/" in documentation.content
    assert b"/api/ai/extract/" in documentation.content
    assert b"ClinicalPatientIntake" not in documentation.content
    assert b"Draft-07" not in documentation.content
    assert b"Schema compile check passed" not in documentation.content
    assert b"Download full template" not in documentation.content
    assert b"../../docs/" not in documentation.content
    assert b'data-active-route="/documentation"' in documentation.content
    assert b'aria-live="polite"' in documentation.content
    page_script = (ROOT / "migration" / "django" / "static" / "js" / "pages.js").read_text()
    assert 'closest("button[data-copy-code]")' in page_script
    assert 'document.getElementById(blockId)' in page_script


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
