"""Synthetic verified identity/data used only by the isolated browser capture."""

from collections.abc import Callable, Sequence
from contextlib import ExitStack
from datetime import UTC, date, datetime, time, timedelta
from time import time as unix_time
from typing import Any, cast
from unittest.mock import patch
from uuid import UUID, uuid4

from apps.accounts.principals import SupabaseUser
from apps.accounts.services.gotrue import AuthServiceError, AuthTokens
from apps.accounts.services.tokens import AUTH_SESSION_KEY, _principal
from apps.storage import services as storage_services
from django.conf import settings
from django.http import HttpRequest, HttpResponse

FIXTURE_USER = _principal(
    "11111111-1111-4111-8111-111111111111",
    "synthetic@example.invalid",
    {"first_name": "Demo", "last_name": "User"},
)
FIXTURE_REVIEWER = _principal(
    "88888888-8888-4888-8888-888888888888",
    "reviewer@example.invalid",
    {"first_name": "Synthetic", "last_name": "Reviewer"},
)
FIXTURE_TEMPLATE: dict[str, Any] = {
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
FIXTURE_EVENT: dict[str, Any] = {
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
FIXTURE_OTHER_USER_EVENT: dict[str, Any] = {
    **FIXTURE_EVENT,
    "id": UUID("66666666-6666-4666-8666-666666666666"),
    "title": "Private schedule for another account",
    "created_by": UUID("22222222-2222-4222-8222-222222222222"),
}
FIXTURE_FILLED: dict[str, Any] = {
    "id": UUID("55555555-5555-4555-8555-555555555555"),
    "user_id": FIXTURE_USER.id,
    "template_id": FIXTURE_TEMPLATE["id"],
    "template_name": "Patient intake",
    "form_data": {"patient_name": "Sample Patient", "email": "patient@example.invalid"},
    "created_at": datetime(2026, 10, 12, 8, tzinfo=UTC),
}
_BROWSER_FILLED_RECORDS = [FIXTURE_FILLED]
_BROWSER_ACTIVITY_EVENTS: list[dict[str, Any]] = []
_BROWSER_ACTIVITY_READY = False
_BROWSER_SCHEDULE_EVENTS = [FIXTURE_EVENT, FIXTURE_OTHER_USER_EVENT]
_BROWSER_TEMPLATES: list[dict[str, Any]] = []
_BROWSER_TEMPLATE_FILES: dict[str, tuple[UUID, bytes, str]] = {}
_BROWSER_TEMPLATE_SHARES: list[dict[str, Any]] = []
_AUTH_FLOW_SIGN_IN_CALLS = 0


def _copy_fixture_template() -> dict[str, Any]:
    return {
        **FIXTURE_TEMPLATE,
        "form_data": {"fields": [dict(field) for field in FIXTURE_TEMPLATE["form_data"]["fields"]]},
        "shared_with": [],
        "reviews": [],
    }


def _reset_browser_templates() -> None:
    _BROWSER_TEMPLATES[:] = [_copy_fixture_template()]
    _BROWSER_TEMPLATE_FILES.clear()
    _BROWSER_TEMPLATE_SHARES.clear()


def _list_fixture_templates(
    user: SupabaseUser,
    *,
    category: str | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    ascending: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    if user.id == FIXTURE_USER.id:
        rows = list(_BROWSER_TEMPLATES)
    else:
        shared_template_ids = {
            share["template_id"]
            for share in _BROWSER_TEMPLATE_SHARES
            if share["recipient_id"] == user.id and not share["is_hidden"]
        }
        rows = [row for row in _BROWSER_TEMPLATES if row["id"] in shared_template_ids]
    if category not in {None, "all"}:
        rows = [row for row in rows if row["category"] == category]
    if search:
        term = search.strip().casefold()
        rows = [
            row
            for row in rows
            if term
            in " ".join((row["name"], row["category"], row.get("description") or "")).casefold()
        ]
    if sort_by in {"created_at", "name", "category"}:
        rows.sort(key=lambda row: str(row.get(sort_by) or "").casefold(), reverse=not ascending)
    return rows[offset : offset + limit]


def _get_fixture_template(user: SupabaseUser, template_id: UUID) -> dict[str, Any] | None:
    row = next((item for item in _BROWSER_TEMPLATES if item["id"] == template_id), None)
    if row is None:
        return None
    if row["created_by"] == user.id:
        return row
    if any(
        share["template_id"] == template_id
        and share["recipient_id"] == user.id
        and not share["is_hidden"]
        for share in _BROWSER_TEMPLATE_SHARES
    ):
        return row
    return None


def _create_fixture_shares(
    user: SupabaseUser,
    template_id: UUID,
    recipient_ids: Sequence[UUID],
    role: str,
    *,
    message: str = "",
) -> list[dict[str, Any]]:
    template = _get_fixture_template(user, template_id)
    allowed_roles = {"viewer", "editor", "admin"}
    if (
        template is None
        or template["created_by"] != user.id
        or role not in allowed_roles
        or not recipient_ids
        or len(recipient_ids) > 100
        or not isinstance(message, str)
        or len(message) > 1000
    ):
        raise ValueError("Invalid share request for the synthetic browser fixture.")
    recipients = list(recipient_ids)
    if len(recipients) != len(set(recipients)):
        raise ValueError("Duplicate share recipients are not allowed.")
    if any(recipient != FIXTURE_REVIEWER.id for recipient in recipients):
        raise ValueError("Share recipients must be existing synthetic browser accounts.")
    if any(
        share["template_id"] == template_id and share["recipient_id"] in recipients
        for share in _BROWSER_TEMPLATE_SHARES
    ):
        raise ValueError("A synthetic account already has access to this template.")
    now = datetime.now(UTC)
    created = [
        {
            "id": uuid4(),
            "template_id": template_id,
            "recipient_id": recipient,
            "role": role,
            "shared_by": user.id,
            "shared_at": now,
            "message": message[:1000],
            "is_hidden": False,
            "updated_at": now,
        }
        for recipient in recipients
    ]
    _BROWSER_TEMPLATE_SHARES.extend(created)
    return created


def _list_fixture_received_shares(user: SupabaseUser, *, limit: int = 100) -> list[dict[str, Any]]:
    shares = [
        share
        for share in _BROWSER_TEMPLATE_SHARES
        if share["recipient_id"] == user.id and not share["is_hidden"]
    ][:limit]
    return [
        {**share, "template": _get_fixture_template(user, share["template_id"])}
        for share in shares
    ]


def _list_fixture_sent_shares(user: SupabaseUser, *, limit: int = 100) -> list[dict[str, Any]]:
    shares = [
        share for share in _BROWSER_TEMPLATE_SHARES if share["shared_by"] == user.id
    ][:limit]
    return [
        {**share, "template": _get_fixture_template(user, share["template_id"])}
        for share in shares
    ]


def _remove_fixture_share(user: SupabaseUser, share_id: UUID) -> bool:
    for index, share in enumerate(_BROWSER_TEMPLATE_SHARES):
        if share["id"] == share_id and share["shared_by"] == user.id:
            del _BROWSER_TEMPLATE_SHARES[index]
            return True
    return False


def _set_fixture_share_hidden(
    user: SupabaseUser, share_id: UUID, hidden: bool
) -> dict[str, Any] | None:
    if not isinstance(hidden, bool):
        raise ValueError("Hidden state must be boolean.")
    for share in _BROWSER_TEMPLATE_SHARES:
        if share["id"] == share_id and share["recipient_id"] == user.id:
            share["is_hidden"] = hidden
            share["updated_at"] = datetime.now(UTC)
            return share
    return None


def _set_fixture_share_role(
    user: SupabaseUser, share_id: UUID, role: str
) -> dict[str, Any] | None:
    if role not in {"viewer", "editor", "admin"}:
        raise ValueError("Unsupported share role.")
    for share in _BROWSER_TEMPLATE_SHARES:
        if share["id"] == share_id and share["shared_by"] == user.id:
            share["role"] = role
            share["updated_at"] = datetime.now(UTC)
            return share
    return None


def _create_fixture_review(
    user: SupabaseUser,
    template_id: UUID,
    *,
    rating: int,
    comment: str = "",
) -> dict[str, Any]:
    template = _get_fixture_template(user, template_id)
    if (
        template is None
        or template["created_by"] == user.id
        or isinstance(rating, bool)
        or not isinstance(rating, int)
        or not 0 <= rating <= 5
        or not isinstance(comment, str)
        or len(comment) > 10_000
    ):
        raise ValueError("Invalid review for the synthetic browser fixture.")
    if any(review["reviewer_id"] == user.id for review in template["reviews"]):
        raise ValueError("A review already exists for this synthetic account.")
    now = datetime.now(UTC)
    review = {
        "id": uuid4(),
        "template_id": template_id,
        "reviewer_id": user.id,
        "reviewer_name": " ".join(
            value.strip()
            for value in (
                user.user_metadata.get("first_name", ""),
                user.user_metadata.get("last_name", ""),
            )
            if isinstance(value, str) and value.strip()
        )[:200],
        "rating": rating,
        "comment": comment[:10_000],
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    template["reviews"].append(review)
    return review


def _request_fixture_review(user: SupabaseUser, template_id: UUID) -> dict[str, Any]:
    return _create_fixture_review(user, template_id, rating=0)


def _update_fixture_review(
    user: SupabaseUser, review_id: UUID, values: dict[str, Any]
) -> dict[str, Any] | None:
    for template in _BROWSER_TEMPLATES:
        for review in template["reviews"]:
            if review["id"] != review_id:
                continue
            if review["reviewer_id"] == user.id and set(values) <= {"rating", "comment"}:
                rating = values.get("rating", review["rating"])
                comment = values.get("comment", review["comment"])
                if (
                    isinstance(rating, bool)
                    or not isinstance(rating, int)
                    or not 0 <= rating <= 5
                    or not isinstance(comment, str)
                    or len(comment) > 10_000
                ):
                    raise ValueError("Invalid review update for the synthetic fixture.")
                review.update(rating=rating, comment=comment, updated_at=datetime.now(UTC))
                return cast(dict[str, Any], review)
            if (
                template["created_by"] == user.id
                and set(values) == {"status"}
                and values["status"] in {"approved", "rejected", "needs_changes"}
            ):
                review.update(status=values["status"], updated_at=datetime.now(UTC))
                return cast(dict[str, Any], review)
            return None
    return None


def _list_fixture_review_queue(user: SupabaseUser, *, limit: int = 100) -> list[dict[str, Any]]:
    if user.id != FIXTURE_USER.id:
        return []
    return [
        {**review, "template": template}
        for template in _BROWSER_TEMPLATES
        if template["created_by"] == user.id
        for review in template["reviews"]
        if review["status"] == "pending"
    ][:limit]


def _create_fixture_template(user: SupabaseUser, values: dict[str, Any]) -> dict[str, Any]:
    if user.id != FIXTURE_USER.id:
        raise ValueError("The template is unavailable to this synthetic account.")
    now = datetime.now(UTC)
    row = {
        "id": uuid4(),
        "created_by": user.id,
        "created_at": now,
        "updated_at": now,
        "description": "",
        "form_data": {"fields": []},
        "visibility": "visible",
        "uploaded_file": None,
        "shared_with": [],
        "reviews": [],
        **values,
    }
    _BROWSER_TEMPLATES.insert(0, row)
    return row


def _update_fixture_template(
    user: SupabaseUser, template_id: UUID, values: dict[str, Any]
) -> dict[str, Any] | None:
    row = _get_fixture_template(user, template_id)
    if row is None:
        return None
    row.update(values)
    row["updated_at"] = datetime.now(UTC)
    return row


def _set_fixture_template_visibility(
    user: SupabaseUser, template_id: UUID, visibility: str
) -> dict[str, Any] | None:
    if visibility not in {"visible", "hidden"}:
        raise ValueError("Unsupported template visibility.")
    return _update_fixture_template(user, template_id, {"visibility": visibility})


def _delete_fixture_template(
    user: SupabaseUser, template_id: UUID, *, delete_file: Callable[[str], None] | None = None
) -> bool:
    row = _get_fixture_template(user, template_id)
    if row is None:
        return False
    if row.get("uploaded_file") and delete_file is not None:
        delete_file(row["uploaded_file"])
    _BROWSER_TEMPLATES.remove(row)
    return True


def _upload_fixture_template_file(
    request: HttpRequest, user: SupabaseUser, template_id: UUID, upload: Any
) -> dict[str, Any]:
    row = _get_fixture_template(user, template_id)
    if row is None or row["created_by"] != user.id:
        raise ValueError("Template is not available for file upload.")
    content, content_type = storage_services._file_details(upload)
    extension = upload.name.rsplit(".", 1)[-1].lower()
    old_path = row.get("uploaded_file")
    path = f"templates/{template_id}/{uuid4()}.{extension}"
    _BROWSER_TEMPLATE_FILES[path] = (template_id, content, content_type)
    row["uploaded_file"] = path
    if old_path:
        _BROWSER_TEMPLATE_FILES.pop(old_path, None)
    return {
        "path": path,
        "content_type": content_type,
        "cleanup_pending": False,
        "cleanup_path": None,
    }


def _download_fixture_template_file(
    _request: HttpRequest, user: SupabaseUser, template_id: UUID
) -> tuple[bytes, str, str]:
    row = _get_fixture_template(user, template_id)
    path = row.get("uploaded_file") if row is not None and row["created_by"] == user.id else None
    stored = _BROWSER_TEMPLATE_FILES.get(path) if isinstance(path, str) else None
    if not isinstance(path, str) or stored is None or stored[0] != template_id:
        raise ValueError("Template file is not available.")
    extension = path.rsplit(".", 1)[-1]
    return stored[1], stored[2], f"template.{extension}"


def _remove_fixture_template_object(
    _request: HttpRequest, user: SupabaseUser, template_id: UUID, path: str
) -> None:
    stored = _BROWSER_TEMPLATE_FILES.get(path)
    if user.id != FIXTURE_USER.id or stored is None or stored[0] != template_id:
        raise ValueError("Private fixture object is unavailable.")
    del _BROWSER_TEMPLATE_FILES[path]


_reset_browser_templates()


def _auth_flow_tokens(
    email: str,
    metadata: dict[str, Any] | None = None,
    *,
    subject: str = "66666666-6666-4666-8666-666666666666",
) -> AuthTokens:
    return AuthTokens(
        subject=subject,
        email=email,
        user_metadata=metadata or {"first_name": "Auth", "last_name": "Fixture"},
        access_token="synthetic-browser-auth-access",
        refresh_token="synthetic-browser-auth-refresh",
        expires_at=int(unix_time()) + 3600,
    )


def _authenticate_auth_flow(request: HttpRequest) -> SupabaseUser | None:
    data = request.session.get(AUTH_SESSION_KEY)
    if not isinstance(data, dict) or data.get("access_token") != "synthetic-browser-auth-access":
        return None
    subject = data.get("subject")
    if not isinstance(subject, str):
        return None
    email = data.get("email")
    metadata = data.get("user_metadata")
    return _principal(
        subject,
        email if isinstance(email, str) else None,
        metadata if isinstance(metadata, dict) else {},
    )


def _auth_flow_sign_in(_client: object, email: str, password: str) -> AuthTokens:
    global _AUTH_FLOW_SIGN_IN_CALLS
    _AUTH_FLOW_SIGN_IN_CALLS += 1
    if password == "provider-down":
        raise AuthServiceError("Synthetic provider outage", kind="unavailable")
    if password != "synthetic-passphrase":
        raise AuthServiceError("Synthetic credentials rejected", kind="invalid")
    if email.strip().casefold() == "p9-desktop-mic@example.invalid":
        return _auth_flow_tokens(
            email,
            {"first_name": "Demo", "last_name": "User"},
            subject=str(FIXTURE_USER.id),
        )
    return _auth_flow_tokens(email)


def _auth_flow_sign_up(
    _client: object, email: str, _password: str, metadata: dict[str, str]
) -> dict[str, Any]:
    if email == "duplicate-browser-auth@example.invalid":
        raise AuthServiceError("Synthetic account already exists", kind="invalid")
    tokens = _auth_flow_tokens(email, metadata)
    return {
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "expires_in": 3600,
        "user": {
            "id": tokens.subject,
            "email": email,
            "user_metadata": metadata,
        },
    }


def _enter_auth_patch(stack: ExitStack, target: str, replacement: object) -> None:
    stack.enter_context(patch(target, replacement))


def _fixture_user_for_request(request: HttpRequest) -> SupabaseUser | None:
    if request.path_info not in settings.P7_PROTECTED_PATHS:
        return None
    if request.headers.get("X-P7-Fixture-User") == "reviewer":
        return FIXTURE_REVIEWER
    return FIXTURE_USER


def _save_fixture_filled(
    user: SupabaseUser,
    form_data: dict[str, Any],
    *,
    template_id: UUID | None = None,
    template_name: str = "",
    submission_key: UUID | None = None,
) -> dict[str, Any]:
    if user.id != FIXTURE_USER.id or template_id != FIXTURE_TEMPLATE["id"]:
        raise ValueError("This template is unavailable to the synthetic browser account.")
    row = {
        "id": uuid4(),
        "user_id": user.id,
        "template_id": template_id,
        "template_name": FIXTURE_TEMPLATE["name"],
        "form_data": dict(form_data),
        "created_at": datetime.now(UTC),
        "submission_key": submission_key,
    }
    _BROWSER_FILLED_RECORDS.insert(0, row)
    return row


def _list_fixture_filled(
    user: SupabaseUser, *, limit: int = 100, offset: int = 0
) -> list[dict[str, Any]]:
    if user.id != FIXTURE_USER.id:
        return []
    return _BROWSER_FILLED_RECORDS[offset : offset + limit]


def _list_fixture_filled_summaries(
    user: SupabaseUser, *, limit: int = 100, offset: int = 0
) -> list[dict[str, Any]]:
    if user.id != FIXTURE_USER.id:
        return []
    rows = sorted(
        _BROWSER_FILLED_RECORDS,
        key=lambda row: (row["created_at"], str(row["id"])),
        reverse=True,
    )
    return [
        {key: row[key] for key in ("id", "template_name", "created_at")}
        for row in rows[offset : offset + limit]
    ]


def _empty_fixture_filled_summaries(
    _user: SupabaseUser, *, limit: int = 100, offset: int = 0
) -> list[dict[str, Any]]:
    del limit, offset
    return []


def _get_fixture_filled(user: SupabaseUser, record_id: UUID) -> dict[str, Any] | None:
    if user.id != FIXTURE_USER.id:
        return None
    return next((row for row in _BROWSER_FILLED_RECORDS if row["id"] == record_id), None)


def _make_fixture_activity_events() -> list[dict[str, Any]]:
    now = datetime.now(UTC)
    events = [
        (
            "form_saved",
            "filled_form",
            FIXTURE_FILLED["id"],
            None,
            "Patient intake",
            "Forms",
            "Form saved",
            "Saved a filled form",
            f"/filledtemplates?record={FIXTURE_FILLED['id']}",
            "View saved form",
        ),
        (
            "template_created",
            "template",
            FIXTURE_TEMPLATE["id"],
            FIXTURE_TEMPLATE["id"],
            "Patient intake",
            "Templates",
            "Template created",
            "Created a template",
            f"/templates?focus={FIXTURE_TEMPLATE['id']}#template-{FIXTURE_TEMPLATE['id']}",
            "Open template",
        ),
        (
            "template_shared",
            "share",
            UUID("77777777-7777-4777-8777-777777777777"),
            FIXTURE_TEMPLATE["id"],
            "Patient intake",
            "Sharing",
            "Template shared",
            "Shared a template · Role: viewer",
            f"/templates?focus={FIXTURE_TEMPLATE['id']}#template-{FIXTURE_TEMPLATE['id']}",
            "Open template",
        ),
        (
            "review_created",
            "review",
            UUID("99999999-9999-4999-8999-999999999999"),
            FIXTURE_TEMPLATE["id"],
            "Patient intake",
            "Reviews",
            "Review created",
            "Created a review · Status: pending",
            f"/templates?focus={FIXTURE_TEMPLATE['id']}#template-{FIXTURE_TEMPLATE['id']}",
            "Open template",
        ),
        (
            "schedule_created",
            "schedule",
            FIXTURE_EVENT["id"],
            None,
            FIXTURE_EVENT["title"],
            "Schedules",
            "Schedule created",
            "Created a scheduled event · Status: scheduled",
            f"/scheduler?edit={FIXTURE_EVENT['id']}",
            "Open schedule",
        ),
    ]
    return [
        {
            "id": UUID(f"{index:08d}-aaaa-4aaa-8aaa-{index:012d}"),
            "user_id": FIXTURE_USER.id,
            "event_type": event_type,
            "entity_kind": entity_kind,
            "entity_id": entity_id,
            "related_template_id": template_id,
            "label": label,
            "metadata": {},
            "occurred_at": now - timedelta(minutes=index * 5),
            "category": category,
            "title": title,
            "summary": summary,
            "target_url": target_url,
            "target_label": target_label,
        }
        for index, (
            event_type,
            entity_kind,
            entity_id,
            template_id,
            label,
            category,
            title,
            summary,
            target_url,
            target_label,
        ) in enumerate(events, start=1)
    ]


def _list_fixture_activity(
    user: SupabaseUser,
    *,
    search: str = "",
    category: str = "all",
    date_range: str = "all",
    limit: int = 25,
    offset: int = 0,
) -> tuple[list[dict[str, Any]], int]:
    if user.id != FIXTURE_USER.id:
        return [], 0
    category_types = {
        "forms": {"form_saved", "form_deleted"},
        "templates": {"template_created", "template_updated", "template_deleted"},
        "sharing": {"template_shared", "share_role_changed", "template_unshared"},
        "reviews": {"review_created", "review_updated", "review_status_changed", "review_deleted"},
        "schedules": {
            "schedule_created",
            "schedule_updated",
            "schedule_status_changed",
            "schedule_deleted",
        },
    }
    rows = list(_BROWSER_ACTIVITY_EVENTS)
    if category in category_types:
        rows = [row for row in rows if row["event_type"] in category_types[category]]
    if search:
        term = search.casefold()
        rows = [
            row
            for row in rows
            if term in row["label"].casefold() or term in row["event_type"].casefold()
        ]
    now = datetime.now(UTC)
    if date_range == "today":
        rows = [row for row in rows if row["occurred_at"].date() == now.date()]
    elif date_range == "week":
        rows = [row for row in rows if row["occurred_at"] >= now - timedelta(days=7)]
    elif date_range == "month":
        rows = [row for row in rows if row["occurred_at"] >= now - timedelta(days=30)]
    return rows[offset : offset + limit], len(rows)


def _remove_fixture_activity(user: SupabaseUser, event_id: UUID) -> bool:
    if user.id != FIXTURE_USER.id:
        return False
    for index, row in enumerate(_BROWSER_ACTIVITY_EVENTS):
        if row["id"] == event_id:
            del _BROWSER_ACTIVITY_EVENTS[index]
            return True
    return False


def _raise_fixture_filled_error(*args: Any, **kwargs: Any) -> list[dict[str, Any]]:
    raise ValueError("Synthetic filled-form listing failure.")


def _delete_fixture_filled(user: SupabaseUser, record_id: UUID) -> bool:
    if user.id != FIXTURE_USER.id:
        return False
    for index, row in enumerate(_BROWSER_FILLED_RECORDS):
        if row["id"] == record_id:
            del _BROWSER_FILLED_RECORDS[index]
            return True
    return False


def _schedule_rows(user: SupabaseUser) -> list[dict[str, Any]]:
    if user.id != FIXTURE_USER.id:
        return []
    return [row for row in _BROWSER_SCHEDULE_EVENTS if row["created_by"] == user.id]


def _list_fixture_events(
    user: SupabaseUser,
    *,
    start_date: date | None = None,
    end_date: date | None = None,
    event_type: str | None = None,
    status: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    rows = [
        row
        for row in _schedule_rows(user)
        if (start_date is None or row["date"] >= start_date)
        and (end_date is None or row["date"] <= end_date)
        and event_type in {None, "all", row["type"]}
        and status in {None, "all", row["status"]}
    ]
    rows.sort(key=lambda row: (row["date"], row["time"], str(row["id"])))
    return rows[offset : offset + limit]


def _get_fixture_event(user: SupabaseUser, event_id: UUID) -> dict[str, Any] | None:
    return next((row for row in _schedule_rows(user) if row["id"] == event_id), None)


def _search_fixture_events(
    user: SupabaseUser, term: str, *, limit: int = 100
) -> list[dict[str, Any]]:
    query = term.strip().casefold()
    if not query:
        return []
    rows = [
        row
        for row in _schedule_rows(user)
        if query in " ".join((row["title"], row["description"], row["location"])).casefold()
    ]
    return rows[:limit]


def _upcoming_fixture_events(user: SupabaseUser, *, limit: int = 10) -> list[dict[str, Any]]:
    today = datetime.now(UTC).date()
    rows = [
        row
        for row in _schedule_rows(user)
        if today <= row["date"] <= date.fromordinal(today.toordinal() + 7)
        and row["status"] == "scheduled"
    ]
    rows.sort(key=lambda row: (row["date"], row["time"], str(row["id"])))
    return rows[:limit]


def _fixture_event_stats(user: SupabaseUser) -> dict[str, int]:
    today = datetime.now(UTC).date()
    start_month = today.replace(day=1)
    rows = [row for row in _schedule_rows(user) if row["date"] >= start_month]
    return {
        "total": len(rows),
        "completed": sum(row["status"] == "completed" for row in rows),
        "upcoming": sum(row["date"] >= today and row["status"] == "scheduled" for row in rows),
        "highPriority": sum(
            row["date"] >= today and row["status"] == "scheduled" and row["priority"] == "high"
            for row in rows
        ),
    }


def _fixture_manage_event_stats(user: SupabaseUser) -> dict[str, int]:
    rows = _schedule_rows(user)
    return {
        "total": len(rows),
        "scheduled": sum(row["status"] == "scheduled" for row in rows),
        "completed": sum(row["status"] == "completed" for row in rows),
        "cancelled": sum(row["status"] == "cancelled" for row in rows),
        "high_priority": sum(row["priority"] == "high" for row in rows),
    }


def _create_fixture_event(user: SupabaseUser, values: dict[str, Any]) -> dict[str, Any]:
    if user.id != FIXTURE_USER.id:
        raise ValueError("The schedule is unavailable to this synthetic account.")
    now = datetime.now(UTC)
    row = {
        "id": uuid4(),
        "created_by": user.id,
        "created_at": now,
        "updated_at": now,
        "description": "",
        "duration": 60,
        "type": "other",
        "priority": "medium",
        "attendees": [],
        "location": "",
        "form_id": None,
        "reminder_minutes": 15,
        "status": "scheduled",
        **values,
    }
    _BROWSER_SCHEDULE_EVENTS.append(row)
    return row


def _update_fixture_event(
    user: SupabaseUser, event_id: UUID, values: dict[str, Any]
) -> dict[str, Any] | None:
    row = _get_fixture_event(user, event_id)
    if row is None:
        return None
    row.update(values)
    row["updated_at"] = datetime.now(UTC)
    return row


def _delete_fixture_event(user: SupabaseUser, event_id: UUID) -> bool:
    row = _get_fixture_event(user, event_id)
    if row is None:
        return False
    _BROWSER_SCHEDULE_EVENTS.remove(row)
    return True


def _set_fixture_event_status(
    user: SupabaseUser, event_id: UUID, status: str
) -> dict[str, Any] | None:
    return _update_fixture_event(user, event_id, {"status": status})


def _reset_browser_schedule_fixtures(event_date: str = "") -> None:
    event = {**FIXTURE_EVENT, "attendees": list(FIXTURE_EVENT["attendees"])}
    if event_date:
        try:
            event["date"] = date.fromisoformat(event_date)
        except ValueError:
            pass
    other_user_event = {
        **FIXTURE_OTHER_USER_EVENT,
        "attendees": list(FIXTURE_OTHER_USER_EVENT["attendees"]),
    }
    _BROWSER_SCHEDULE_EVENTS[:] = [event, other_user_event]


class P7FixtureAuthenticationMiddleware:
    """Replace network Auth/data with fixed, visibly synthetic browser fixtures."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        global _BROWSER_ACTIVITY_READY
        fixture_path = request.path_info.rstrip("/")
        if (
            request.headers.get("X-P7-Fixture-Reset") == "1"
            and request.method == "GET"
            and not request.GET
        ):
            fixture_event_date = (
                request.headers.get("X-P7-Fixture-Event-Date", "")
                if fixture_path == "/scheduler"
                else ""
            )
            if fixture_path in {"/scheduler", "/manage-schedules", "/scheduler-settings"}:
                _reset_browser_schedule_fixtures(fixture_event_date)
            if fixture_path == "/templates":
                _reset_browser_templates()
            if fixture_path in {"/dashboard", "/filledtemplates"}:
                _BROWSER_FILLED_RECORDS[:] = [
                    {**FIXTURE_FILLED, "form_data": dict(FIXTURE_FILLED["form_data"])}
                ]
            if fixture_path == "/activitylog":
                _BROWSER_ACTIVITY_EVENTS[:] = _make_fixture_activity_events()
                _BROWSER_ACTIVITY_READY = True
        if fixture_path == "/activitylog" and not _BROWSER_ACTIVITY_READY:
            _BROWSER_ACTIVITY_EVENTS[:] = _make_fixture_activity_events()
            _BROWSER_ACTIVITY_READY = True
        session_auth = request.session.get(AUTH_SESSION_KEY)
        synthetic_session = (
            isinstance(session_auth, dict)
            and session_auth.get("access_token") == "synthetic-browser-auth-access"
        )
        auth_flow = (
            request.headers.get("X-P7-Auth-Flow") == "1"
            or request.GET.get("p7_auth_flow") == "1"
            or request.POST.get("p7_auth_flow") == "1"
            or synthetic_session
        )
        if auth_flow and request.method == "GET" and request.path_info in {"/login", "/login/"}:
            global _AUTH_FLOW_SIGN_IN_CALLS
            _AUTH_FLOW_SIGN_IN_CALLS = 0
        with ExitStack() as stack:
            stack.enter_context(
                patch(
                    "apps.accounts.middleware.authenticate_session",
                    side_effect=(
                        _authenticate_auth_flow
                        if auth_flow
                        else _fixture_user_for_request
                    ),
                )
            )
            if auth_flow:
                _enter_auth_patch(
                    stack,
                    "apps.api.middleware.authenticate_session",
                    _authenticate_auth_flow,
                )
                _enter_auth_patch(
                    stack,
                    "apps.accounts.services.gotrue.GoTrueClient.sign_in",
                    _auth_flow_sign_in,
                )
                _enter_auth_patch(
                    stack,
                    "apps.accounts.services.gotrue.GoTrueClient.sign_up",
                    _auth_flow_sign_up,
                )
                _enter_auth_patch(
                    stack,
                    "apps.accounts.services.gotrue.GoTrueClient.update_password",
                    lambda _client, *_args, **_kwargs: None,
                )
                _enter_auth_patch(
                    stack,
                    "apps.accounts.services.gotrue.GoTrueClient.sign_out_local",
                    lambda _client, *_args, **_kwargs: None,
                )
                _enter_auth_patch(
                    stack,
                    "apps.accounts.views.ensure_profile",
                    lambda *_args, **_kwargs: None,
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
                    side_effect=_list_fixture_templates,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_selectors.get_template",
                    side_effect=_get_fixture_template,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_selectors.list_received_shares",
                    side_effect=_list_fixture_received_shares,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_selectors.list_sent_shares",
                    side_effect=_list_fixture_sent_shares,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_selectors.list_review_queue",
                    side_effect=_list_fixture_review_queue,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.create_template",
                    side_effect=_create_fixture_template,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.update_template",
                    side_effect=_update_fixture_template,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.set_template_visibility",
                    side_effect=_set_fixture_template_visibility,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.delete_template",
                    side_effect=_delete_fixture_template,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.create_shares",
                    side_effect=_create_fixture_shares,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.remove_share",
                    side_effect=_remove_fixture_share,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.set_share_hidden",
                    side_effect=_set_fixture_share_hidden,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.set_share_role",
                    side_effect=_set_fixture_share_role,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.request_review",
                    side_effect=_request_fixture_review,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.create_review",
                    side_effect=_create_fixture_review,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.template_services.update_review",
                    side_effect=_update_fixture_review,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.storage_services.upload_template_file",
                    side_effect=_upload_fixture_template_file,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.storage_services.download_template_file",
                    side_effect=_download_fixture_template_file,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.storage_services.remove_template_object",
                    side_effect=_remove_fixture_template_object,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.upcoming_events",
                    side_effect=_upcoming_fixture_events,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.event_stats",
                    side_effect=_fixture_event_stats,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.manage_event_stats",
                    side_effect=_fixture_manage_event_stats,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.list_events",
                    side_effect=_list_fixture_events,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.search_events",
                    side_effect=_search_fixture_events,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_selectors.get_event",
                    side_effect=_get_fixture_event,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_services.create_event",
                    side_effect=_create_fixture_event,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_services.update_event",
                    side_effect=_update_fixture_event,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_services.delete_event",
                    side_effect=_delete_fixture_event,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.schedule_services.set_event_status",
                    side_effect=_set_fixture_event_status,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.filled_selectors.list_filled",
                    side_effect=(
                        _raise_fixture_filled_error
                        if request.headers.get("X-P9-Filled-Error") == "1"
                        else _list_fixture_filled
                    ),
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.filled_selectors.list_filled_summaries",
                    side_effect=(
                        _raise_fixture_filled_error
                        if request.headers.get("X-P9-Filled-Error") == "1"
                        else (
                            _empty_fixture_filled_summaries
                            if request.headers.get("X-P11-Recent-Forms-Empty") == "1"
                            else _list_fixture_filled_summaries
                        )
                    ),
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.filled_selectors.get_filled",
                    side_effect=_get_fixture_filled,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.filled_services.save_filled",
                    side_effect=_save_fixture_filled,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.filled_services.delete_filled",
                    side_effect=_delete_fixture_filled,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.activity_selectors.list_activity",
                    side_effect=_list_fixture_activity,
                )
            )
            stack.enter_context(
                patch(
                    "apps.application.views.activity_services.remove_activity_event",
                    side_effect=_remove_fixture_activity,
                )
            )
            response = self.get_response(request)
            if auth_flow:
                response["X-P7-Auth-Flow-Active"] = "true"
                response["X-P7-Auth-Flow-Signin-Calls"] = str(_AUTH_FLOW_SIGN_IN_CALLS)
            return response
