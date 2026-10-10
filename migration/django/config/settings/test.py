"""Disposable test databases; never use the hosted URLs loaded by base settings."""

from .base import *  # noqa: F403

DEBUG = False
DATABASES = {
    alias: {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}
    for alias in ("default", "supabase")
}
