from datetime import date, timedelta
from typing import Any
from uuid import UUID

from django.db.models import Count, Q
from django.utils import timezone

from apps.accounts.principals import SupabaseUser
from apps.db.rls import require_rls_context, rls_context
from apps.scheduler.models import ScheduledEvent

_STATUSES = {"scheduled", "in_progress", "completed", "cancelled"}
_TYPES = {"form_review", "team_meeting", "training", "maintenance", "other"}


def _event_data(event: ScheduledEvent) -> dict[str, Any]:
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "date": event.date,
        "time": event.time,
        "duration": event.duration,
        "type": event.type,
        "priority": event.priority,
        "attendees": event.attendees,
        "location": event.location,
        "form_id": event.form_id,
        "reminder_minutes": event.reminder_minutes,
        "status": event.status,
        "created_by": event.created_by,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
    }


def list_events(
    user: SupabaseUser,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    event_type: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    if not 1 <= limit <= 250 or offset < 0:
        raise ValueError("Invalid event list options.")
    if event_type not in {None, "all", *_TYPES} or status not in {None, "all", *_STATUSES}:
        raise ValueError("Unsupported event filter.")
    if start_date and end_date and start_date > end_date:
        raise ValueError("Start date must not be after end date.")
    with rls_context(user):
        require_rls_context()
        query = ScheduledEvent.objects.using("supabase").all()
        if start_date:
            query = query.filter(date__gte=start_date)
        if end_date:
            query = query.filter(date__lte=end_date)
        if event_type not in {None, "all"}:
            query = query.filter(type=event_type)
        if status not in {None, "all"}:
            query = query.filter(status=status)
        rows = list(query.order_by("date", "time", "id")[offset : offset + limit])
        return [_event_data(row) for row in rows]


def get_event(user: SupabaseUser, event_id: UUID) -> dict[str, Any] | None:
    with rls_context(user):
        require_rls_context()
        event = ScheduledEvent.objects.using("supabase").filter(id=event_id).first()
        return _event_data(event) if event is not None else None


def upcoming_events(user: SupabaseUser, *, limit: int = 10) -> list[dict[str, Any]]:
    if not 1 <= limit <= 100:
        raise ValueError("Invalid upcoming event limit.")
    today = timezone.now().date()
    with rls_context(user):
        require_rls_context()
        rows = list(
            ScheduledEvent.objects.using("supabase")
            .filter(date__gte=today, date__lte=today + timedelta(days=7), status="scheduled")
            .order_by("date", "time", "id")[:limit]
        )
        return [_event_data(row) for row in rows]


def events_by_status(user: SupabaseUser, status: str) -> list[dict[str, Any]]:
    if status not in _STATUSES:
        raise ValueError("Unsupported event status.")
    return list_events(user, status=status)


def events_by_type(user: SupabaseUser, event_type: str) -> list[dict[str, Any]]:
    if event_type not in _TYPES:
        raise ValueError("Unsupported event type.")
    return list_events(user, event_type=event_type)


def search_events(user: SupabaseUser, term: str, *, limit: int = 100) -> list[dict[str, Any]]:
    if not isinstance(term, str) or not 1 <= limit <= 100:
        raise ValueError("Invalid event search.")
    term = term.strip()[:120]
    if not term:
        return []
    with rls_context(user):
        require_rls_context()
        rows = list(
            ScheduledEvent.objects.using("supabase")
            .filter(
                Q(title__icontains=term)
                | Q(description__icontains=term)
                | Q(location__icontains=term)
            )
            .order_by("date", "time", "id")[:limit]
        )
        return [_event_data(row) for row in rows]


def event_stats(user: SupabaseUser) -> dict[str, int]:
    today = timezone.now().date()
    start_month = today.replace(day=1)
    with rls_context(user):
        require_rls_context()
        counts = ScheduledEvent.objects.using("supabase").aggregate(
            total=Count("id", filter=Q(date__gte=start_month)),
            completed=Count("id", filter=Q(date__gte=start_month, status="completed")),
            upcoming=Count("id", filter=Q(date__gte=today, status="scheduled")),
            high_priority=Count(
                "id", filter=Q(date__gte=today, status="scheduled", priority="high")
            ),
        )
        return {
            "total": counts["total"] or 0,
            "completed": counts["completed"] or 0,
            "upcoming": counts["upcoming"] or 0,
            "highPriority": counts["high_priority"] or 0,
        }


def manage_event_stats(user: SupabaseUser) -> dict[str, int]:
    """Return all-time status totals shown on the schedule management page."""
    with rls_context(user):
        require_rls_context()
        counts = ScheduledEvent.objects.using("supabase").aggregate(
            total=Count("id"),
            scheduled=Count("id", filter=Q(status="scheduled")),
            completed=Count("id", filter=Q(status="completed")),
            cancelled=Count("id", filter=Q(status="cancelled")),
            high_priority=Count("id", filter=Q(priority="high")),
        )
        return {name: count or 0 for name, count in counts.items()}
