from apps.application.urls import url_patterns as application_url_patterns
from apps.core.legacy import url_patterns as legacy_url_patterns
from apps.core.views import healthz, livez, preview_urlpatterns, readyz
from apps.pages.urls import url_patterns as page_url_patterns
from django.urls import include, path

urlpatterns = [
    path("livez", livez, name="livez"),
    path("readyz", readyz, name="readyz"),
    path("healthz", healthz, name="healthz"),
    path("", include("apps.accounts.urls")),
    path("api/", include("apps.speech.urls")),
    path("api/", include("apps.ai.urls")),
    *preview_urlpatterns,
    *application_url_patterns(),
    *legacy_url_patterns(),
    *page_url_patterns(),
]
