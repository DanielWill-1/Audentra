import re
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

from django.core.exceptions import ValidationError
from django.core.validators import validate_email


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def apply_extraction(
    extracted: dict[str, Any],
    fields: list[dict[str, Any]],
    current: dict[str, Any],
) -> dict[str, Any]:
    updated = dict(current)
    for key, value in extracted.items():
        field = _matching_field(key, fields)
        field_id = field.get("id") if field else None
        if isinstance(field_id, str):
            updated[field_id] = value
    return updated


def _matching_field(key: str, fields: list[dict[str, Any]]) -> dict[str, Any] | None:
    normalized = normalize_key(key)
    for field in fields:
        field_id = field.get("id")
        if not isinstance(field_id, str):
            continue
        targets = {normalize_key(field_id)}
        label = field.get("label")
        if isinstance(label, str):
            targets.add(normalize_key(label))
        if normalized in targets:
            return field
    return None


def _field_value(field: dict[str, Any], value: Any) -> tuple[bool, Any]:
    field_type = str(field.get("type", "text")).lower()
    if field_type in {"select", "radio"}:
        options = field.get("options")
        if not isinstance(options, list) or not isinstance(value, str):
            return False, None
        for option in options:
            allowed = (
                option.get("value", option.get("label")) if isinstance(option, dict) else option
            )
            if isinstance(allowed, str) and allowed.casefold() == value.strip().casefold():
                return True, allowed
        return False, None
    if field_type == "checkbox":
        if isinstance(value, bool):
            return True, value
        if isinstance(value, str):
            normalized = value.strip().casefold()
            if normalized in {"yes", "true", "checked", "on"}:
                return True, True
            if normalized in {"no", "false", "unchecked", "off"}:
                return True, False
        return False, None
    if field_type == "email":
        if not isinstance(value, str):
            return False, None
        value = value.strip()
        try:
            validate_email(value)
        except ValidationError:
            return False, None
        return True, value
    if field_type == "number":
        if isinstance(value, bool) or not isinstance(value, (str, int, float, Decimal)):
            return False, None
        raw = str(value).strip()
        try:
            number = Decimal(raw)
        except InvalidOperation:
            return False, None
        if not number.is_finite():
            return False, None
        for constraint in ("min", "max"):
            limit = field.get(constraint)
            if limit is not None:
                try:
                    limit_number = Decimal(str(limit))
                except InvalidOperation:
                    continue
                if (
                    constraint == "min" and number < limit_number
                ) or (constraint == "max" and number > limit_number):
                    return False, None
        return True, raw
    if field_type == "date":
        if not isinstance(value, str):
            return False, None
        normalized = value.strip()
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", normalized):
            return False, None
        try:
            date.fromisoformat(normalized)
        except ValueError:
            return False, None
        return True, normalized
    if not isinstance(value, str):
        return False, None
    normalized = value.strip()
    max_length = field.get("maxLength")
    if isinstance(max_length, int) and max_length >= 0 and len(normalized) > max_length:
        return False, None
    min_length = field.get("minLength")
    if isinstance(min_length, int) and min_length > 0 and len(normalized) < min_length:
        return False, None
    return bool(normalized), normalized


def apply_validated_extraction(
    extracted: dict[str, Any],
    fields: list[dict[str, Any]],
    current: dict[str, Any],
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    updated = dict(current)
    rejected: list[dict[str, Any]] = []
    rejected_ids: set[str] = set()
    for key, value in extracted.items():
        field = _matching_field(key, fields)
        if field is None:
            continue
        field_id = field.get("id")
        if not isinstance(field_id, str):
            continue
        is_valid, normalized = _field_value(field, value)
        if is_valid:
            updated[field_id] = normalized
        elif field_id not in rejected_ids:
            rejected.append(field)
            rejected_ids.add(field_id)
    return updated, rejected


def validation_question(field: dict[str, Any]) -> str:
    label_value = field.get("label") or field.get("id") or "that answer"
    label = str(label_value)
    field_type = str(field.get("type", "text")).lower()
    if field_type in {"select", "radio"}:
        options = field.get("options")
        allowed = []
        if isinstance(options, list):
            for option in options:
                candidate = (
                    option.get("value", option.get("label")) if isinstance(option, dict) else option
                )
                if isinstance(candidate, str) and candidate:
                    allowed.append(candidate)
                if len(allowed) == 6:
                    break
        if allowed:
            return f"For {label}, please choose one of: {', '.join(allowed)}."
    if field_type == "email":
        return f"I couldn't validate that email. What email should I use for {label}?"
    if field_type == "number":
        return f"I couldn't read that as a number for {label}. What number should I enter?"
    if field_type == "date":
        return f"I couldn't validate that date for {label}. Please give it as year, month, and day."
    return f"I couldn't validate that answer for {label}. Could you clarify it?"
