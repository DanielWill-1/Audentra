"""Isolated browser-check settings with explicit static serving and test data."""

import os
import tempfile
from pathlib import Path

from .base import MIDDLEWARE as BASE_MIDDLEWARE
from .test import *  # noqa: F403
from .test import DATABASES as TEST_DATABASES

ROOT_URLCONF = "config.urls_browser"
P7_BROWSER_MODE = True

DATABASES = TEST_DATABASES.copy()
DATABASES["default"] = {
    "ENGINE": "django.db.backends.sqlite3",
    "NAME": os.environ.get(
        "P7_BROWSER_DB_PATH",
        str(Path(tempfile.gettempdir()) / "voiceform-p7-browser.sqlite3"),
    ),
}

MIDDLEWARE = list(BASE_MIDDLEWARE)
MIDDLEWARE.insert(
    MIDDLEWARE.index("apps.accounts.middleware.SupabasePrincipalMiddleware"),
    "config.browser_middleware.P7FixtureAuthenticationMiddleware",
)
