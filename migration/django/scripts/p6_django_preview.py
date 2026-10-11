"""Run Django locally while preserving the raw request target for P6 checks."""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit
from wsgiref.simple_server import WSGIRequestHandler, WSGIServer, make_server


class RawTargetRequestHandler(WSGIRequestHandler):
    def get_environ(self) -> dict[str, Any]:
        environ = super().get_environ()
        environ["RAW_URI"] = self.path
        return environ

    def log_message(self, format_string: str, *args: object) -> None:
        del format_string, args
        path = urlsplit(self.path).path[:200]
        logging.getLogger("p6-django-preview").info(
            "django request method=%s path=%s", self.command, path
        )


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    project_root = str(Path(__file__).resolve().parents[1])
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    from django.conf import settings
    from django.contrib.staticfiles.handlers import StaticFilesHandler
    from django.core.wsgi import get_wsgi_application

    if not settings.DEBUG:
        raise SystemExit("The P6 preview runner is restricted to DEBUG settings.")
    application = get_wsgi_application()
    application = StaticFilesHandler(application)
    server: WSGIServer = make_server(
        "127.0.0.1", 8000, application, handler_class=RawTargetRequestHandler
    )
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    logging.getLogger("p6-django-preview").info(
        "P6 Django preview listening on 127.0.0.1:8000"
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
