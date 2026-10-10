from django.urls import path

from .views import extract_data

urlpatterns = [
    path("ai/extract", extract_data, name="ai-extract-no-slash"),
    path("ai/extract/", extract_data, name="ai-extract"),
]
