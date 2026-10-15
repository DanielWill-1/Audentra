"""Run the supported one-process Waitress server on a loopback interface."""

from __future__ import annotations

import argparse
import ipaddress
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from p10_preflight import PROFILE_MODULES, inspect_configuration

PROJECT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_DIR / ".env", override=False)


def _loopback_address(value: str) -> str | None:
    if value.casefold() == "localhost":
        return "127.0.0.1"
    try:
        address = ipaddress.ip_address(value)
    except ValueError:
        return None
    return str(address) if address.is_loopback else None


def _environment_int(name: str, default: int) -> int | None:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", choices=sorted(PROFILE_MODULES), required=True)
    parser.add_argument("--bind", default=os.getenv("P10_BIND_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int)
    parser.add_argument("--threads", type=int)
    args = parser.parse_args()

    bind = _loopback_address(args.bind)
    if bind is None:
        print(json.dumps({"ok": False, "failure": "P10_BIND_HOST_must_be_loopback"}))
        return 2
    port = args.port if args.port is not None else _environment_int("P10_BIND_PORT", 8000)
    threads = args.threads if args.threads is not None else _environment_int("P10_THREADS", 8)
    invalid_integer_settings = [
        name for name, value in (("P10_BIND_PORT", port), ("P10_THREADS", threads)) if value is None
    ]
    if invalid_integer_settings:
        print(
            json.dumps(
                {
                    "ok": False,
                    "failure": "invalid_integer_setting",
                    "settings": invalid_integer_settings,
                }
            )
        )
        return 2
    assert port is not None and threads is not None
    if not 1024 <= port <= 65535 or not 1 <= threads <= 64:
        print(json.dumps({"ok": False, "failure": "P10_server_limits_out_of_range"}))
        return 2

    os.environ["DJANGO_SETTINGS_MODULE"] = PROFILE_MODULES[args.profile]
    result = inspect_configuration(args.profile)
    print(json.dumps(result, sort_keys=True))
    if not result["ok"]:
        return 2

    from django.conf import settings
    from django.core.wsgi import get_wsgi_application
    from waitress import serve

    if settings.DEBUG:
        print(json.dumps({"ok": False, "failure": "DEBUG_must_be_false"}))
        return 2

    server_options: dict[str, object] = {
        "host": bind,
        "port": port,
        "threads": threads,
        "connection_limit": 128,
        "channel_timeout": 60,
        "max_request_header_size": 32_768,
        "max_request_body_size": settings.P3_MAX_REQUEST_BYTES,
        "expose_tracebacks": False,
        "ident": None,
        "clear_untrusted_proxy_headers": True,
    }
    if args.profile == "production":
        server_options.update(
            {
                "url_scheme": "https",
                "trusted_proxy": settings.P10_TRUSTED_PROXY_IP,
                "trusted_proxy_count": 1,
                "trusted_proxy_headers": ["x-forwarded-for"],
                "log_untrusted_proxy_headers": False,
            }
        )
    else:
        server_options["url_scheme"] = "http"

    application = get_wsgi_application()
    print(
        json.dumps(
            {
                "event": "server_start",
                "profile": args.profile,
                "bind": f"{bind}:{port}",
                "threads": threads,
                "processes": 1,
                "max_request_body_bytes": settings.P3_MAX_REQUEST_BYTES,
                "channel_timeout_seconds": 60,
            },
            sort_keys=True,
        ),
        flush=True,
    )
    try:
        serve(application, **server_options)
    except KeyboardInterrupt:
        print(json.dumps({"event": "server_stop", "reason": "keyboard_interrupt"}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
