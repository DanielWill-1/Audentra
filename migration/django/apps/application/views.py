from __future__ import annotations

import json
import re
from calendar import Calendar
from collections.abc import Callable
from datetime import date, datetime, time, timedelta
from typing import Any
from urllib.parse import urlencode
from uuid import UUID

from apps.accounts import profile_selectors, profile_services
from apps.accounts.principals import SupabaseUser
from apps.ai import services as ai_services
from apps.scheduler import selectors as schedule_selectors
from apps.scheduler import services as schedule_services
from apps.storage import services as storage_services
from apps.templates_app import selectors as template_selectors
from apps.templates_app import services as template_services
from apps.voice import filled_services
from apps.voice import selectors as filled_selectors
from apps.voice import services as voice_services
from django.conf import settings
from django.db import DatabaseError
from django.http import HttpRequest, HttpResponse, HttpResponseNotAllowed
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods, require_safe

APPLICATION_PAGE_VIEWS: dict[str, Callable[[HttpRequest], HttpResponse]] = {}


def _principal(request: HttpRequest) -> SupabaseUser | None:
    user = getattr(request, "user", None)
    if isinstance(user, SupabaseUser) and user.is_authenticated and user.is_verified:
        return user
    return None


def _guard(request: HttpRequest, route: str) -> tuple[SupabaseUser | None, HttpResponse | None]:
    if request.META.get("P4_AUTH_UNAVAILABLE", False):
        response = render(
            request,
            "accounts/message.html",
            {"title": "Session unavailable", "message": "Please try again shortly."},
            status=503,
        )
        response["Cache-Control"] = "no-store"
        response["Referrer-Policy"] = "no-referrer"
        return None, response
    user = _principal(request)
    if user is None:
        next_path = urlencode({"next": route})
        return None, redirect(f"{reverse('login')}?{next_path}")
    return user, None


def _page(
    request: HttpRequest,
    route: str,
    template: str,
    context: dict[str, Any] | None = None,
    *,
    status: int = 200,
) -> HttpResponse:
    values = {"active_route": route, **(context or {})}
    response = render(request, template, values, status=status)
    response["Cache-Control"] = "no-store"
    response["Referrer-Policy"] = "no-referrer"
    return response


def _as_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except (ValueError, TypeError, AttributeError) as error:
        raise ValueError("Choose a valid record.") from error


def _json_object(value: str, *, max_bytes: int = 1_000_000) -> dict[str, Any]:
    if len(value.encode("utf-8")) > max_bytes:
        raise ValueError("The JSON value is too large.")
    try:
        result = json.loads(value)
    except json.JSONDecodeError as error:
        raise ValueError("Enter valid JSON.") from error
    if not isinstance(result, dict):
        raise ValueError("The JSON value must be an object.")
    return result


