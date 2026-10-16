"""Narrow page and asset bridge for the still-live Vite site."""

from __future__ import annotations

import hashlib
import ipaddress
import json
import logging
import re
from collections.abc import Iterator
from pathlib import Path
from urllib.parse import parse_qsl, urljoin, urlsplit

import httpx
from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.urls import URLPattern, re_path

from apps.application.views import APPLICATION_PAGE_VIEWS
from apps.pages.views import PAGE_VIEWS

logger = logging.getLogger(__name__)

PROJECT_ROOT = settings.BASE_DIR.parent.parent
ROUTE_MANIFEST = PROJECT_ROOT / "docs" / "parity" / "route-manifest.json"
MAX_PAGE_BYTES = 8 * 1024 * 1024
MAX_ASSET_BYTES = 24 * 1024 * 1024
MAX_QUERY_LENGTH = 2048
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
_ASSET_PATH = re.compile(r"^/(?:assets/[A-Za-z0-9._-]+|favicon\.svg|image\.png)$")
ROUTE_INVENTORY_VALID = True


def _manifest_routes() -> tuple[dict[str, str], ...]:
    global ROUTE_INVENTORY_VALID
    try:
        raw_manifest = ROUTE_MANIFEST.read_bytes()
        ownership = json.loads(Path(settings.P6_ROUTE_OWNERSHIP).read_text(encoding="utf-8"))
        if hashlib.sha256(raw_manifest).hexdigest() != ownership["source_manifest_sha256"]:
            raise ValueError("route manifest digest differs from reviewed ownership")
        payload = json.loads(raw_manifest.decode("utf-8"))
        routes = payload["routes"]
        approved = ownership["routes"]
        if (
            not isinstance(routes, list)
            or not isinstance(approved, list)
            or len(routes) != ownership["route_count"]
            or len(approved) != ownership["route_count"]
        ):
            raise ValueError("route inventory count differs from reviewed ownership")
        records: list[dict[str, str]] = []
        seen: set[str] = set()
        for route, approved_route in zip(routes, approved, strict=True):
            path = route["path"]
            category = route["category"]
            owner = approved_route["owner"]
            if (
                not isinstance(path, str)
                or not path.startswith("/")
                or path in seen
                or category not in {"public", "authentication", "application"}
                or approved_route["path"] != path
                or approved_route["category"] != category
                or "?" in path
                or "#" in path
                or "\\" in path
            ):
                raise ValueError("route entry is malformed")
            if category in {"public", "application"}:
                if category == "public":
                    expected_owner = "django-page" if path in PAGE_VIEWS else "legacy-fallback"
                else:
                    expected_owner = (
                        "django-app" if path in APPLICATION_PAGE_VIEWS else "legacy-fallback"
                    )
            else:
                expected_owner = (
                    "local-404" if path == "/reset-password" else "django-auth-excluded"
                )
            if owner != expected_owner:
                raise ValueError("route owner differs from reviewed ownership")
            seen.add(path)
            records.append({"path": path, "category": category, "owner": owner})
        if len(seen) != ownership["route_count"]:
            raise ValueError("route inventory contains duplicate paths")
        return tuple(records)
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        ROUTE_INVENTORY_VALID = False
        logger.error("P6 route inventory unavailable (%s).", type(error).__name__)
        return ()


MANIFEST_ROUTES = _manifest_routes()
ELIGIBLE_ROUTES = tuple(
    route["path"] for route in MANIFEST_ROUTES if route["category"] in {"public", "application"}
)
DJANGO_PAGE_ROUTES = tuple(
    route["path"] for route in MANIFEST_ROUTES if route["owner"] == "django-page"
)
DJANGO_APP_ROUTES = tuple(
    route["path"] for route in MANIFEST_ROUTES if route["owner"] == "django-app"
)
DJANGO_OWNED_ROUTES = frozenset((*DJANGO_PAGE_ROUTES, *DJANGO_APP_ROUTES))
BASE_FALLBACK_ROUTES = tuple(
    route["path"] for route in MANIFEST_ROUTES if route["owner"] == "legacy-fallback"
)
AUTH_ROUTES = frozenset(
    route["path"] for route in MANIFEST_ROUTES if route["category"] == "authentication"
)


