"""Small rotating logs whose messages never include request data or credentials."""

from __future__ import annotations

import logging
from pathlib import Path


class SanitizedOperationalFilter(logging.Filter):
    """Replace variable application messages with fixed event labels."""

    _EVENTS = {
        "apps.ai.services": "ai_provider",
        "apps.ai.views": "ai_service_request",
        "apps.core.views": "readiness_check",
        "apps.speech.views": "speech_service_request",
    }

    def filter(self, record: logging.LogRecord) -> bool:
        event = self._EVENTS.get(record.name, "framework")
        record.msg = f"event={event} level={record.levelname.lower()}"
        record.args = ()
        record.exc_info = None
        record.exc_text = None
        record.stack_info = None
        return True


def operational_logging(base_dir: Path, configured_path: str = "") -> dict[str, object]:
    """Build bounded console and rotating-file logging without request values."""

    log_path = (
        Path(configured_path)
        if configured_path.strip()
        else base_dir / ".state" / "logs" / "voiceform.log"
    )
    if not log_path.is_absolute():
        log_path = base_dir / log_path
    log_path.parent.mkdir(parents=True, exist_ok=True)

    safe_filter = "config.p10_logging.SanitizedOperationalFilter"
    formatter = {
        "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
        "datefmt": "%Y-%m-%dT%H:%M:%S%z",
    }
    handlers = {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "operational",
            "filters": ["sanitized"],
        },
        "rotating_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(log_path),
            "maxBytes": 1_000_000,
            "backupCount": 3,
            "encoding": "utf-8",
            "level": "INFO",
            "formatter": "operational",
            "filters": ["sanitized"],
        },
    }
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {"sanitized": {"()": safe_filter}},
        "formatters": {"operational": formatter},
        "handlers": handlers,
        "root": {"handlers": ["console", "rotating_file"], "level": "WARNING"},
        "loggers": {
            "apps": {
                "handlers": ["console", "rotating_file"],
                "level": "INFO",
                "propagate": False,
            },
            "django": {
                "handlers": ["console", "rotating_file"],
                "level": "WARNING",
                "propagate": False,
            },
        },
    }
