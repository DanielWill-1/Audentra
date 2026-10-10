from typing import Any, cast
from urllib.parse import urlsplit

import httpx
from django.conf import settings

from ..prompts import build_messages


class GroqProviderError(RuntimeError):
    pass


def extract(
    user_input: str,
    form_fields: list[object],
    current_form_data: object,
    conversation: list[object],
) -> dict[str, Any]:
    parsed_url = urlsplit(settings.GROQ_API_URL)
    if (
        parsed_url.scheme != "https"
        or parsed_url.hostname != "api.groq.com"
        or parsed_url.path != "/openai/v1/chat/completions"
        or not settings.GROQ_API_KEY
    ):
        raise GroqProviderError("Groq provider configuration is unavailable")

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": build_messages(user_input, form_fields, current_form_data, conversation),
        "temperature": 0.3,
        "max_tokens": 2048,
        "top_p": 0.9,
        "stream": False,
    }
    try:
        with httpx.Client(timeout=settings.P3_PROVIDER_TIMEOUT_SECONDS) as client:
            response = client.post(
                settings.GROQ_API_URL,
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json=payload,
            )
        response.raise_for_status()
        raw_content = response.json().get("choices", [{}])[0].get("message", {}).get("content")
        if raw_content is not None and not isinstance(raw_content, str):
            raise GroqProviderError("Groq returned an invalid content type")
    except (httpx.HTTPError, ValueError, IndexError, TypeError, KeyError, AttributeError) as error:
        raise GroqProviderError("Groq extraction request failed") from error

    parsed: object | None = None
    try:
        import json

        parsed = cast(object, json.loads(raw_content)) if raw_content is not None else None
    except (ValueError, TypeError):
        parsed = _extract_json(raw_content or "")

    if isinstance(parsed, dict) and isinstance(parsed.get("response"), str):
        return {
            "response": parsed["response"],
            "extractedData": parsed.get("extractedData") or {},
        }
    return {"response": raw_content, "extractedData": {}}


def _extract_json(text: str) -> object | None:
    import json
    import re

    match = re.search(r"\{[\s\S]*\}", text)
    if match is None:
        return None
    try:
        return cast(object, json.loads(match.group(0)))
    except ValueError:
        return None
