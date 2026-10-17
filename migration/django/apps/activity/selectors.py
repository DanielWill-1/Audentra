from __future__ import annotations

from datetime import UTC, datetime, time, timedelta
from typing import Any

from django.db.models import Q
from django.utils import timezone

from apps.accounts.principals import SupabaseUser
from apps.activity.models import ActivityEvent
from apps.activity.presentation import CATEGORY_TYPES, event_category, event_summary, event_title
from apps.db.rls import require_rls_context, rls_context
from apps.scheduler.models import ScheduledEvent
from apps.templates_app.models import Template
from apps.voice.models import FilledTemplate


def list_activity(
    user: SupabaseUser,
    *,
    search: str = "",
    category: str = "all",
    date_range: str = "all",
    limit: int = 25,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    if len(search) > 120:
        raise ValueError("Activity search must be at most 120 characters.")
    if category not in {"all", *CATEGORY_TYPES}:
        raise ValueError("Choose a supported activity category.")
    if date_range not in {"all", "today", "week", "month"}:
        raise ValueError("Choose a supported activity date range.")
    if not 1 <= limit <= 100 or offset < 0:
        raise ValueError("Invalid activity list options.")

    now = timezone.now().astimezone(UTC)
    with rls_context(user):
        require_rls_context()
        query = ActivityEvent.objects.using("supabase").all()
        if category != "all":
            query = query.filter(event_type__in=CATEGORY_TYPES[category])
        if search:
            query = query.filter(Q(label__icontains=search) | Q(event_type__icontains=search))
        if date_range == "today":
            start = datetime.combine(now.date(), time.min, tzinfo=UTC)
            query = query.filter(occurred_at__gte=start, occurred_at__lt=start + timedelta(days=1))
        elif date_range == "week":
            query = query.filter(occurred_at__gte=now - timedelta(days=7))
        elif date_range == "month":
            query = query.filter(occurred_at__gte=now - timedelta(days=30))

        total = query.count()
        rows = list(query.order_by("-occurred_at", "-id")[offset : offset + limit])
        event_data = [
            {
                "id": row.id,
                "event_type": row.event_type,
                "entity_kind": row.entity_kind,
                "entity_id": row.entity_id,
                "related_template_id": row.related_template_id,
                "label": row.label,
                "metadata": row.metadata,
                "occurred_at": row.occurred_at,
            }
            for row in rows
        ]

        form_ids = {
            row["entity_id"]
            for row in event_data
            if row["entity_kind"] == "filled_form"
        }
        template_ids = {
            row["related_template_id"]
            for row in event_data
            if row["related_template_id"] is not None
        }
        template_ids.update(
            row["entity_id"] for row in event_data if row["entity_kind"] == "template"
        )
        schedule_ids = {
            row["entity_id"] for row in event_data if row["entity_kind"] == "schedule"
        }
        available_forms = set(
            FilledTemplate.objects.using("supabase")
            .filter(id__in=form_ids)
            .values_list("id", flat=True)
        ) if form_ids else set()
        available_templates = set(
            Template.objects.using("supabase")
            .filter(id__in=template_ids)
            .values_list("id", flat=True)
        ) if template_ids else set()
        available_schedules = set(
            ScheduledEvent.objects.using("supabase")
            .filter(id__in=schedule_ids)
            .values_list("id", flat=True)
        ) if schedule_ids else set()

    for row in event_data:
        event_type = row["event_type"]
        row["category"] = event_category(event_type)
        row["title"] = event_title(event_type)
        row["summary"] = event_summary(event_type, row["metadata"])
        row["target_url"] = ""
        if row["entity_kind"] == "filled_form":
            if event_type == "form_saved" and row["entity_id"] in available_forms:
                row["target_url"] = f"/filledtemplates?record={row['entity_id']}"
                row["target_label"] = "View saved form"
        elif event_type.startswith("schedule_") and row["entity_id"] in available_schedules:
            row["target_url"] = f"/scheduler?edit={row['entity_id']}"
            row["target_label"] = "Open schedule"
        else:
            related_id = row["related_template_id"] or (
                row["entity_id"] if row["entity_kind"] == "template" else None
            )
            if related_id in available_templates:
                row["target_url"] = f"/templates?focus={related_id}#template-{related_id}"
                row["target_label"] = "Open template"
    return event_data, total
