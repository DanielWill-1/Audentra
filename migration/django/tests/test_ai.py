from unittest.mock import patch
from uuid import UUID

import httpx
import pytest
from apps.accounts.principals import SupabaseUser
from apps.ai.backends import groq
from apps.ai.backends.groq import _extract_json
from apps.ai.prompts import build_messages, build_system_prompt
from apps.ai.services import AI_FAILURE_RESPONSE, AIProviderError, extract
from apps.api.consent import CLOUD_AI_CONSENT_POLICY_VERSION
from django.test import Client, override_settings


@pytest.fixture(autouse=True)
def service_session(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "apps.api.middleware.authenticate_session",
        lambda _request: SupabaseUser(
            id=UUID("00000000-0000-4000-8000-000000000001"),
            email="synthetic@example.test",
            user_metadata={},
        ),
    )


def test_prompt_contract_and_conversation_order() -> None:
    fields = [
        {"id": "name", "label": "Name", "type": "text", "required": True},
        {"id": "email", "label": "email", "type": "email", "required": False},
    ]
    prompt = build_system_prompt(fields, {"name": "Ada"})
    for expected in (
        "You are a warm, concise assistant helping a person complete a form through conversation.",
        "Ask one short, specific question at a time. Prefer the next unanswered required field.",
        "Do not invent, assume, or silently correct a personal detail.",
        "Use only the fields and allowed options listed below.",
        "Never claim the form was saved; values remain a draft for review.",
        "- id=name, label=Name, type=text, required",
        "- id=email, label=email, type=email",
        'Current draft values:\n{\n  "name": "Ada"\n}',
        '"extractedData": an object keyed by field ID',
    ):
        assert expected in prompt
    assert build_messages(
        "current",
        fields,
        {"name": "Ada"},
        [
            {"type": "system", "content": "omit"},
            {"type": "user", "content": "earlier"},
            {"type": "assistant", "content": "reply"},
        ],
    ) == [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "earlier"},
        {"role": "assistant", "content": "reply"},
        {"role": "user", "content": "current"},
    ]


def test_prompt_numeric_serialization_matches_javascript_json_stringify() -> None:
    prompt = build_system_prompt(
        [],
        {
            "integer": 1.0,
            "small": 0.000001,
            "tiny": 0.0000001,
            "wide": 1.0e20,
        },
    )
    assert (
        'Current draft values:\n{\n  "integer": 1,\n  "small": 0.000001,\n'
        '  "tiny": 1e-7,\n  "wide": 100000000000000000000\n}'
    ) in prompt


def test_groq_regex_fallback_and_identity_fallback() -> None:
    assert _extract_json('prefix {"response":"ok","extractedData":{"x":1}} suffix') == {
        "response": "ok",
        "extractedData": {"x": 1},
    }
    assert _extract_json("not JSON") is None


def test_groq_request_uses_selected_model_and_legacy_sampling_settings() -> None:
    requests: list[httpx.Request] = []

    def completion(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "choices": [
                    {
                        "message": {
                            "content": '{"response":"Done.","extractedData":{"date":"2030-01-01"}}'
                        }
                    }
                ]
            },
        )

    original_client = httpx.Client

    def mock_client(*args: object, **kwargs: object) -> httpx.Client:
        del args, kwargs
        return original_client(transport=httpx.MockTransport(completion))

    with (
        override_settings(
            GROQ_API_URL="https://api.groq.com/openai/v1/chat/completions",
            GROQ_API_KEY="synthetic-test-key",
            GROQ_MODEL="openai/gpt-oss-120b",
            P3_PROVIDER_TIMEOUT_SECONDS=3,
        ),
        patch("apps.ai.backends.groq.httpx.Client", side_effect=mock_client),
    ):
        result = groq.extract(
            "current",
            [{"label": "Date", "type": "date", "required": True}],
            {},
            [],
        )
    payload = httpx.Response(200, content=requests[0].content).json()
    assert result == {"response": "Done.", "extractedData": {"date": "2030-01-01"}}
    assert payload["model"] == "openai/gpt-oss-120b"
    assert payload["temperature"] == 0.3
    assert payload["max_tokens"] == 2048
    assert payload["top_p"] == 0.9
    assert payload["stream"] is False
    assert payload["messages"][-1] == {"role": "user", "content": "current"}
    assert requests[0].headers["Authorization"] == "Bearer synthetic-test-key"