def rollback_routes_valid(rollback_routes: frozenset[str] | None = None) -> bool:
    selected = settings.P7_LEGACY_ROLLBACK_ROUTES if rollback_routes is None else rollback_routes
    return selected.issubset(DJANGO_OWNED_ROUTES)


def effective_fallback_routes(rollback_routes: frozenset[str] | None = None) -> tuple[str, ...]:
    selected = settings.P7_LEGACY_ROLLBACK_ROUTES if rollback_routes is None else rollback_routes
    if not rollback_routes_valid(selected):
        return ()
    effective = set(BASE_FALLBACK_ROUTES) | set(selected)
    return tuple(route["path"] for route in MANIFEST_ROUTES if route["path"] in effective)


def _asset_inventory() -> tuple[dict[str, object], ...]:
    try:
        payload = json.loads(Path(settings.P6_ASSET_INVENTORY).read_text(encoding="utf-8"))
        records = payload["assets"]
        if not isinstance(records, list):
            raise ValueError("asset list is not an array")
        output: list[dict[str, object]] = []
        seen: set[str] = set()
        for record in records:
            path = record["path"]
            size = record["size"]
            digest = record["sha256"]
            content_type = record["content_type"]
            if (
                not isinstance(path, str)
                or not _ASSET_PATH.fullmatch(path)
                or path in seen
                or not isinstance(size, int)
                or size < 0
                or not isinstance(digest, str)
                or not re.fullmatch(r"[0-9a-f]{64}", digest)
                or not isinstance(content_type, str)
                or "\r" in content_type
                or "\n" in content_type
            ):
                raise ValueError("asset entry is malformed")
            seen.add(path)
            output.append(
                {"path": path, "size": size, "sha256": digest, "content_type": content_type}
            )
        return tuple(output)
    except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        logger.error("P6 asset inventory unavailable (%s).", type(error).__name__)
        return ()


ASSET_INVENTORY = _asset_inventory()
ASSETS_BY_PATH = {str(asset["path"]): asset for asset in ASSET_INVENTORY}
DOCUMENT_SHA256 = ""
DOCUMENT_SIZE = 0
try:
    _asset_payload = json.loads(Path(settings.P6_ASSET_INVENTORY).read_text(encoding="utf-8"))
    DOCUMENT_SHA256 = str(_asset_payload["document_sha256"])
    DOCUMENT_SIZE = int(_asset_payload["document_size"])
    if not re.fullmatch(r"[0-9a-f]{64}", DOCUMENT_SHA256):
        DOCUMENT_SHA256 = ""
    if DOCUMENT_SIZE < 1 or DOCUMENT_SIZE > MAX_PAGE_BYTES:
        DOCUMENT_SIZE = 0
except (OSError, KeyError, TypeError, ValueError, json.JSONDecodeError):
    pass


def _error(status: int = 503) -> HttpResponse:
    return HttpResponse("Legacy preview is unavailable.", status=status, content_type="text/plain")


def _raw_path(request: HttpRequest) -> tuple[str, str, bool]:
    raw_uri = request.META.get("RAW_URI") or request.META.get("REQUEST_URI")
    if raw_uri:
        path, _, query = raw_uri.partition("?")
    else:
        path = request.path_info
        query = request.META.get("QUERY_STRING", "")
    return path, query, bool(raw_uri)


def _valid_request_path(request: HttpRequest, canonical_path: str) -> tuple[bool, bool, str]:
    raw_path, query, has_raw_uri = _raw_path(request)
    allowed_paths = {canonical_path}
    if canonical_path != "/":
        allowed_paths.add(f"{canonical_path}/")
    if (
        not has_raw_uri
        or raw_path not in allowed_paths
        or request.path_info not in allowed_paths
        or "%" in raw_path
        or "\\" in raw_path
        or "//" in raw_path
        or any(segment in {".", ".."} for segment in raw_path.split("/"))
        or any(ord(character) < 0x20 for character in raw_path + query)
        or len(query) > MAX_QUERY_LENGTH
    ):
        return False, False, ""
    try:
        query_keys = {key.casefold() for key, _ in parse_qsl(query, keep_blank_values=True)}
    except ValueError:
        return False, False, ""
    if query_keys & _SENSITIVE_QUERY_KEYS or any(key.endswith("_token") for key in query_keys):
        return False, False, ""
    return True, raw_path != canonical_path, query


