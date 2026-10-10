import json
import math
from collections.abc import Sequence
from decimal import Decimal
from typing import Any

SYSTEM_PROMPT_TEMPLATE = (
    "You are a helpful AI assistant that processes form data and extracts relevant "
    "information from user input.\n\n"
    """Your task is to:
1. Understand what the user is saying
2. Extract relevant information that matches the form fields
3. Provide a natural, conversational response
4. Return the extracted data in the specified format

Form Fields Available:
{form_fields}

Current Form Data:
{current_form_data}

IMPORTANT: Always respond with a JSON object containing:
- "response": A natural, helpful response to the user
- "extractedData": An object with field IDs as keys and extracted values

Example response format:
{{
  "response": "I've captured your name and email. Is there anything else you'd like to add?",
  "extractedData": {{
    "name": "John Smith",
    "email": "john@example.com"
  }}
}}"""
)


def _js_string(value: Any) -> str:
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    return str(value)


def _js_truthy(value: Any) -> bool:
    return value is not None and value is not False and value != "" and value != 0


def _javascript_number(value: int | float) -> str:
    if isinstance(value, int):
        return str(value)
    if not math.isfinite(value):
        return "null"
    if value == 0:
        return "0"
    magnitude = abs(value)
    if magnitude.is_integer() and magnitude < 1e21:
        return str(int(value))
    shortest = repr(value).lower()
    if 1e-6 <= magnitude < 1e21:
        fixed = format(Decimal(shortest), "f")
        return fixed.rstrip("0").rstrip(".") if "." in fixed else fixed
    mantissa, exponent = shortest.split("e")
    exponent_value = int(exponent)
    sign = "+" if exponent_value >= 0 else ""
    return f"{mantissa}e{sign}{exponent_value}"


def _javascript_json(value: Any, depth: int = 0) -> str:
    indent = "  "
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, (int, float)):
        return _javascript_number(value)
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        if not value:
            return "[]"
        items = [f"{indent * (depth + 1)}{_javascript_json(item, depth + 1)}" for item in value]
        return "[\n" + ",\n".join(items) + f"\n{indent * depth}]"
    if isinstance(value, dict):
        if not value:
            return "{}"
        items = [
            f"{indent * (depth + 1)}{json.dumps(key, ensure_ascii=False)}: "
            f"{_javascript_json(item, depth + 1)}"
            for key, item in value.items()
        ]
        return "{\n" + ",\n".join(items) + f"\n{indent * depth}}}"
    raise TypeError("Form data must contain JSON values")


def build_system_prompt(form_fields: Sequence[object], current_form_data: object) -> str:
    descriptions: list[str] = []
    for item in form_fields:
        if not isinstance(item, dict):
            raise TypeError("Form fields must be objects")
        label = item.get("label", "undefined")
        field_type = item.get("type", "undefined")
        required = ", required" if _js_truthy(item.get("required")) else ""
        descriptions.append(f"- {_js_string(label)} ({_js_string(field_type)}{required})")
    return SYSTEM_PROMPT_TEMPLATE.format(
        form_fields="\n".join(descriptions),
        current_form_data=_javascript_json(current_form_data),
    )


def build_messages(
    user_input: str,
    form_fields: Sequence[object],
    current_form_data: object,
    conversation: Sequence[object],
) -> list[dict[str, str]]:
    messages = [{"role": "system", "content": build_system_prompt(form_fields, current_form_data)}]
    for message in conversation:
        if not isinstance(message, dict):
            raise TypeError("Conversation messages must be objects")
        if message.get("type", "undefined") == "system":
            continue
        item = {"role": "user" if message.get("type") == "user" else "assistant"}
        content = message.get("content")
        if isinstance(content, str):
            item["content"] = content
        messages.append(item)
    messages.append({"role": "user", "content": user_input})
    return messages