def test_groq_provider_errors_never_include_provider_body() -> None:
    original_client = httpx.Client

    def mock_client(*args: object, **kwargs: object) -> httpx.Client:
        del args, kwargs
        return original_client(
            transport=httpx.MockTransport(
                lambda _request: httpx.Response(400, text="private provider response")
            )
        )

    with (
        override_settings(
            GROQ_API_URL="https://api.groq.com/openai/v1/chat/completions",
            GROQ_API_KEY="synthetic-test-key",
        ),
        patch("apps.ai.backends.groq.httpx.Client", side_effect=mock_client),
    ):
        with pytest.raises(groq.GroqProviderError, match="failed") as error:
            groq.extract("current", [], {}, [])
    assert "private provider response" not in str(error.value)


def test_mock_and_provider_error_fallbacks_are_distinct() -> None:
    result = extract("hello", [], {}, [], use_mock=True)
    assert result == {
        "response": "This is a mock AI response for testing purposes.",
        "extractedData": {"name": "John Doe", "email": "test@example.com"},
    }
    assert extract("", [], {}, [], use_mock=True) == {
        "response": AI_FAILURE_RESPONSE,
        "extractedData": {},
    }
    def failing_backend(*_args: object) -> dict[str, object]:
        raise RuntimeError("secret")

    assert extract("hello", [], {}, [], backend=failing_backend, use_mock=True) == {
        "response": AI_FAILURE_RESPONSE,
        "extractedData": {},
    }
    with pytest.raises(AIProviderError, match="provider failed"):
        extract("hello", [], {}, [], backend=failing_backend, use_mock=False)


def test_real_extraction_provider_failure_is_an_error_not_a_mock_response() -> None:
    def fail(*_args: object) -> dict[str, object]:
        raise RuntimeError("private provider response")

    with pytest.raises(AIProviderError, match="provider failed") as error:
        extract("hello", [], {}, [], backend=fail, use_mock=False)
    assert "private provider response" not in str(error.value)


def test_real_extraction_provider_failure_returns_sanitized_http_error() -> None:
    client = Client(
        HTTP_HOST="127.0.0.1:8000",
        HTTP_ORIGIN="http://127.0.0.1:8000",
        HTTP_X_CLOUD_AI_CONSENT=CLOUD_AI_CONSENT_POLICY_VERSION,
    )
    principal = SupabaseUser(
        id=UUID("00000000-0000-4000-8000-000000000001"),
        email="synthetic@example.test",
        user_metadata={},
    )
    with (
        override_settings(
            P3_SERVICES_ENABLED=True,
            USE_MOCK_AI=False,
        ),
        patch("apps.api.middleware.authenticate_session", return_value=principal),
        patch("apps.ai.views.extract", side_effect=AIProviderError("private provider response")),
    ):
        response = client.post(
            "/api/ai/extract/",
            {"userInput": "Ada", "formFields": [], "currentFormData": {}, "conversation": []},
            content_type="application/json",
        )

    assert response.status_code == 503
    assert response.json() == {"error": "AI extraction is temporarily unavailable"}
    assert "private provider response" not in response.content.decode()


def test_mock_extraction_endpoint_accepts_expected_contract() -> None:
    with override_settings(P3_SERVICES_ENABLED=True, USE_MOCK_AI=True):
        client = Client(
            HTTP_HOST="127.0.0.1:8000",
            HTTP_ORIGIN="http://127.0.0.1:8000",
        )
        response = client.post(
            "/api/ai/extract/",
            {
                "userInput": "Ada Lovelace",
                "formFields": [{"id": "name", "label": "Name", "type": "text"}],
                "currentFormData": {},
                "conversation": [],
            },
            content_type="application/json",
        )
    assert response.status_code == 200
    assert set(response.json()) == {"response", "extractedData"}


def test_real_extraction_endpoint_requires_explicit_consent() -> None:
    client = Client(
        HTTP_HOST="127.0.0.1:8000",
        HTTP_ORIGIN="http://127.0.0.1:8000",
    )
    principal = SupabaseUser(
        id=UUID("00000000-0000-4000-8000-000000000001"),
        email="synthetic@example.test",
        user_metadata={},
    )
    with (
        override_settings(
            P3_SERVICES_ENABLED=True,
            USE_MOCK_AI=False,
        ),
        patch("apps.api.middleware.authenticate_session", return_value=principal),
    ):
        response = client.post(
            "/api/ai/extract/",
            {"userInput": "Ada", "formFields": [], "currentFormData": {}, "conversation": []},
            content_type="application/json",
        )

    assert response.status_code == 428
    assert response.json()["code"] == "cloud_ai_consent_required"
