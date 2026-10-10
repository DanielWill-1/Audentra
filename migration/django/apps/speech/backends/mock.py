from pathlib import Path

MOCK_TRANSCRIPT = "This is a mock transcript for P3 service verification."
MOCK_AUDIO = (Path(__file__).with_name("mock-silence.mp3")).read_bytes()


def transcribe(_audio: bytes, _mime_type: str) -> str:
    return MOCK_TRANSCRIPT


def synthesize(_text: str, _voice: dict[str, object], _options: dict[str, object]) -> bytes:
    return MOCK_AUDIO
