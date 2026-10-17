from __future__ import annotations

from typing import Any

CATEGORY_TYPES = {
    "forms": ("form_saved", "form_deleted"),
    "templates": ("template_created", "template_updated", "template_deleted"),
    "sharing": ("template_shared", "share_role_changed", "template_unshared"),
    "reviews": ("review_created", "review_updated", "review_status_changed", "review_deleted"),
    "schedules": (
        "schedule_created",
        "schedule_updated",
        "schedule_status_changed",
        "schedule_deleted",
    ),
}

EVENT_PRESENTATION = {
    "form_saved": ("Forms", "Form saved", "Saved a filled form"),
    "form_deleted": ("Forms", "Form deleted", "Removed a saved form"),
    "template_created": ("Templates", "Template created", "Created a template"),
    "template_updated": ("Templates", "Template updated", "Updated a template"),
    "template_deleted": ("Templates", "Template deleted", "Deleted a template"),
    "template_shared": ("Sharing", "Template shared", "Shared a template"),
    "share_role_changed": ("Sharing", "Share role changed", "Changed a share role"),
    "template_unshared": ("Sharing", "Share removed", "Removed a template share"),
    "review_created": ("Reviews", "Review created", "Created a review"),
    "review_updated": ("Reviews", "Review updated", "Updated a review"),
    "review_status_changed": ("Reviews", "Review decision changed", "Changed a review decision"),
    "review_deleted": ("Reviews", "Review deleted", "Deleted a review"),
    "schedule_created": ("Schedules", "Schedule created", "Created a scheduled event"),
    "schedule_updated": ("Schedules", "Schedule updated", "Updated a scheduled event"),
    "schedule_status_changed": (
        "Schedules",
        "Schedule status changed",
        "Changed a schedule status",
    ),
    "schedule_deleted": ("Schedules", "Schedule deleted", "Deleted a scheduled event"),
}

_CHANGE_LABELS = {
    "name": "name",
    "category": "category",
    "description": "description",
    "fields": "form fields",
    "file": "file",
    "visibility": "visibility",
    "rating": "rating",
    "comment": "comment",
    "title": "title",
    "date": "date",
    "time": "time",
    "duration": "duration",
    "type": "type",
    "priority": "priority",
    "attendees": "attendees",
    "location": "location",
    "form": "linked form",
    "reminder": "reminder",
}


def event_summary(event_type: str, metadata: Any) -> str:
    presentation = EVENT_PRESENTATION.get(event_type)
    if presentation is None:
        return "Recorded an activity"
    parts = [presentation[2]]
    if not isinstance(metadata, dict):
        return parts[0]

    changes = metadata.get("changes")
    if isinstance(changes, list):
        labels = [_CHANGE_LABELS[item] for item in changes if item in _CHANGE_LABELS]
        if labels:
            parts.append("Changed " + ", ".join(labels[:5]))

    status = metadata.get("to_status", metadata.get("status"))
    if isinstance(status, str) and status in {
        "pending",
        "approved",
        "rejected",
        "needs_changes",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
    }:
        parts.append(f"Status: {status.replace('_', ' ')}")

    role = metadata.get("role")
    if isinstance(role, str) and role in {"viewer", "editor", "admin"}:
        parts.append(f"Role: {role}")
    to_role = metadata.get("to_role")
    from_role = metadata.get("from_role")
    if (
        isinstance(to_role, str)
        and isinstance(from_role, str)
        and to_role in {"viewer", "editor", "admin"}
        and from_role in {"viewer", "editor", "admin"}
    ):
        parts.append(f"Role changed from {from_role} to {to_role}")
    return " · ".join(parts)


def event_category(event_type: str) -> str:
    return EVENT_PRESENTATION.get(event_type, ("Other", "Activity", "Recorded an activity"))[0]


def event_title(event_type: str) -> str:
    return EVENT_PRESENTATION.get(event_type, ("Other", "Activity", "Recorded an activity"))[1]
