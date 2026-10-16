"""Loopback-only profile that ignores hosted database and Auth settings."""

import os
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".state" / "local-supabase.env", override=False)

# The base settings module also loads .env. Mask hosted connection settings first;
# this profile will only use the separately generated P10_LOCAL_* values.
for _name in (
    "DJANGO_DATABASE_URL",
    "DJANGO_SUPABASE_DATABASE_URL",
    "DJANGO_SECRET_KEY",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
):
    os.environ[_name] = ""

from .base import _database_from_url  # noqa: E402
from .demo_http import *  # noqa: E402, F403


def _database_config(value: str, role: str, schema: str) -> dict[str, object]:
    parsed = urlsplit(value)
    if (
        parsed.scheme in {"postgres", "postgresql"}
        and parsed.hostname in {"127.0.0.1", "localhost", "::1"}
        and parsed.port == 54322
        and parsed.username == role
        and parsed.path == "/postgres"
        and parsed.password
        and parsed.query == "sslmode=disable"
    ):
        return _database_from_url(value, schema)
    return {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}


SECRET_KEY = os.getenv("P10_LOCAL_DJANGO_SECRET_KEY", "")
SUPABASE_URL = os.getenv("P10_LOCAL_SUPABASE_URL", "").strip()
SUPABASE_PUBLISHABLE_KEY = os.getenv("P10_LOCAL_SUPABASE_PUBLISHABLE_KEY", "").strip()
DATABASES = {
    "default": _database_config(
        os.getenv("P10_LOCAL_DJANGO_DATABASE_URL", ""), "django_app", "django"
    ),
    "supabase": _database_config(
        os.getenv("P10_LOCAL_SUPABASE_DATABASE_URL", ""), "django_data", "public"
    ),
}
P10_LOCAL_SUPABASE_PROFILE = True
