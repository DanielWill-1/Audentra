"""Run the public demo on Render behind its TLS-terminating load balancer."""

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from p10_preflight import inspect_configuration

PROJECT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_DIR / ".env", override=False)


def _environment_int(name: str, default: int) -> int | None:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return None


def main() -> int:
    port = _environment_int("PORT", 10000)
    threads = _environment_int("P10_THREADS", 4)
    invalid_settings = [
        name for name, value in (("PORT", port), ("P10_THREADS", threads)) if value is None
    ]
    if invalid_settings:
        print(
            json.dumps(
                {"ok": False, "failure": "invalid_integer_setting", "settings": invalid_settings}
            )
        )
        return 2
    assert port is not None and threads is not None
    if not 1 <= port <= 65535 or not 1 <= threads <= 32:
        print(json.dumps({"ok": False, "failure": "Render_server_limits_out_of_range"}))
        return 2

    os.environ["DJANGO_SETTINGS_MODULE"] = "config.settings.render"
    result = inspect_configuration("render")
    print(json.dumps(result, sort_keys=True), flush=True)
    if not result["ok"]:
        return 2

    from django.conf import settings
    from django.core.wsgi import get_wsgi_application
    from waitress import serve

    if settings.DEBUG or settings.P3_SERVICES_ENABLED:
        print(json.dumps({"ok": False, "failure": "unsafe_render_settings"}))
        return 2

    application = get_wsgi_application()
    server_options: dict[str, object] = {
        "host": "0.0.0.0",
        "port": port,
        "threads": threads,
        "connection_limit": 128,
        "channel_timeout": 60,
        "max_request_header_size": 32_768,
        "max_request_body_size": settings.P3_MAX_REQUEST_BYTES,
        "expose_tracebacks": False,
        "ident": None,
        "clear_untrusted_proxy_headers": True,
        "url_scheme": "https",
    }
    print(
        json.dumps(
            {
                "event": "server_start",
                "profile": "render",
                "bind": f"0.0.0.0:{port}",
                "threads": threads,
                "processes": 1,
                "max_request_body_bytes": settings.P3_MAX_REQUEST_BYTES,
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
