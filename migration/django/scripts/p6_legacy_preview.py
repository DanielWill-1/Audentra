"""Loopback-only static SPA preview for P6 fallback and browser checks."""

from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qsl, urlsplit

ROOT = Path(__file__).resolve().parents[3]
DJANGO_ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "parity" / "route-manifest.json"
ASSETS = DJANGO_ROOT / "config" / "p6_legacy_assets.json"
OWNERSHIP = DJANGO_ROOT / "config" / "p6_route_ownership.json"
SENSITIVE = {
    "code", "state", "token", "token_hash", "access_token", "refresh_token",
    "id_token", "provider_token", "expires_at", "type",
}
logger = logging.getLogger("p6-legacy-preview")


def registered_routes() -> tuple[frozenset[str], frozenset[str]]:
    sys.path.insert(0, str(DJANGO_ROOT))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
    import django

    django.setup()
    from apps.application.views import APPLICATION_PAGE_VIEWS
    from apps.pages.views import PAGE_VIEWS

    return frozenset(PAGE_VIEWS), frozenset(APPLICATION_PAGE_VIEWS)


def load_inventory() -> tuple[set[str], dict[str, dict[str, object]], bytes]:
    django_page_routes, django_app_routes = registered_routes()
    manifest_bytes = MANIFEST.read_bytes()
    ownership = json.loads(OWNERSHIP.read_text(encoding="utf-8"))
    if hashlib.sha256(manifest_bytes).hexdigest() != ownership["source_manifest_sha256"]:
        raise SystemExit("The route manifest differs from the reviewed P6 ownership.")
    routes = json.loads(manifest_bytes.decode("utf-8"))["routes"]
    approved = ownership["routes"]
    if len(routes) != ownership["route_count"] or len(approved) != len(routes):
        raise SystemExit("The route manifest differs from the reviewed P6 ownership.")
    if [
        (route["path"], route["category"])
        for route in routes
    ] != [
        (route["path"], route["category"])
        for route in approved
    ]:
        raise SystemExit("The route manifest differs from the reviewed P6 ownership.")
    for route in approved:
        if route["category"] in {"public", "application"}:
            if route["category"] == "public":
                expected_owner = (
                    "django-page" if route["path"] in django_page_routes else "legacy-fallback"
                )
            else:
                expected_owner = (
                    "django-app" if route["path"] in django_app_routes else "legacy-fallback"
                )
        else:
            expected_owner = (
                "local-404" if route["path"] == "/reset-password" else "django-auth-excluded"
            )
        if route["owner"] != expected_owner:
            raise SystemExit("The P7 route owner differs from the reviewed inventory.")
    rollback_routes = frozenset(
        route.strip()
        for route in os.getenv("P7_LEGACY_ROLLBACK_ROUTES", "").split(",")
        if route.strip()
    )
    if not rollback_routes.issubset(django_page_routes | django_app_routes):
        raise SystemExit("The P7 rollback route list includes an unowned path.")
    pages = {
        route["path"]
        for route in approved
        if route["owner"] == "legacy-fallback" or route["path"] in rollback_routes
    }
    inventory = json.loads(ASSETS.read_text(encoding="utf-8"))
    assets = {item["path"]: item for item in inventory["assets"]}
    document = DJANGO_ROOT / ".state" / "p6-legacy-build" / "index.html"
    body = document.read_bytes()
    if hashlib.sha256(body).hexdigest() != inventory["document_sha256"]:
        raise SystemExit("The scratch build document does not match its reviewed digest.")
    return pages, assets, body


def make_handler(build_root: Path) -> type[BaseHTTPRequestHandler]:
    pages, assets, document = load_inventory()

    class Handler(BaseHTTPRequestHandler):
        server_version = "P6LoopbackPreview"

        def send_error(
            self,
            code: int,
            message: str | None = None,
            explain: str | None = None,
        ) -> None:
            del message, explain
            body = b"Preview route unavailable.\n"
            self.send_response(code)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)

        def log_message(self, format_string: str, *args: object) -> None:
            path = urlsplit(self.path).path[:200]
            logger.info("preview request method=%s path=%s", self.command, path)

        def do_GET(self) -> None:
            self._serve()

        def do_HEAD(self) -> None:
            self._serve()

        def do_POST(self) -> None:
            self._deny_method()

        def do_PUT(self) -> None:
            self._deny_method()

        def do_PATCH(self) -> None:
            self._deny_method()

        def do_DELETE(self) -> None:
            self._deny_method()

        def _deny_method(self) -> None:
            self.send_response(405, "Method Not Allowed")
            self.send_header("Allow", "GET, HEAD")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def _serve(self) -> None:
            split = urlsplit(self.path)
            path = split.path
            try:
                keys = {key.casefold() for key, _ in parse_qsl(split.query, keep_blank_values=True)}
            except ValueError:
                self.send_error(400)
                return
            if keys & SENSITIVE or any(key.endswith("_token") for key in keys):
                self.send_error(400)
                return
            if (
                "%" in path or "\\" in path or "//" in path
                or any(part in {".", ".."} for part in path.split("/"))
            ):
                self.send_error(400)
                return
            if path in pages:
                body = document
                content_type = "text/html; charset=utf-8"
                digest = hashlib.sha256(body).hexdigest()
                cache_control = "no-store"
            elif path in assets:
                record = assets[path]
                relative = Path(path.lstrip("/"))
                candidate = (build_root / relative).resolve()
                if not candidate.is_relative_to(build_root):
                    self.send_error(404)
                    return
                try:
                    body = candidate.read_bytes()
                except OSError:
                    self.send_error(404)
                    return
                digest = hashlib.sha256(body).hexdigest()
                if len(body) != record["size"] or digest != record["sha256"]:
                    self.send_error(502, "The preview asset differs from the reviewed inventory.")
                    return
                content_type = str(record["content_type"])
                cache_control = (
                    "public, max-age=31536000, immutable"
                    if path.startswith("/assets/")
                    else "no-cache"
                )
            elif path.endswith("/") and path[:-1] in pages:
                self.send_response(308)
                self.send_header("Location", path[:-1])
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                return
            else:
                self.send_error(404)
                return

            etag = f'"{digest}"'
            if self.headers.get("If-None-Match") == etag:
                self.send_response(304)
                self.send_header("ETag", etag)
                self.send_header("Cache-Control", cache_control)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", cache_control)
            self.send_header("ETag", etag)
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            if self.command == "GET":
                self.wfile.write(body)

    return Handler


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--build-dir", type=Path, default=DJANGO_ROOT / ".state" / "p6-legacy-build"
    )
    parser.add_argument("--port", type=int, default=5173)
    args = parser.parse_args()
    try:
        address = ipaddress.ip_address("127.0.0.1")
        build_root = args.build_dir.resolve(strict=True)
        if not build_root.is_dir():
            raise ValueError("build directory is not a directory")
    except (OSError, ValueError) as error:
        raise SystemExit("Provide a local compiled build directory.") from error
    load_inventory()
    server = ThreadingHTTPServer((str(address), args.port), make_handler(build_root))
    server.daemon_threads = True
    logger.info("P6 legacy preview listening on 127.0.0.1:%s", args.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    main()