def _origin() -> tuple[str, str, str, int] | None:
    value = settings.P6_LEGACY_ORIGIN
    if not value:
        return None
    try:
        parsed = urlsplit(value)
        host = parsed.hostname
        port = parsed.port
    except ValueError:
        return None
    if (
        not host
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path
        or parsed.query
        or parsed.fragment
        or parsed.netloc.endswith(":")
    ):
        return None
    scheme = parsed.scheme.casefold()
    host = host.casefold()
    effective_port = port or (443 if scheme == "https" else 80)
    if scheme == "http":
        try:
            loopback = ipaddress.ip_address(host).is_loopback
        except ValueError:
            loopback = host == "localhost"
        if not settings.DEBUG or not loopback:
            return None
    elif scheme != "https":
        return None
    return value, scheme, host, effective_port


def _targets_this_site(request: HttpRequest, target: tuple[str, str, str, int]) -> bool:
    _, target_scheme, target_host, target_port = target
    try:
        public_origin = urlsplit(settings.DJANGO_PUBLIC_ORIGIN)
        public_port = public_origin.port or (443 if public_origin.scheme == "https" else 80)
        if (
            target_scheme == public_origin.scheme.casefold()
            and target_host == (public_origin.hostname or "").casefold()
            and target_port == public_port
        ):
            return True
    except ValueError:
        return True
    request_scheme = "https" if request.is_secure() else "http"
    try:
        request_host = request.get_host().casefold()
        parsed_request = urlsplit(f"{request_scheme}://{request_host}")
        request_port = parsed_request.port or (443 if request_scheme == "https" else 80)
    except ValueError:
        return True
    request_names = {parsed_request.hostname or ""}
    request_names.update(host.casefold() for host in settings.ALLOWED_HOSTS if host != "*")
    same_scheme = target_scheme == request_scheme
    same_port = target_port == request_port
    return same_scheme and same_port and target_host in request_names


def _response_headers(upstream: httpx.Response, *, is_asset: bool) -> dict[str, str]:
    headers = {"X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer"}
    if is_asset:
        content_type = upstream.headers.get("Content-Type", "application/octet-stream").split(
            ";", 1
        )[0]
        headers["Content-Type"] = content_type
        headers["Cache-Control"] = upstream.headers.get("Cache-Control", "public, max-age=300")
        for name in ("ETag", "Last-Modified"):
            if name in upstream.headers:
                headers[name] = upstream.headers[name]
    else:
        headers["Content-Type"] = "text/html; charset=utf-8"
        headers["Cache-Control"] = "no-store"
    return headers


def _redirect_target(
    location: str,
    origin: tuple[str, str, str, int],
    route_path: str,
) -> str | None:
    try:
        base = f"{origin[0]}{route_path}"
        target_url = urljoin(base, location)
        target = urlsplit(target_url)
        origin_parts = urlsplit(origin[0])
        target_port = target.port
        origin_port = origin_parts.port
        target_hostname = target.hostname
        origin_hostname = origin_parts.hostname
    except ValueError:
        return None
    if (
        target.scheme.casefold() != origin_parts.scheme.casefold()
        or (target_hostname or "").casefold() != (origin_hostname or "").casefold()
        or target_port != origin_port
        or target.username is not None
        or target.password is not None
        or target.fragment and len(target.fragment) > 512
        or "%" in target.path
        or "\\" in target.path
    ):
        return None
    allowed_paths = set(ELIGIBLE_ROUTES) | set(ASSETS_BY_PATH)
    if target.path not in allowed_paths:
        return None
    try:
        query_keys = {key.casefold() for key, _ in parse_qsl(target.query, keep_blank_values=True)}
    except ValueError:
        return None
    if query_keys & _SENSITIVE_QUERY_KEYS or any(key.endswith("_token") for key in query_keys):
        return None
    return target.path + (f"?{target.query}" if target.query else "") + (
        f"#{target.fragment}" if target.fragment else ""
    )


