from unittest.mock import call, patch

from apps.api.boundary import PRIVATE_PROXY_HEADER, check_service_boundary
from django.http import HttpRequest
from django.test import Client, RequestFactory, override_settings


def test_liveness_does_not_depend_on_data_readiness() -> None:
    with patch("apps.core.views.inspect_database_alias", side_effect=AssertionError) as inspect:
        response = Client().get("/livez", HTTP_HOST="127.0.0.1")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    inspect.assert_not_called()


def test_readyz_and_legacy_healthz_report_both_database_aliases() -> None:
    with patch("apps.core.views.inspect_database_alias", return_value={}) as inspect:
        ready = Client().get("/readyz", HTTP_HOST="127.0.0.1")
        legacy = Client().get("/healthz", HTTP_HOST="127.0.0.1")

    assert ready.status_code == legacy.status_code == 200
    assert (
        ready.json()
        == legacy.json()
        == {
            "status": "ok",
            "checks": {"default": "ok", "supabase": "ok"},
        }
    )
    assert inspect.call_args_list == [
        call("default"),
        call("supabase"),
        call("default"),
        call("supabase"),
    ]


def test_service_proxy_token_is_required_and_forwarded_ip_is_not_read_directly() -> None:
    factory = RequestFactory()
    proxy_token = "proxy-token-for-p10-tests-that-is-long-enough"
    settings = {
        "P3_SERVICES_ENABLED": True,
        "P3_SERVICE_ACCESS_MODE": "trusted-proxy",
        "P3_PROXY_TOKEN": proxy_token,
        "P3_ALLOWED_ORIGINS": ["https://app.example.invalid"],
        "P3_API_MARKER": "test-request-marker",
        "P3_MAX_REQUEST_BYTES": 1024,
        "P3_RATE_LIMIT_REQUESTS": 30,
        "P3_RATE_LIMIT_WINDOW_SECONDS": 60,
    }

    def request(*, proxy_token: str = "") -> HttpRequest:
        headers = {
            "HTTP_HOST": "127.0.0.1",
            "HTTP_ORIGIN": "https://app.example.invalid",
            "HTTP_X_INTERNAL_API_TOKEN": "test-request-marker",
            "HTTP_X_FORWARDED_FOR": "127.0.0.1",
            "REMOTE_ADDR": "203.0.113.19",
        }
        if proxy_token:
            headers[f"HTTP_{PRIVATE_PROXY_HEADER.upper().replace('-', '_')}"] = proxy_token
        result = factory.post("/api/transcribe/", b"{}", content_type="application/json")
        result.META.update(headers)
        return result

    with (
        override_settings(**settings),
        patch("apps.api.boundary.allow_request", return_value=True) as allow,
    ):
        rejected = check_service_boundary(request())
        accepted = check_service_boundary(request(proxy_token=proxy_token))

    assert rejected is not None and rejected.status_code == 403
    assert accepted is None
    allow.assert_called_once_with("203.0.113.19")


def test_forwarded_proto_does_not_make_a_direct_request_secure() -> None:
    with override_settings(SECURE_PROXY_SSL_HEADER=None):
        request = RequestFactory().get(
            "/",
            HTTP_X_FORWARDED_PROTO="https",
            REMOTE_ADDR="203.0.113.19",
        )

    assert not request.is_secure()
