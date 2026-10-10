from django.urls import path

from .views import synthesize, transcribe

urlpatterns = [
    path("transcribe", transcribe, name="transcribe-no-slash"),
    path("transcribe/", transcribe, name="transcribe"),
    path("tts", synthesize, name="tts-no-slash"),
    path("tts/", synthesize, name="tts"),
]