def _body_chunks(upstream: httpx.Response, maximum: int) -> Iterator[bytes] | None:
    advertised_size = upstream.headers.get("Content-Length")
    if advertised_size and advertised_size.isdecimal() and int(advertised_size) > maximum:
        return None
    chunks: list[bytes] = []
    total = 0
    try:
        for chunk in upstream.iter_bytes():
            total += len(chunk)
            if total > maximum:
                return None
            chunks.append(chunk)
    except httpx.HTTPError:
        return None
    return iter(chunks)


def _http_client(timeout: httpx.Timeout) -> httpx.Client:
    return httpx.Client(
        timeout=timeout, follow_redirects=False, trust_env=False, max_redirects=0
    )


def _fetch(
    request: HttpRequest,
    path: str,
    *,
    query: str = "",
    is_asset: bool = False,
    asset: dict[str, object] | None = None,
) -> HttpResponse:
    origin = _origin()
    if not settings.P6_LEGACY_FALLBACK_ENABLED:
        return HttpResponse("Not found.", status=404, content_type="text/plain")
    if (
        origin is None
        or not ROUTE_INVENTORY_VALID
        or not rollback_routes_valid()
        or not DOCUMENT_SHA256
        or not ASSET_INVENTORY
        or _targets_this_site(request, origin)
        or request.headers.get("X-Legacy-Proxy") == "1"
    ):
        return _error()

    if is_asset and asset is None:
        return HttpResponse("Not found.", status=404, content_type="text/plain")
    asset_record: dict[str, object] = asset if asset is not None else {}
    if is_asset and not query:
        query_string = ""
    else:
        query_string = f"?{query}" if query else ""
    url = f"{origin[0]}{path}{query_string}"
    forward_headers: dict[str, str] = {}
    for name in ("Accept", "Accept-Language"):
        value = request.headers.get(name)
        if value and "\r" not in value and "\n" not in value:
            forward_headers[name] = value[:256]
    if is_asset:
        for name in ("If-None-Match", "If-Modified-Since"):
            value = request.headers.get(name)
            if value and "\r" not in value and "\n" not in value:
                forward_headers[name] = value[:256]
    timeout = httpx.Timeout(8.0, connect=2.0, read=6.0, write=2.0, pool=2.0)
    method = request.method if request.method in {"GET", "HEAD"} else "GET"
    try:
        with _http_client(timeout) as client:
            with client.stream(method, url, headers=forward_headers) as upstream:
                if upstream.status_code in {301, 302, 303, 307, 308}:
                    destination = _redirect_target(
                        upstream.headers.get("Location", ""), origin, path
                    )
                    if destination is None:
                        return _error(502)
                    response = HttpResponse(status=upstream.status_code)
                    response["Location"] = destination
                    response["Cache-Control"] = "no-store"
                    response["X-Legacy-Proxy"] = "1"
                    logger.info("Legacy redirect path=%s status=%s", path, upstream.status_code)
                    return response
                if upstream.status_code == 304 and is_asset:
                    response = HttpResponse(status=304)
                    response["ETag"] = upstream.headers.get("ETag", "")
                    response["Cache-Control"] = upstream.headers.get(
                        "Cache-Control", "public, max-age=300"
                    )
                    response["X-Legacy-Proxy"] = "1"
                    return response
                if upstream.status_code != 200:
                    return _error(502)

                expected_content_type = (
                    str(asset_record["content_type"]) if is_asset else "text/html"
                )
                actual_content_type = upstream.headers.get("Content-Type", "").split(";", 1)[0]
                if is_asset and actual_content_type != expected_content_type:
                    return _error(502)
                if not is_asset and actual_content_type not in {
                    "text/html",
                    "application/xhtml+xml",
                }:
                    return _error(502)
                maximum = MAX_ASSET_BYTES if is_asset else MAX_PAGE_BYTES
                chunks = iter(()) if request.method == "HEAD" else _body_chunks(upstream, maximum)
                if chunks is None:
                    return _error(502)
                content = b"".join(chunks)
                if is_asset:
                    if request.method != "HEAD" and (
                        len(content) != asset_record["size"]
                        or hashlib.sha256(content).hexdigest() != asset_record["sha256"]
                    ):
                        return _error(502)
                elif request.method != "HEAD" and (
                    hashlib.sha256(content).hexdigest() != DOCUMENT_SHA256
                ):
                    return _error(502)
                response = HttpResponse(
                    content=content,
                    status=200,
                    content_type="text/html; charset=utf-8"
                    if not is_asset
                    else str(asset_record["content_type"]),
                )
                for name, value in _response_headers(upstream, is_asset=is_asset).items():
                    response[name] = value
                response["Content-Length"] = str(
                    len(content) if request.method != "HEAD" else (
                        asset_record["size"] if is_asset else DOCUMENT_SIZE
                    )
                )
                response["X-Legacy-Proxy"] = "1"
                logger.info("Legacy response path=%s status=200", path)
                return response
    except httpx.RemoteProtocolError as error:
        logger.warning(
            "Legacy upstream response invalid path=%s error=%s",
            path,
            type(error).__name__,
        )
        return _error(502)
    except (httpx.TimeoutException, httpx.RequestError, OSError) as error:
        logger.warning("Legacy upstream unavailable path=%s error=%s", path, type(error).__name__)
        return _error()


