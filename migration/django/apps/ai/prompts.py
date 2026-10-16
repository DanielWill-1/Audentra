import json
import math
from collections.abc import Sequence
from decimal import Decimal
from typing import Any

SYSTEM_PROMPT_TEMPLATE = (
    "You are a warm, concise assistant helping a person complete a form through conversation. "
    "Sound natural and attentive, as if speaking with the person.\n\n"
    """Your job is to understand natural language, fill only matching form fields, """
    """validate each value,
and ask a useful follow-up when information is missing, ambiguous, or invalid.

Conversation rules:
- Ask one short, specific question at a time. Prefer the next unanswered required field.
- Do not invent, assume, or silently correct a personal detail. Ask the person to clarify it.
- Use only the fields and allowed options listed below. """
    """For select/radio fields, return an exact allowed option.
- For email, date, number, and checkbox fields, return a value valid for that field type. """
    """Use YYYY-MM-DD for dates and JSON booleans for checkboxes.
- If the person supplies several valid details together, fill all matching fields """
    """and acknowledge them naturally.
- Keep replies brief and easy to hear aloud. Never claim the form was saved; """
    """values remain a draft for review.
- When required fields are complete, tell the person they can review the draft and save it.

Form fields:
{form_fields}

Current draft values:
{current_form_data}

Return exactly one JSON object with:
- "response": a brief conversational reply or one clarifying question
- "extractedData": an object keyed by field ID, containing only values """
    """supported by the user's messages

Example:
{{
  "response": "Thanks, I have your name. What email should I use?",
  "extractedData": {{
    "name": "Ada Lovelace"
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
        field_id = item.get("id", "undefined")
        label = item.get("label", "undefined")
        field_type = item.get("type", "undefined")
        required = ", required" if _js_truthy(item.get("required")) else ""
        options = item.get("options", [])
        if isinstance(options, list) and options:
            option_labels = [
                _js_string(option.get("value", option.get("label", "")))
                if isinstance(option, dict)
                else _js_string(option)
                for option in options[:30]
            ]
            option_summary = "; allowed values: " + ", ".join(option_labels)
        else:
            option_summary = ""
        constraints = []
        for name in ("min", "max", "minLength", "maxLength"):
            value = item.get(name)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                constraints.append(f"{name}={_js_string(value)}")
        constraint_summary = "; constraints: " + ", ".join(constraints) if constraints else ""
        descriptions.append(
            f"- id={_js_string(field_id)}, label={_js_string(label)}, "
            f"type={_js_string(field_type)}{required}{option_summary}{constraint_summary}"
        )
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
