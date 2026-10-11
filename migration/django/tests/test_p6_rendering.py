from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from apps.application.views import APPLICATION_PAGE_VIEWS
from apps.core import legacy
from apps.pages.views import PAGE_VIEWS
from django.conf import settings
from django.test import Client, override_settings
from django.urls import resolve

ROOT = Path(__file__).resolve().parents[3]


def test_route_inventory_matches_current_react_router() -> None:
    manifest = json.loads((ROOT / "docs" / "parity" / "route-manifest.json").read_text())
    ownership = json.loads(Path(settings.P6_ROUTE_OWNERSHIP).read_text(encoding="utf-8"))
    manifest_paths = [route["path"] for route in manifest["routes"]]
    source = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
    source_paths = re.findall(r'<Route\s+path="([^"]+)"', source)
    assert len(manifest_paths) == 25
    assert len(source_paths) == 25
    assert len(set(manifest_paths)) == 25
    assert set(source_paths) == set(manifest_paths)
    assert len(legacy.AUTH_ROUTES) == 4
    assert len(legacy.ELIGIBLE_ROUTES) == 21
    assert legacy.ROUTE_INVENTORY_VALID is True
    assert ownership["route_count"] == 25
    assert [route["path"] for route in ownership["routes"]] == manifest_paths
    assert sum(route["owner"] == "legacy-fallback" for route in ownership["routes"]) == 0
    assert sum(route["owner"] == "django-page" for route in ownership["routes"]) == 13
    assert sum(route["owner"] == "django-app" for route in ownership["routes"]) == 8
    assert set(legacy.DJANGO_PAGE_ROUTES) == set(PAGE_VIEWS)
    assert set(legacy.DJANGO_APP_ROUTES) == set(APPLICATION_PAGE_VIEWS)
    assert "/AIVoiceAutoFill" in legacy.ELIGIBLE_ROUTES
    assert "/reset-password" in legacy.AUTH_ROUTES


def test_manifest_drift_disables_the_reviewed_route_inventory(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original_bytes = legacy.ROUTE_MANIFEST.read_bytes()

    class ChangedManifest:
        def read_bytes(self) -> bytes:
            return original_bytes + b"\n"

    monkeypatch.setattr(legacy, "ROUTE_MANIFEST", ChangedManifest())
    monkeypatch.setattr(legacy, "ROUTE_INVENTORY_VALID", True)

    assert legacy._manifest_routes() == ()
    assert legacy.ROUTE_INVENTORY_VALID is False


@override_settings(DEBUG=True, P6_PREVIEW_ENABLED=True, ALLOWED_HOSTS=["localhost"])
@pytest.mark.parametrize(
    ("path", "template_marker"),
    [
        ("/__p6/public", "Main navigation"),
        ("/__p6/app", "Workspace navigation"),
    ],
)
def test_shell_preview_renders_public_and_app_fixtures(path: str, template_marker: str) -> None:
    response = Client().get(path, HTTP_HOST="localhost")

    assert response.status_code == 200
    assert template_marker.encode() in response.content
    assert b"P6 shell fixture" in response.content
    if path.endswith("/app"):
        assert b'aria-current="page"' in response.content
    assert (
        b"window.__audentraShellEventsBound"
        in Path(settings.BASE_DIR / "static" / "js" / "shell.js").read_bytes()
    )


@override_settings(DEBUG=True, P6_PREVIEW_ENABLED=False, ALLOWED_HOSTS=["localhost"])
def test_shell_preview_is_disabled_by_default() -> None:
    response = Client().get("/__p6/public", HTTP_HOST="localhost")
    assert response.status_code == 404


@override_settings(DEBUG=True, P6_PREVIEW_ENABLED=True, ALLOWED_HOSTS=["*"])
def test_shell_preview_refuses_non_loopback_hosts() -> None:
    response = Client().get("/__p6/public", HTTP_HOST="preview.example.test")
    assert response.status_code == 404


def test_local_icons_and_pager_are_static_and_accessible() -> None:
    static_root = settings.BASE_DIR / "static"
    sprite = (static_root / "icons" / "sprite.svg").read_text(encoding="utf-8")
    shell_js = (static_root / "js" / "shell.js").read_text(encoding="utf-8")
    pager = (settings.BASE_DIR / "templates" / "fragments" / "pager.html").read_text(
        encoding="utf-8"
    )
    assert 'id="icon-home"' in sprite and 'id="icon-mic"' in sprite
    icon_template = settings.BASE_DIR / "templates" / "fragments" / "icon.html"
    assert 'aria-hidden="true"' in icon_template.read_text()
    assert 'aria-label="Pagination"' in pager
    assert "prefers-reduced-motion" in (
        settings.BASE_DIR / "assets" / "tailwind.input.css"
    ).read_text(encoding="utf-8")
    assert "showModal()" in shell_js and "event.key !== 'Tab'" in shell_js


def test_health_auth_and_api_routes_stay_django_owned() -> None:
    django_paths = (
        "/healthz",
        "/login/",
        "/signup/",
        "/forgot-password/",
        "/change-password/",
        "/auth/session/",
        "/logout/",
    )
    for path in django_paths:
        match = resolve(path)
        assert not (match.url_name or "").startswith("legacy-")
    assert resolve("/reset-password").url_name == "reset-password"
    assert resolve("/reset-password/").url_name == "reset-password"
    assert resolve("/api/transcribe").url_name == "transcribe-no-slash"
