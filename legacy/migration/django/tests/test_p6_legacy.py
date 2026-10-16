from __future__ import annotations

import gzip
import hashlib
from collections.abc import Callable
from typing import Any

import httpx
import pytest
from apps.core import legacy
from django.test import Client, override_settings

PREVIEW_ORIGIN = "http://127.0.0.1:5173"
DJANGO_ORIGIN = "http://127.0.0.1:8000"
INDEX_BYTES = b"<!doctype html><title>synthetic reviewed document</title>"
CSS_BYTES = b"body{color:#123456}"
TEST_ASSET_PATH = "/assets/index-CFJQDHLM.css"
urlpatterns = legacy.url_patterns(frozenset({"/features", "/pricing"}))


@pytest.fixture(autouse=True)
def synthetic_reviewed_payloads(monkeypatch: pytest.MonkeyPatch) -> None:
    asset_record = {
        "path": TEST_ASSET_PATH,
        "size": len(CSS_BYTES),
        "sha256": hashlib.sha256(CSS_BYTES).hexdigest(),
        "content_type": "text/css",
    }
    monkeypatch.setattr(legacy, "DOCUMENT_SHA256", hashlib.sha256(INDEX_BYTES).hexdigest())
    monkeypatch.setattr(legacy, "DOCUMENT_SIZE", len(INDEX_BYTES))
    monkeypatch.setattr(legacy, "ASSET_INVENTORY", (asset_record,))
    monkeypatch.setattr(legacy, "ASSETS_BY_PATH", {TEST_ASSET_PATH: asset_record})


class RawPathClient(Client):
    def generic(self, method: str, path: str, *args: Any, **kwargs: Any) -> Any:  # type: ignore[override]
        kwargs.setdefault("RAW_URI", path)
        return super().generic(method, path, *args, **kwargs)


