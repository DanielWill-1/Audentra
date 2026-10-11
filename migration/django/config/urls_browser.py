"""Test-only URL configuration for DEBUG=False browser captures."""

from django.contrib.staticfiles.views import serve
from django.urls import re_path

from config.urls import urlpatterns as application_urlpatterns

urlpatterns = [
    re_path(r"^static/(?P<path>.*)$", serve, {"insecure": True}),
    *application_urlpatterns,
]