def _json_download(filename: str, payload: dict[str, Any]) -> HttpResponse:
    response = HttpResponse(
        json.dumps(payload, default=str, ensure_ascii=False, indent=2),
        content_type="application/json; charset=utf-8",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["Cache-Control"] = "no-store"
    response["Referrer-Policy"] = "no-referrer"
    return response


@require_http_methods(["GET", "POST"])
def dashboard(request: HttpRequest) -> HttpResponse:
    route = "/dashboard"
    user, denial = _guard(request, route)
    if denial is not None:
        return denial
    assert user is not None
    notice = ""
    error = ""
    if request.method == "POST":
        action = request.POST.get("action", "")
        if action == "save-profile":
            try:
                profile_services.update_profile(
                    user,
                    {
                        key: request.POST.get(key, "")
                        for key in ("first_name", "last_name", "company", "industry")
                    },
                )
                notice = "Profile saved."
            except (ValueError, DatabaseError):
                error = "Your profile could not be saved. Please try again."
        elif action == "team-demo":
            notice = "Team membership changes are a demo state and are not saved."
        else:
            return HttpResponseNotAllowed(["GET", "POST"])

    context: dict[str, Any] = {"notice": notice, "error": error}
    try:
        context["profile"] = profile_selectors.get_profile(user)
        context["templates"] = template_selectors.list_templates(user, limit=6)
        context["upcoming_events"] = schedule_selectors.upcoming_events(user, limit=5)
        context["stats"] = schedule_selectors.event_stats(user)
    except (DatabaseError, ValueError):
        context["data_error"] = "Workspace data is temporarily unavailable."
        context.setdefault("templates", [])
        context.setdefault("upcoming_events", [])
        context.setdefault("stats", {"total": 0, "completed": 0, "upcoming": 0, "highPriority": 0})
        if "profile" not in context:
            context["profile"] = {
                "first_name": "",
                "last_name": "",
                "company": "",
                "industry": "",
            }
    return _page(request, route, "application/dashboard.html", context)


@require_http_methods(["GET", "POST"])
def templates_page(request: HttpRequest) -> HttpResponse:
    route = "/templates"
    user, denial = _guard(request, route)
    if denial is not None:
        return denial
    assert user is not None
    template_name = "application/templates.html"
    notice = ""
    error = ""
    if request.method == "POST":
        action = request.POST.get("action", "")
        template_id: UUID | None = None
        try:
            if action in {
                "update",
                "duplicate",
                "visibility",
                "delete",
                "upload",
                "download",
                "share",
                "request-review",
                "create-review",
            }:
                template_id = _as_uuid(request.POST.get("template_id", ""))
            if action == "create":
                form_data = _json_object(request.POST.get("form_data", "{}"))
                created = template_services.create_template(
                    user,
                    {
                        "name": request.POST.get("name", ""),
                        "category": request.POST.get("category", ""),
                        "description": request.POST.get("description", ""),
                        "form_data": form_data,
                        "visibility": request.POST.get("visibility", "visible"),
                    },
                )
                uploaded = request.FILES.get("template_file")
                if uploaded is not None:
                    storage_services.upload_template_file(request, user, created["id"], uploaded)
                notice = "Template created."
            elif action == "update":
                assert template_id is not None
                form_data = _json_object(request.POST.get("form_data", "{}"))
                saved = template_services.update_template(
                    user,
                    template_id,
                    {
                        "name": request.POST.get("name", ""),
                        "description": request.POST.get("description", ""),
                        "form_data": form_data,
                        "visibility": request.POST.get("visibility", "visible"),
                    },
                )
                if saved is None:
                    raise ValueError("This template is no longer available to your account.")
                notice = "Template saved."
            elif action == "duplicate":
                assert template_id is not None
                source = template_selectors.get_template(user, template_id)
                if source is None:
                    raise ValueError("This template is not available to duplicate.")
                template_services.create_template(
                    user,
                    {
                        "name": f"{source['name']} copy",
                        "category": source["category"],
                        "description": source.get("description") or "",
                        "form_data": source.get("form_data") or {},
                        "visibility": "visible",
                    },
                )
                notice = "Template duplicated."
            elif action == "visibility":
                assert template_id is not None
                saved = template_services.set_template_visibility(
                    user, template_id, request.POST.get("visibility", "")
                )
                if saved is None:
                    raise ValueError("This template is not available to update.")
                notice = "Template visibility updated."
            elif action == "delete":
                assert template_id is not None

                def delete_current_file(_path: str) -> None:
                    deleted_file = storage_services.delete_template_file(request, user, template_id)
                    if not deleted_file:
                        raise ValueError("The private template file could not be deleted.")

                deleted = template_services.delete_template(
                    user,
                    template_id,
                    delete_file=delete_current_file,
                )
                if not deleted:
                    raise ValueError("This template is not available to delete.")
                notice = "Template deleted."
            elif action == "upload":
                assert template_id is not None
                uploaded = request.FILES.get("template_file")
                if uploaded is None:
                    raise ValueError("Choose a JSON, CSV, PDF, XLS, or XLSX file.")
                storage_services.upload_template_file(request, user, template_id, uploaded)
                notice = "Private template file saved."
            elif action == "download":
                assert template_id is not None
                content, content_type, filename = storage_services.download_template_file(
                    request, user, template_id
                )
                response = HttpResponse(content, content_type=content_type)
                response["Content-Disposition"] = f'attachment; filename="{filename}"'
                response["Cache-Control"] = "no-store"
                response["Referrer-Policy"] = "no-referrer"
                return response
            elif action == "share":
                assert template_id is not None
                recipient_ids = [
                    _as_uuid(value.strip())
                    for value in request.POST.get("recipient_ids", "")
                    .replace(",", "\n")
                    .splitlines()
                    if value.strip()
                ]
                template_services.create_shares(
                    user,
                    template_id,
                    recipient_ids,
                    request.POST.get("role", "viewer"),
                    message=request.POST.get("message", ""),
                )
                notice = "Share saved for the selected account IDs."
            elif action == "remove-share":
                if not template_services.remove_share(
                    user, _as_uuid(request.POST.get("share_id", ""))
                ):
                    raise ValueError("This share is not available to remove.")
                notice = "Share removed."
            elif action == "hide-share":
                updated = template_services.set_share_hidden(
                    user,
                    _as_uuid(request.POST.get("share_id", "")),
                    request.POST.get("hidden") == "true",
                )
                if updated is None:
                    raise ValueError("This received share is no longer available.")
                notice = "Received share preference updated."
            elif action == "share-role":
                updated = template_services.set_share_role(
                    user,
                    _as_uuid(request.POST.get("share_id", "")),
                    request.POST.get("role", ""),
                )
                if updated is None:
                    raise ValueError("This share is no longer available to update.")
                notice = "Share role updated."
            elif action == "request-review":
                assert template_id is not None
                template_services.request_review(user, template_id)
                notice = "Review request submitted."
            elif action == "create-review":
                assert template_id is not None
                template_services.create_review(
                    user,
                    template_id,
                    rating=int(request.POST.get("rating", "0")),
                    comment=request.POST.get("comment", ""),
                )
                notice = "Review submitted for the template owner."
            elif action == "moderate-review":
                status = request.POST.get("status", "")
                if status not in {"approved", "rejected", "needs_changes"}:
                    raise ValueError("Choose a valid review decision.")
                updated = template_services.update_review(
                    user, _as_uuid(request.POST.get("review_id", "")), {"status": status}
                )
                if updated is None:
                    raise ValueError("This review is not available to moderate.")
                notice = "Review decision saved."
            else:
                return HttpResponseNotAllowed(["GET", "POST"])
        except (ValueError, DatabaseError, storage_services.StorageServiceError) as exception:
            if isinstance(exception, (ValueError, storage_services.StorageServiceError)):
                error = str(exception)
            else:
                error = "The template action could not be completed."
    query = request.GET.get("q", "")[:120]
    category = request.GET.get("category", "all")
    sort_by = request.GET.get("sort", "created_at")
    context: dict[str, Any] = {
        "notice": notice,
        "error": error,
        "query": query,
        "category": category,
    }
    try:
        if request.GET.get("export") == "template":
            exported = template_selectors.get_template(user, _as_uuid(request.GET.get("id", "")))
            if exported is None:
                return HttpResponse("Template not found.", status=404, content_type="text/plain")
            payload = {
                "name": exported["name"],
                "category": exported["category"],
                "description": exported.get("description"),
                "form_data": exported.get("form_data"),
                "created_at": exported.get("created_at"),
                "exported_at": datetime.now().astimezone().isoformat(),
            }
            filename = (
                re.sub(r"[^a-z0-9]", "_", str(exported["name"]).lower()).strip("_") or "template"
            )
            return _json_download(f"{filename}_template.json", payload)
        if request.GET.get("file"):
            content, content_type, filename = storage_services.download_template_file(
                request, user, _as_uuid(request.GET["file"])
            )
            response = HttpResponse(content, content_type=content_type)
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            response["Cache-Control"] = "no-store"
            response["Referrer-Policy"] = "no-referrer"
            return response
        context["templates"] = template_selectors.list_templates(
            user, category=category, search=query, sort_by=sort_by, limit=100
        )
        context["received_shares"] = template_selectors.list_received_shares(user)
        context["sent_shares"] = template_selectors.list_sent_shares(user)
        context["review_queue"] = template_selectors.list_review_queue(user)
        context["categories"] = (
            "healthcare",
            "fieldwork",
            "hr",
            "legal",
            "education",
            "realestate",
        )
    except (DatabaseError, ValueError, storage_services.StorageServiceError):
        context["data_error"] = "Template data is temporarily unavailable."
        context.setdefault("templates", [])
        context.setdefault("received_shares", [])
        context.setdefault("sent_shares", [])
        context.setdefault("review_queue", [])
        context.setdefault("categories", ())
    return _page(request, route, template_name, context)


def _event_form_values(request: HttpRequest) -> dict[str, Any]:
    attendees = [
        item.strip()[:200]
        for item in request.POST.get("attendees", "").replace(",", "\n").splitlines()
        if item.strip()
    ]
    form_id = request.POST.get("form_id", "").strip()
    return {
        "title": request.POST.get("title", ""),
        "description": request.POST.get("description", ""),
        "date": date.fromisoformat(request.POST.get("date", "")),
        "time": time.fromisoformat(request.POST.get("time", "")),
        "duration": int(request.POST.get("duration", "60")),
        "type": request.POST.get("type", "other"),
        "priority": request.POST.get("priority", "medium"),
        "attendees": attendees,
        "location": request.POST.get("location", ""),
        "form_id": _as_uuid(form_id) if form_id else None,
        "reminder_minutes": int(request.POST.get("reminder_minutes", "15")),
    }


@require_http_methods(["GET", "POST"])
def scheduler(request: HttpRequest) -> HttpResponse:
    route = "/scheduler"
    user, denial = _guard(request, route)
    if denial is not None:
        return denial
    assert user is not None
    notice = ""
    error = ""
    if request.method == "POST":
        action = request.POST.get("action", "")
        try:
            if action == "create":
                schedule_services.create_event(user, _event_form_values(request))
                notice = "Schedule created."
            elif action in {"update", "delete", "complete", "cancel"}:
                event_id = _as_uuid(request.POST.get("event_id", ""))
                if schedule_selectors.get_event(user, event_id) is None:
                    raise ValueError("This event is not available to your account.")
                if action == "delete":
                    if not schedule_services.delete_event(user, event_id):
                        raise ValueError("This event could not be deleted.")
                    notice = "Schedule deleted."
                elif action in {"complete", "cancel"}:
                    state = "completed" if action == "complete" else "cancelled"
                    schedule_services.set_event_status(user, event_id, state)
                    notice = f"Schedule marked {state}."
                else:
                    schedule_services.update_event(user, event_id, _event_form_values(request))
                    notice = "Schedule updated."
            else:
                return HttpResponseNotAllowed(["GET", "POST"])
        except (ValueError, DatabaseError):
            error = "The schedule could not be saved. Check the entered date, time and values."

    requested_view = request.GET.get("view", "month")
    view = requested_view if requested_view in {"month", "week"} else "month"
    raw_selected_date = request.GET.get("date", "")
    try:
        selected_date = date.fromisoformat(raw_selected_date) if raw_selected_date else date.today()
    except ValueError:
        selected_date = date.today()
        error = error or "Choose a valid schedule date."
    raw_month = request.GET.get("month", "")
    try:
        month_start = (
            date.fromisoformat(f"{raw_month}-01")
            if len(raw_month) == 7
            else selected_date.replace(day=1)
        )
        month_start = month_start.replace(day=1)
    except ValueError:
        month_start = selected_date.replace(day=1)
    next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
    previous_month = (month_start - timedelta(days=1)).replace(day=1)
    if view == "week":
        week_start = selected_date - timedelta(days=selected_date.weekday())
        calendar_days = [[week_start + timedelta(days=offset) for offset in range(7)]]
        first_day = week_start
        last_day = week_start + timedelta(days=6)
        previous_target = (week_start - timedelta(days=7)).isoformat()
        next_target = (week_start + timedelta(days=7)).isoformat()
        today_target = date.today().isoformat()
    else:
        week_start = None
        calendar_days = Calendar(firstweekday=0).monthdatescalendar(
            month_start.year, month_start.month
        )
        first_day = min(day for week in calendar_days for day in week)
        last_day = max(day for week in calendar_days for day in week)
        previous_target = previous_month.strftime("%Y-%m")
        next_target = next_month.strftime("%Y-%m")
        today_target = date.today().strftime("%Y-%m")
    context: dict[str, Any] = {
        "notice": notice,
        "error": error,
        "month": month_start,
        "previous_target": previous_target,
        "next_target": next_target,
        "today_target": today_target,
        "selected_date": selected_date,
        "week_start": week_start,
        "week_end": week_start + timedelta(days=6) if week_start else None,
        "weeks": calendar_days,
        "events_by_day": {},
        "calendar_weeks": [],
        "weekdays": ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"),
        "view": view,
        "templates": [],
    }
    try:
        events = schedule_selectors.list_events(user, start_date=first_day, end_date=last_day)
        context["templates"] = template_selectors.list_templates(user, limit=100)
        by_day: dict[date, list[dict[str, Any]]] = {}
        for event in events:
            by_day.setdefault(event["date"], []).append(event)
        context["events_by_day"] = by_day
        context["events"] = events
        weeks = [
            [{"date": day, "events": by_day.get(day, [])} for day in week] for week in calendar_days
        ]
        context["calendar_weeks"] = weeks
    except (DatabaseError, ValueError):
        context["events"] = []
        context["data_error"] = "Schedules are temporarily unavailable."
    return _page(request, route, "application/scheduler.html", context)


@require_http_methods(["GET", "POST"])
def manage_schedules(request: HttpRequest) -> HttpResponse:
    route = "/manage-schedules"
    user, denial = _guard(request, route)
    if denial is not None:
        return denial
    assert user is not None
    notice = ""
    error = ""
    if request.method == "POST":
        action = request.POST.get("action", "")
        selected = request.POST.getlist("selected_ids")
        if request.POST.get("event_id"):
            selected = [request.POST["event_id"]]
        try:
            if action == "update":
                event_id = _as_uuid(request.POST.get("event_id", ""))
                if schedule_selectors.get_event(user, event_id) is None:
                    raise ValueError("This schedule is no longer available to your account.")
                schedule_services.update_event(user, event_id, _event_form_values(request))
                notice = "Schedule updated."
            elif not selected or len(selected) > 100:
                raise ValueError("Select between 1 and 100 schedules.")
            else:
                identifiers = list(dict.fromkeys(_as_uuid(item) for item in selected))
                if len(identifiers) != len(selected):
                    raise ValueError("A schedule was selected more than once.")
                records: list[dict[str, Any]] = []
                for event_id in identifiers:
                    event = schedule_selectors.get_event(user, event_id)
                    if event is None:
                        raise ValueError("One or more selected schedules are not available.")
                    records.append(event)
                if action == "export":
                    return _json_download(
                        f"events_export_{date.today().isoformat()}.json",
                        {
                            "exported_at": datetime.now().astimezone().isoformat(),
                            "events": records,
                        },
                    )
                for event_id in identifiers:
                    if action == "complete":
                        schedule_services.set_event_status(user, event_id, "completed")
                    elif action == "cancel":
                        schedule_services.set_event_status(user, event_id, "cancelled")
                    elif action == "delete":
                        schedule_services.delete_event(user, event_id)
                    else:
                        raise ValueError("Choose a supported bulk operation.")
                notice = f"{len(identifiers)} schedules updated."
        except (ValueError, DatabaseError):
            error = (
                "The selected schedules could not be updated. Review the selection and try again."
            )

    query = request.GET.get("q", "")[:120]
    event_type = request.GET.get("type", "all")
    status = request.GET.get("status", "all")
    sort_by = request.GET.get("sort", "date")
    sort_order = request.GET.get("order", "asc")
    context: dict[str, Any] = {
        "query": query,
        "selected_type": event_type,
        "selected_status": status,
        "sort": sort_by,
        "sort_order": sort_order,
        "type_options": (
            ("form_review", "Form review"),
            ("team_meeting", "Team meeting"),
            ("training", "Training"),
            ("maintenance", "Maintenance"),
            ("other", "Other"),
        ),
        "status_options": (
            ("scheduled", "Scheduled"),
            ("in_progress", "In progress"),
            ("completed", "Completed"),
            ("cancelled", "Cancelled"),
        ),
        "notice": notice,
        "error": error,
    }
    try:
        rows = (
            schedule_selectors.search_events(user, query)
            if query
            else schedule_selectors.list_events(user, limit=250)
        )
        if event_type != "all":
            rows = [row for row in rows if row["type"] == event_type]
        if status != "all":
            rows = [row for row in rows if row["status"] == status]
        if sort_order not in {"asc", "desc"}:
            raise ValueError("Unsupported sort direction.")
        if sort_by in {"date", "title", "status", "priority", "type"}:
            if sort_by == "priority":
                priority = {"low": 1, "medium": 2, "high": 3}
                rows.sort(
                    key=lambda row: (priority.get(row["priority"], 0), str(row["id"])),
                    reverse=sort_order == "desc",
                )
            elif sort_by == "date":
                rows.sort(
                    key=lambda row: (row["date"], row["time"], str(row["id"])),
                    reverse=sort_order == "desc",
                )
            else:
                rows.sort(
                    key=lambda row: (
                        str(row.get(sort_by) or "").casefold(),
                        str(row["id"]),
                    ),
                    reverse=sort_order == "desc",
                )
        else:
            context["error"] = context["error"] or "Choose a supported sort column."
        context["events"] = rows
    except (DatabaseError, ValueError):
        context["events"] = []
        context["data_error"] = "Schedules are temporarily unavailable."
    return _page(request, route, "application/manage_schedules.html", context)


@require_safe
def scheduler_settings(request: HttpRequest) -> HttpResponse:
    route = "/scheduler-settings"
    user, denial = _guard(request, route)
    if denial is not None:
        return denial
    assert user is not None
    return _page(
        request,
        route,
        "application/scheduler_settings.html",
        {
            "local_settings_key": f"scheduler_settings_{user.id}",
            "settings_user_id": str(user.id),
        },
    )


def _conversation_values(value: str) -> list[dict[str, str]]:
    if len(value.encode("utf-8")) > 100_000:
        raise ValueError("Conversation is too large.")
    try:
        raw = json.loads(value or "[]")
    except json.JSONDecodeError as error:
        raise ValueError("Conversation state is invalid. Start a new conversation.") from error
    if not isinstance(raw, list) or len(raw) > 30:
        raise ValueError("Conversation state is invalid. Start a new conversation.")
    result: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict) or item.get("type") not in {"user", "assistant"}:
            raise ValueError("Conversation state is invalid. Start a new conversation.")
        content = item.get("content")
        if not isinstance(content, str):
            raise ValueError("Conversation state is invalid. Start a new conversation.")
        result.append({"type": item["type"], "content": content[:4000]})
    return result


