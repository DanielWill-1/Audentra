import json
from datetime import date, time
from typing import Any
from uuid import UUID, uuid4

from apps.accounts.principals import SupabaseUser
from apps.db.rls import require_rls_context, rls_context
from apps.scheduler.models import ScheduledEvent
from apps.scheduler.selectors import _event_data

_TYPES = {"form_review", "team_meeting", "training", "maintenance", "other"}
_STATUSES = {"scheduled", "in_progress", "completed", "cancelled"}
_PRIORITIES = {"low", "medium", "high"}
_EVENT_FIELDS = {
    "title",
    "description",
    "date",
    "time",
    "duration",
    "type",
    "priority",
    "attendees",
    "location",
    "form_id",
    "reminder_minutes",
    "status",
}


def _clean_event(values: dict[str, Any], *, creating: bool) -> dict[str, Any]:
    if set(values) - _EVENT_FIELDS or (creating and not {"title", "date", "time"}.issubset(values)):
        raise ValueError("Unsupported or incomplete event fields.")
    clean = dict(values)
    if "title" in clean:
        if not isinstance(clean["title"], str) or not clean["title"].strip():
            raise ValueError("Event title is required.")
        clean["title"] = clean["title"].strip()[:200]
    if "description" in clean:
        if not isinstance(clean["description"], str):
            raise ValueError("Event description must be text.")
        clean["description"] = clean["description"][:10_000]
    if "date" in clean and not isinstance(clean["date"], date):
        raise ValueError("Event date must be a date.")
    if "time" in clean and not isinstance(clean["time"], time):
        raise ValueError("Event time must be a time.")
    if "duration" in clean and (
        isinstance(clean["duration"], bool)
        or not isinstance(clean["duration"], int)
        or clean["duration"] <= 0
    ):
        raise ValueError("Event duration must be positive minutes.")
    if "type" in clean and clean["type"] not in _TYPES:
        raise ValueError("Unsupported event type.")
    if "priority" in clean and clean["priority"] not in _PRIORITIES:
        raise ValueError("Unsupported event priority.")
    if "status" in clean and clean["status"] not in _STATUSES:
        raise ValueError("Unsupported event status.")
    if "attendees" in clean:
        attendees = clean["attendees"]
        if (
            not isinstance(attendees, list)
            or len(attendees) > 100
            or not all(isinstance(item, str) for item in attendees)
        ):
            raise ValueError("Attendees must be a list of at most 100 text values.")
        if len(json.dumps(attendees).encode("utf-8")) > 20_000:
            raise ValueError("Attendee list is too large.")
    if "location" in clean:
        if not isinstance(clean["location"], str):
            raise ValueError("Location must be text.")
        clean["location"] = clean["location"][:500]
    if "reminder_minutes" in clean and (
        isinstance(clean["reminder_minutes"], bool)
        or not isinstance(clean["reminder_minutes"], int)
        or clean["reminder_minutes"] < 0
    ):
        raise ValueError("Reminder must be zero or more minutes.")
    return clean


def create_event(user: SupabaseUser, values: dict[str, Any]) -> dict[str, Any]:
    clean = _clean_event(values, creating=True)
    clean.setdefault("description", "")
    clean.setdefault("duration", 60)
    clean.setdefault("type", "other")
    clean.setdefault("priority", "medium")
    clean.setdefault("attendees", [])
    clean.setdefault("location", "")
    clean.setdefault("reminder_minutes", 15)
    clean["status"] = "scheduled"
    with rls_context(user):
        require_rls_context()
        event = ScheduledEvent.objects.using("supabase").create(
            id=uuid4(), created_by=user.id, **clean
        )
        event.refresh_from_db(using="supabase")
        return _event_data(event)


def update_event(
    user: SupabaseUser, event_id: UUID, values: dict[str, Any]
) -> dict[str, Any] | None:
    clean = _clean_event(values, creating=False)
    with rls_context(user):
        require_rls_context()
        query = ScheduledEvent.objects.using("supabase").filter(id=event_id)
        if not query.exists():
            return None
        if clean:
            query.update(**clean)
        event = query.first()
        return _event_data(event) if event is not None else None


def delete_event(user: SupabaseUser, event_id: UUID) -> bool:
    with rls_context(user):
        require_rls_context()
        deleted, _ = ScheduledEvent.objects.using("supabase").filter(id=event_id).delete()
        return deleted > 0


def set_event_status(user: SupabaseUser, event_id: UUID, status: str) -> dict[str, Any] | None:
    if status not in {"completed", "cancelled"}:
        raise ValueError("Only completion or cancellation is supported here.")
    return update_event(user, event_id, {"status": status})
