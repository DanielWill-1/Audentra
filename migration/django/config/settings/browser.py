"""Isolated browser-check settings with explicit static serving and test data."""

from .base import MIDDLEWARE as BASE_MIDDLEWARE
from .test import *  # noqa: F403

ROOT_URLCONF = "config.urls_browser"

MIDDLEWARE = list(BASE_MIDDLEWARE)
MIDDLEWARE.insert(
    MIDDLEWARE.index("apps.accounts.middleware.SupabasePrincipalMiddleware"),
    "config.browser_middleware.P7FixtureAuthenticationMiddleware",
)
