"""Synthetic verified identity/data used only by the isolated browser capture."""

from collections.abc import Callable
from contextlib import ExitStack
from datetime import UTC, date, datetime, time
from unittest.mock import patch
from uuid import UUID

from apps.accounts.services.tokens import _principal
from django.conf import settings
from django.http import HttpRequest, HttpResponse

FIXTURE_USER = _principal(
    "11111111-1111-4111-8111-111111111111",
    "synthetic@example.invalid",
    {"first_name": "Demo", "last_name": "User"},
)
FIXTURE_TEMPLATE = {
    "id": UUID("33333333-3333-4333-8333-333333333333"),
    "name": "Patient intake",
    "category": "healthcare",
    "description": "Synthetic browser-capture template",
    "form_data": {
        "fields": [
            {"id": "patient_name", "label": "Patient name", "type": "text", "required": True},
            {"id": "email", "label": "Email", "type": "email", "required": False},
        ]
    },
    "visibility": "visible",
    "created_by": FIXTURE_USER.id,
    "created_at": datetime(2026, 10, 11, 10, tzinfo=UTC),
    "updated_at": datetime(2026, 10, 11, 10, tzinfo=UTC),
    "uploaded_file": None,
    "shared_with": [],
    "reviews": [],
}
FIXTURE_EVENT = {
    "id": UUID("44444444-4444-4444-8444-444444444444"),
    "title": "Review patient intake",
    "description": "Synthetic browser-capture schedule",
    "date": date(2026, 10, 12),
    "time": time(9, 30),
    "duration": 30,
    "type": "form_review",
    "priority": "high",
    "attendees": ["Demo User"],
    "location": "Review room",
    "form_id": FIXTURE_TEMPLATE["id"],
    "reminder_minutes": 15,
    "status": "scheduled",
    "created_by": FIXTURE_USER.id,
}
FIXTURE_FILLED = {
    "id": UUID("55555555-5555-4555-8555-555555555555"),
    "template_name": "Patient intake",
    "form_data": {"patient_name": "Sample Patient", "email": "patient@example.invalid"},
    "created_at": datetime(2026, 10, 12, 8, tzinfo=UTC),
}


class P7FixtureAuthenticationMiddleware:
    """Replace network Auth/data with fixed, visibly synthetic browser fixtures."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        with ExitStack() as stack:
            stack.enter_context(
                patch(
                    "apps.accounts.middleware.authenticate_session",
                    side_effect=lambda current: (
                        FIXTURE_USER
                        if current.path_info in settings.P7_PROTECTED_PATHS
                        else None
                    ),
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.profile_selectors.get_profile",
                    return_value={
                        "first_name": "Demo",
                        "last_name": "User",
                        "company": "Example",
                        "industry": "Healthcare",
                    },
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_selectors.list_templates",
                    return_value=[FIXTURE_TEMPLATE],
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_selectors.get_template",
                    return_value=FIXTURE_TEMPLATE,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_selectors.list_received_shares",
                    return_value=[],
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_selectors.list_sent_shares",
                    return_value=[],
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_selectors.list_review_queue",
                    return_value=[],
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.upcoming_events",
                    return_value=[FIXTURE_EVENT],
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.event_stats",
                    return_value={"total": 1, "completed": 0, "upcoming": 1, "highPriority": 1},
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.list_events",
                    return_value=[FIXTURE_EVENT],
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.search_events",
                    return_value=[FIXTURE_EVENT],
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.get_event",
                    return_value=FIXTURE_EVENT,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.filled_selectors.list_filled",
                    return_value=[FIXTURE_FILLED],
                )
            )
            return self.get_response(request)
