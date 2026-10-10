from apps.core.views import healthz
from django.urls import include, path

urlpatterns = [
    path("healthz", healthz, name="healthz"),
    path("", include("apps.accounts.urls")),
    path("api/", include("apps.speech.urls")),
    path("api/", include("apps.ai.urls")),
]
