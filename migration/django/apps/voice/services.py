import re
from typing import Any


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def apply_extraction(
    extracted: dict[str, Any],
    fields: list[dict[str, Any]],
    current: dict[str, Any],
) -> dict[str, Any]:
    updated = dict(current)
    for key, value in extracted.items():
        normalized = normalize_key(key)
        for field in fields:
            field_id = field.get("id")
            label = field.get("label")
            if not isinstance(field_id, str):
                continue
            targets = {normalize_key(field_id)}
            if isinstance(label, str):
                targets.add(normalize_key(label))
            if normalized in targets:
                updated[field_id] = value
                break
    return updated
