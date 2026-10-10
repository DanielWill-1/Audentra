import os

from .base import *  # noqa: F403

DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"  # noqa: F405
ALLOWED_HOSTS = ["127.0.0.1", "localhost"]  # noqa: F405