@require_http_methods(["GET", "POST"])
def voice_autofill(request: HttpRequest) -> HttpResponse:
    route = "/AIVoiceAutoFill"
    user, denial = _guard(request, route)
    if denial is not None:
        return denial
    assert user is not None
    notice = ""
    error = ""
    template_id: UUID | None = None
    if request.method == "POST":
        try:
            template_id = _as_uuid(request.POST.get("template_id", ""))
        except ValueError as exception:
            error = str(exception)
    else:
        candidate = request.GET.get("template", "")
        if candidate:
            try:
                template_id = _as_uuid(candidate)
            except ValueError:
                error = "Choose a valid template."

    template: dict[str, Any] | None = None
    fields: list[dict[str, Any]] = []
    form_data: dict[str, Any] = {}
    conversation: list[dict[str, str]] = []
    templates: list[dict[str, Any]] = []
    if not error:
        try:
            templates = template_selectors.list_templates(user, limit=100)
            if template_id is not None:
                template = template_selectors.get_template(user, template_id)
                if template is None:
                    raise ValueError("This template is no longer available to your account.")
                raw_fields = (template.get("form_data") or {}).get("fields", [])
                if not isinstance(raw_fields, list):
                    raise ValueError("This template does not contain a readable field list.")
                fields = [item for item in raw_fields if isinstance(item, dict)]
                if len(fields) != len(raw_fields):
                    raise ValueError("This template contains an unsupported field definition.")
                if request.method == "GET":
                    conversation = [
                        {
                            "type": "assistant",
                            "content": (
                                f'AI Assistant activated for "{template["name"]}". '
                                "I will help you fill this form. Describe the information you "
                                "want to add, and review each field before you save."
                            ),
                        }
                    ]
        except (DatabaseError, ValueError) as exception:
            error = (
                str(exception)
                if isinstance(exception, ValueError)
                else "Workspace data is temporarily unavailable."
            )

    action = request.POST.get("action", "") if request.method == "POST" else ""
    if not error and template is not None and request.method == "POST":
        try:
            if action == "extract":
                conversation = _conversation_values(request.POST.get("conversation_json", "[]"))
                message = request.POST.get("message", "").strip()
                if not message:
                    raise ValueError("Describe the information you want to add first.")
                conversation.append({"type": "user", "content": message[:4000]})
                current = _json_object(request.POST.get("form_data", "{}"), max_bytes=100_000)
                result = ai_services.extract(message, fields, current, conversation[:-1])
                extracted = result.get("extractedData", {})
                if isinstance(extracted, dict):
                    form_data = voice_services.apply_extraction(extracted, fields, current)
                response_text = result.get("response", "")
                if isinstance(response_text, str) and response_text:
                    conversation.append({"type": "assistant", "content": response_text[:4000]})
            elif action == "save":
                conversation = _conversation_values(request.POST.get("conversation_json", "[]"))
                values: dict[str, Any] = {}
                missing: list[str] = []
                for field in fields:
                    field_id = field.get("id")
                    label = field.get("label")
                    if not isinstance(field_id, str) or not field_id:
                        continue
                    value: Any = request.POST.get(f"field_{field_id}", "")
                    if field.get("type") == "checkbox":
                        value = request.POST.get(f"field_{field_id}") == "true"
                    if field.get("required") and value in {"", None}:
                        missing.append(label if isinstance(label, str) and label else field_id)
                    values[field_id] = value
                if missing:
                    error = "Complete the required fields: " + ", ".join(missing[:8])
                    form_data = values
                else:
                    filled_services.save_filled(user, values, template_id=template_id)
                    return redirect("/filledtemplates")
            elif action == "select":
                return redirect(f"/AIVoiceAutoFill?template={template_id}")
            else:
                return HttpResponseNotAllowed(["GET", "POST"])
        except (ValueError, DatabaseError) as exception:
            error = (
                str(exception)
                if isinstance(exception, ValueError)
                else "The form could not be saved. Please try again."
            )

    if template is not None and request.method == "POST" and action == "extract" and not error:
        try:
            submitted_data = _json_object(request.POST.get("form_data", "{}"), max_bytes=100_000)
            if not form_data:
                form_data = submitted_data
        except ValueError:
            form_data = {}
    field_rows = []
    for field in fields:
        field_id = field.get("id")
        if not isinstance(field_id, str):
            continue
        options = field.get("options", [])
        if not isinstance(options, list):
            options = []
        field_rows.append(
            {
                **field,
                "value": form_data.get(field_id, ""),
                "checked": form_data.get(field_id) is True,
                "options": options,
            }
        )
    return _page(
        request,
        route,
        "application/voice_autofill.html",
        {
            "templates": templates,
            "selected_template": template,
            "fields": fields,
            "fields_json": json.dumps(fields, ensure_ascii=False),
            "field_rows": field_rows,
            "form_data": form_data,
            "form_data_json": json.dumps(form_data, ensure_ascii=False),
            "conversation": conversation,
            "conversation_json": json.dumps(conversation, ensure_ascii=False),
            "notice": notice,
            "error": error,
            "api_marker": settings.P3_API_MARKER,
            "max_audio_bytes": settings.P3_MAX_AUDIO_BYTES,
        },
    )