def mock_upstream(
    monkeypatch: pytest.MonkeyPatch,
    handler: Callable[[httpx.Request], httpx.Response],
) -> list[httpx.Request]:
    requests: list[httpx.Request] = []

    def record(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return handler(request)

    transport = httpx.MockTransport(record)

    def client_factory(timeout: httpx.Timeout) -> httpx.Client:
        return httpx.Client(
            transport=transport,
            timeout=timeout,
            follow_redirects=False,
            trust_env=False,
            max_redirects=0,
        )

    monkeypatch.setattr(legacy, "_http_client", client_factory)
    return requests


def upstream_config(**changes: Any) -> Any:
    values = {
        "DEBUG": True,
        "ALLOWED_HOSTS": ["localhost", "127.0.0.1", "testserver"],
        "P6_LEGACY_FALLBACK_ENABLED": True,
        "P6_LEGACY_ORIGIN": PREVIEW_ORIGIN,
        "DJANGO_PUBLIC_ORIGIN": DJANGO_ORIGIN,
        "P7_LEGACY_ROLLBACK_ROUTES": frozenset(),
        "P6_PREVIEW_ENABLED": False,
        "ROOT_URLCONF": __name__,
    }
    if changes.get("P7_LEGACY_ROLLBACK_ROUTES") is None:
        values["P7_LEGACY_ROLLBACK_ROUTES"] = frozenset({"/features", "/pricing"})
    values.update(changes)
    return override_settings(**values)


def ok_response(request: httpx.Request, content: bytes = INDEX_BYTES) -> httpx.Response:
    return httpx.Response(
        200,
        headers={"Content-Type": "text/html; charset=utf-8", "Set-Cookie": "legacy=secret"},
        content=content,
        request=request,
    )


@pytest.mark.django_db(databases=[])
def test_page_get_and_head_forward_only_fixed_path_and_safe_headers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with upstream_config():
        requests = mock_upstream(monkeypatch, ok_response)
        client = RawPathClient()
        response = client.get(
            "/features?topic=synthetic",
            HTTP_HOST="localhost:8000",
            HTTP_AUTHORIZATION="Bearer private-token",
            HTTP_COOKIE="audentra_session=private; csrftoken=private",
            HTTP_X_CSRFTOKEN="private-csrf-token",
            HTTP_X_FORWARDED_FOR="192.0.2.99",
        )
        head = client.head("/pricing", HTTP_HOST="localhost:8000")

    assert response.status_code == 200
    assert response.content == INDEX_BYTES
    assert response.headers["X-Legacy-Proxy"] == "1"
    assert response.headers["Cache-Control"] == "no-store"
    assert "Set-Cookie" not in response.headers
    assert head.status_code == 200 and head.content == b""
    assert head.headers["Content-Length"] == str(len(INDEX_BYTES))
    assert [request.method for request in requests] == ["GET", "HEAD"]
    assert [request.url.path for request in requests] == ["/features", "/pricing"]
    assert b"topic=synthetic" in requests[0].url.query
    for request in requests:
        assert "authorization" not in request.headers
        assert "cookie" not in request.headers
        assert "x-csrftoken" not in request.headers
        assert "x-forwarded-for" not in request.headers
        assert request.url.host == "127.0.0.1"
        assert request.url.port == 5173
        assert request.content == b""


@pytest.mark.django_db(databases=[])
def test_slash_alias_is_canonicalized_locally_without_upstream(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with upstream_config():
        requests = mock_upstream(monkeypatch, ok_response)
        response = RawPathClient().get("/features/?topic=voice", HTTP_HOST="localhost:8000")

    assert response.status_code == 308
    assert response.headers["Location"] == "/features?topic=voice"
    assert requests == []


@pytest.mark.django_db(databases=[])
def test_non_get_methods_and_unknown_or_reserved_paths_never_reach_upstream(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with upstream_config():
        requests = mock_upstream(monkeypatch, ok_response)
        client = RawPathClient()
        post = client.post("/features", {"body": "must not forward"}, HTTP_HOST="localhost:8000")
        responses = {
            path: client.get(path, HTTP_HOST="localhost:8000")
            for path in (
                "/unknown",
                "/reset-password",
                "/api/not-a-route",
                "/static/private.css",
                "/__p6/public",
                "/src/main.tsx",
                "/assets/index-not-inventory.js",
            )
        }

    assert post.status_code == 405
    assert post.headers["Allow"] == "GET, HEAD"
    assert all(response.status_code == 404 for response in responses.values())
    assert requests == []


@pytest.mark.django_db(databases=[])
def test_encoded_path_and_auth_callback_queries_are_rejected_before_forwarding(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with upstream_config():
        requests = mock_upstream(monkeypatch, ok_response)
        client = RawPathClient()
        encoded = client.get("/%66eatures", HTTP_HOST="localhost:8000")
        callback = client.get("/features?access_token=private-value", HTTP_HOST="localhost:8000")

    assert encoded.status_code in {400, 404}
    assert callback.status_code == 400
    assert b"private-value" not in callback.content
    assert requests == []


@pytest.mark.django_db(databases=[])
def test_fallback_disabled_invalid_origin_and_self_target_fail_closed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests = mock_upstream(monkeypatch, ok_response)
    with upstream_config(P6_LEGACY_FALLBACK_ENABLED=False):
        disabled = RawPathClient().get("/features", HTTP_HOST="localhost:8000")
    with upstream_config(P6_LEGACY_ORIGIN="http://example.test:5173"):
        remote_http = RawPathClient().get("/features", HTTP_HOST="localhost:8000")
    with upstream_config(P6_LEGACY_ORIGIN="http://user:pass@127.0.0.1:5173"):
        credentials = RawPathClient().get("/features", HTTP_HOST="localhost:8000")
    with upstream_config(P6_LEGACY_ORIGIN="http://127.0.0.1:8000"):
        self_target = RawPathClient().get("/features", HTTP_HOST="localhost:8000")
    with upstream_config(P6_LEGACY_ORIGIN="http://127.0.0.1:5173/path"):
        path_origin = RawPathClient().get("/features", HTTP_HOST="localhost:8000")
    with upstream_config(P6_LEGACY_ORIGIN=""):
        missing_origin = RawPathClient().get("/features", HTTP_HOST="localhost:8000")
    with upstream_config(P7_LEGACY_ROLLBACK_ROUTES=frozenset({"/not-a-route"})):
        invalid_owner = RawPathClient().get("/features", HTTP_HOST="localhost:8000")
    with upstream_config():
        marker_loop = RawPathClient().get(
            "/features", HTTP_HOST="localhost:8000", HTTP_X_LEGACY_PROXY="1"
        )

    responses = (
        remote_http,
        credentials,
        self_target,
        path_origin,
        missing_origin,
        invalid_owner,
        marker_loop,
    )
    assert disabled.status_code == 404
    assert all(
        response.status_code == (404 if response is invalid_owner else 503)
        for response in responses
    )
    assert requests == []


@pytest.mark.django_db(databases=[])
def test_page_body_digest_size_and_redirects_are_bounded(monkeypatch: pytest.MonkeyPatch) -> None:
    with upstream_config():
        wrong_body = mock_upstream(
            monkeypatch,
            lambda request: ok_response(request, b"<html>unreviewed</html>"),
        )
        mismatch = RawPathClient().get("/features", HTTP_HOST="localhost:8000")
        assert mismatch.status_code == 502
        assert wrong_body

        def large_response(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                headers={
                    "Content-Type": "text/html",
                    "Content-Length": str(legacy.MAX_PAGE_BYTES + 1),
                },
                stream=httpx.ByteStream(b"x"),
                request=request,
            )

        mock_upstream(monkeypatch, large_response)
        oversized = RawPathClient().get("/features", HTTP_HOST="localhost:8000")
        assert oversized.status_code == 502

        mock_upstream(
            monkeypatch,
            lambda request: httpx.Response(
                302, headers={"Location": "/about?topic=ok"}, request=request
            ),
        )
        local_redirect = RawPathClient().get("/features", HTTP_HOST="localhost:8000")
        assert local_redirect.status_code == 302
        assert local_redirect.headers["Location"] == "/about?topic=ok"

        mock_upstream(
            monkeypatch,
            lambda request: httpx.Response(
                302, headers={"Location": "https://evil.test/"}, request=request
            ),
        )
        external_redirect = RawPathClient().get("/features", HTTP_HOST="localhost:8000")

    assert external_redirect.status_code == 502
    assert "Location" not in external_redirect.headers


@pytest.mark.django_db(databases=[])
@pytest.mark.parametrize("location", ["http://[invalid", "http://127.0.0.1:invalid/about"])
def test_malformed_upstream_redirect_is_sanitized_without_following(
    monkeypatch: pytest.MonkeyPatch,
    location: str,
) -> None:
    requests = mock_upstream(
        monkeypatch,
        lambda request: httpx.Response(302, headers={"Location": location}, request=request),
    )

    with upstream_config():
        response = RawPathClient().get("/features", HTTP_HOST="localhost:8000")

    assert response.status_code == 502
    assert response.content == b"Legacy preview is unavailable."
    assert "Location" not in response.headers
    assert len(requests) == 1


@pytest.mark.django_db(databases=[])
def test_asset_proxy_uses_exact_inventory_digest_and_conditional_cache(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    asset = legacy.ASSETS_BY_PATH[TEST_ASSET_PATH]
    expected = CSS_BYTES
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        if request.headers.get("If-None-Match") == '"reviewed-css"':
            return httpx.Response(304, headers={"ETag": '"reviewed-css"'}, request=request)
        return httpx.Response(
            200,
            headers={"Content-Type": "text/css", "Set-Cookie": "legacy=private"},
            content=expected,
            request=request,
        )

    with upstream_config():
        mock_upstream(monkeypatch, handler)
        client = RawPathClient()
        response = client.get(TEST_ASSET_PATH, HTTP_HOST="localhost:8000")
        not_modified = client.get(
            TEST_ASSET_PATH,
            HTTP_HOST="localhost:8000",
            HTTP_IF_NONE_MATCH='"reviewed-css"',
        )

    assert response.status_code == 200
    assert response.content == expected and len(expected) == asset["size"]
    assert response.headers["Content-Type"] == "text/css"
    assert "Set-Cookie" not in response.headers
    assert not_modified.status_code == 304
    assert not_modified.content == b""
    assert [item.url.path for item in captured] == [
        TEST_ASSET_PATH,
        TEST_ASSET_PATH,
    ]


@pytest.mark.django_db(databases=[])
def test_asset_digest_mismatch_and_redirect_outside_inventory_are_blocked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with upstream_config():
        mock_upstream(
            monkeypatch,
            lambda request: httpx.Response(
                200, headers={"Content-Type": "text/css"}, content=b"wrong", request=request
            ),
        )
        mismatch = RawPathClient().get(TEST_ASSET_PATH, HTTP_HOST="localhost:8000")
        mock_upstream(
            monkeypatch,
            lambda request: httpx.Response(
                302, headers={"Location": "/src/main.tsx"}, request=request
            ),
        )
        redirect = RawPathClient().get(TEST_ASSET_PATH, HTTP_HOST="localhost:8000")

    assert mismatch.status_code == 502
    assert redirect.status_code == 502


@pytest.mark.django_db(databases=[])
def test_compressed_upstream_body_is_decoded_and_length_matches_returned_bytes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    compressed = gzip.compress(INDEX_BYTES)

    def compressed_response(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={
                "Content-Type": "text/html; charset=utf-8",
                "Content-Encoding": "gzip",
                "Content-Length": str(len(compressed)),
            },
            content=compressed,
            request=request,
        )

    with upstream_config():
        mock_upstream(monkeypatch, compressed_response)
        response = RawPathClient().get("/features", HTTP_HOST="localhost:8000")

    assert response.status_code == 200
    assert response.content == INDEX_BYTES
    assert response.headers["Content-Length"] == str(len(INDEX_BYTES))
    assert "Content-Encoding" not in response.headers


@pytest.mark.django_db(databases=[])
def test_upstream_timeout_returns_sanitized_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectTimeout("private upstream detail", request=request)

    with upstream_config():
        requests = mock_upstream(monkeypatch, timeout)
        response = RawPathClient().get("/features?topic=synthetic", HTTP_HOST="localhost:8000")

    assert response.status_code == 503
    assert response.content == b"Legacy preview is unavailable."
    assert b"private upstream detail" not in response.content
    assert len(requests) == 1


@pytest.mark.django_db(databases=[])
def test_missing_raw_request_target_fails_closed(monkeypatch: pytest.MonkeyPatch) -> None:
    with upstream_config():
        requests = mock_upstream(monkeypatch, ok_response)
        response = Client().get("/features", HTTP_HOST="localhost:8000")

    assert response.status_code == 400
    assert requests == []
