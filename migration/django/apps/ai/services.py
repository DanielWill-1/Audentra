import logging
from collections.abc import Callable
from typing import Any

from django.conf import settings

from .backends.mock import extract as mock_extract

logger = logging.getLogger(__name__)
Extractor = Callable[[str, list[object], object, list[object]], dict[str, Any]]
AI_FAILURE_RESPONSE = (
    "I'm having trouble processing that right now. Could you please try rephrasing your request?"
)


class AIProviderError(RuntimeError):
    """A real extraction provider failed and the caller must show an error."""


def extract(
    user_input: Any,
    form_fields: Any,
    current_form_data: Any,
    conversation: Any,
    *,
    backend: Extractor | None = None,
    use_mock: bool | None = None,
) -> dict[str, Any]:
    mock_selected = settings.USE_MOCK_AI if use_mock is None else use_mock
    if not isinstance(user_input, str) or not user_input.strip():
        return {"response": AI_FAILURE_RESPONSE, "extractedData": {}}
    if not isinstance(form_fields, list) or not isinstance(conversation, list):
        return {"response": AI_FAILURE_RESPONSE, "extractedData": {}}
    try:
        selected = backend or (mock_extract if mock_selected else None)
        if selected is None:
            from .backends.groq import extract as groq_extract

            selected = groq_extract
        result = selected(user_input, form_fields, current_form_data, conversation)
        response = result.get("response")
        return {
            "response": response if isinstance(response, str) else "",
            "extractedData": result.get("extractedData") or {},
        }
    except AIProviderError:
        raise
    except Exception as error:
        logger.warning("P3 AI extraction failed (%s).", type(error).__name__)
        if not mock_selected:
            raise AIProviderError("AI extraction provider failed") from error
        return {"response": AI_FAILURE_RESPONSE, "extractedData": {}}