@require_http_methods(["GET", "POST"])
def filled_templates(request: HttpRequest) -> HttpResponse:
    route = "/filledtemplates"
    user, denial = _guard(request, route)
    if denial is not None:
        return denial
    assert user is not None
    notice = ""
    error = ""
    if request.method == "POST":
        if request.POST.get("action") != "delete":
            return HttpResponseNotAllowed(["GET", "POST"])
        try:
            if not filled_services.delete_filled(user, _as_uuid(request.POST.get("record_id", ""))):
                raise ValueError("This filled form is no longer available to your account.")
            notice = "Filled form deleted."
        except (ValueError, DatabaseError) as exception:
            error = (
                str(exception)
                if isinstance(exception, ValueError)
                else "The filled form could not be deleted."
            )
    try:
        rows = filled_selectors.list_filled(user, limit=250)
    except (DatabaseError, ValueError):
        rows = []
        error = error or "Filled forms are temporarily unavailable."
    return _page(
        request,
        route,
        "application/filled_templates.html",
        {"filled": rows, "notice": notice, "error": error},
    )


@require_safe
def activity_log(request: HttpRequest) -> HttpResponse:
    route = "/activitylog"
    user, denial = _guard(request, route)
    if denial is not None:
        return denial
    assert user is not None
    return _page(
        request,
        route,
        "application/activity_log.html",
        {"activity_key": f"voiceform_activity_{user.id}"},
    )


APPLICATION_PAGE_VIEWS.update(
    {
        "/dashboard": dashboard,
        "/templates": templates_page,
        "/scheduler": scheduler,
        "/manage-schedules": manage_schedules,
        "/scheduler-settings": scheduler_settings,
        "/AIVoiceAutoFill": voice_autofill,
        "/filledtemplates": filled_templates,
        "/activitylog": activity_log,
    }
)