def legacy_page(request: HttpRequest, *, route_path: str) -> HttpResponse:
    if request.method not in {"GET", "HEAD"}:
        response = _error(405)
        response["Allow"] = "GET, HEAD"
        return response
    if route_path not in effective_fallback_routes():
        return HttpResponse("Not found.", status=404, content_type="text/plain")
    if not settings.P6_LEGACY_FALLBACK_ENABLED:
        return HttpResponse("Not found.", status=404, content_type="text/plain")
    valid, slash_alias, query = _valid_request_path(request, route_path)
    if not valid:
        return HttpResponse("Invalid request path.", status=400, content_type="text/plain")
    if slash_alias:
        location = route_path + (f"?{query}" if query else "")
        response = HttpResponse(status=308)
        response["Location"] = location
        response["Cache-Control"] = "no-store"
        return response
    return _fetch(request, route_path, query=query)


def legacy_asset(request: HttpRequest, *, asset_path: str) -> HttpResponse:
    path = f"/{asset_path}"
    asset = ASSETS_BY_PATH.get(path)
    if asset is None:
        return HttpResponse("Not found.", status=404, content_type="text/plain")
    if request.method not in {"GET", "HEAD"}:
        response = HttpResponse("Method not allowed.", status=405, content_type="text/plain")
        response["Allow"] = "GET, HEAD"
        return response
    valid, slash_alias, query = _valid_request_path(request, path)
    if not valid or slash_alias or query:
        return HttpResponse("Invalid asset request.", status=400, content_type="text/plain")
    return _fetch(request, path, is_asset=True, asset=asset)


def url_patterns(rollback_routes: frozenset[str] | None = None) -> list[URLPattern]:
    patterns: list[URLPattern] = []
    for route in effective_fallback_routes(rollback_routes):
        route_pattern = r"^$" if route == "/" else rf"^{re.escape(route.lstrip('/'))}/?$"
        patterns.append(
            re_path(
                route_pattern,
                legacy_page,
                {"route_path": route},
                name=f"legacy-{route.strip('/') or 'root'}",
            )
        )
    for path in ASSETS_BY_PATH:
        patterns.append(
            re_path(
                rf"^{re.escape(path.lstrip('/'))}$",
                legacy_asset,
                {"asset_path": path.lstrip("/")},
                name=f"legacy-asset-{Path(path).name.replace('.', '-')}",
            )
        )
    return patterns
