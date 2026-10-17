from __future__ import annotations

import json
import re
from calendar import Calendar
from collections.abc import Callable
from datetime import UTC, date, datetime, time, timedelta
from typing import Any
from urllib.parse import urlencode
from uuid import UUID, uuid4

from apps.accounts import profile_selectors, profile_services
from apps.accounts.principals import SupabaseUser
from apps.activity import selectors as activity_selectors
from apps.activity import services as activity_services
from apps.activity.presentation import CATEGORY_TYPES
from apps.ai import services as ai_services
from apps.api.consent import (
    CLOUD_AI_CONSENT_POLICY_VERSION,
    has_cloud_ai_consent,
)
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
from django.http import Http404, HttpRequest, HttpResponse, HttpResponseNotAllowed
from django.shortcuts import redirect, render
from django.urls import reverse
from django.utils import timezone
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
        response["Referrer-Policy"] = "same-origin"
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
    response["Referrer-Policy"] = "same-origin"
    return response


def _as_uuid(value: str) -> UUID:
    try:
        return UUID(value)
    except (ValueError, TypeError, AttributeError) as error:
        raise ValueError("Choose a valid record.") from error


def _query_page(value: str | None) -> int:
    if value in {None, ""}:
        return 1
    if not value.isascii() or not value.isdigit() or len(value) > 5:
        raise ValueError("Choose a valid page.")
    page = int(value)
    if not 1 <= page <= 10000:
        raise ValueError("Choose a valid page.")
    return page


def _record_uuid_or_404(value: str) -> UUID:
    try:
        return _as_uuid(value)
    except ValueError as error:
        raise Http404 from error


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


_EVENT_TYPE_LABELS = {
    "form_review": "Form review",
    "team_meeting": "Team meeting",
    "training": "Training",
    "maintenance": "Maintenance",
    "other": "Other",
}


def _label_schedule_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    labeled = []
    for event in events:
        event_type = event.get("type")
        type_label = (
            _EVENT_TYPE_LABELS.get(event_type, "Other") if isinstance(event_type, str) else "Other"
        )
        labeled.append({**event, "type_label": type_label})
    return labeled


def _filter_schedule_events(
    events: list[dict[str, Any]], query: str, event_type: str
) -> list[dict[str, Any]]:
    folded_query = query.casefold()
    return [
        event
        for event in events
        if (
            not folded_query
            or folded_query
            in " ".join(
                str(event.get(key, "")) for key in ("title", "description", "type_label")
            ).casefold()
        )
        and (event_type == "all" or event.get("type") == event_type)
    ]


def _dashboard_stats(stats: dict[str, int]) -> dict[str, int]:
    return {
        "Total": stats.get("total", 0),
        "Completed": stats.get("completed", 0),
        "Upcoming": stats.get("upcoming", 0),
        "High priority": stats.get("highPriority", 0),
    }


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

    context: dict[str, Any] = {
        "notice": notice,
        "error": error,
    }
    try:
        context["profile"] = profile_selectors.get_profile(user)
        context["templates"] = template_selectors.list_templates(user, limit=6)
        context["upcoming_events"] = _label_schedule_events(
            schedule_selectors.upcoming_events(user, limit=5)
        )
        context["stats"] = _dashboard_stats(schedule_selectors.event_stats(user))
    except (DatabaseError, ValueError):
        context["data_error"] = "Workspace data is temporarily unavailable."
        context.setdefault("templates", [])
        context.setdefault("upcoming_events", [])
        context.setdefault("stats", _dashboard_stats({}))
        if "profile" not in context:
            context["profile"] = {
                "first_name": "",
                "last_name": "",
                "company": "",
                "industry": "",
            }
    try:
        context["recent_forms"] = filled_selectors.list_filled_summaries(user, limit=5)
    except (DatabaseError, ValueError):
        context["recent_forms"] = []
        context["recent_forms_error"] = "Recent forms are temporarily unavailable."
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
                uploaded = request.FILES.get("template_file")
                method = request.POST.get("creation_method") or (
                    "upload" if uploaded is not None else "manual"
                )
                if method not in {"manual", "upload"}:
                    raise ValueError("Choose manual builder or private file upload.")
                if method == "manual" and (
                    not isinstance(form_data.get("fields"), list) or not form_data["fields"]
                ):
                    raise ValueError("Add at least one field before creating a voice-enabled form.")
                if method == "upload" and uploaded is None:
                    raise ValueError("Choose a JSON, CSV, PDF, XLS, or XLSX file.")
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
                if uploaded is not None:
                    storage_result = storage_services.upload_template_file(
                        request, user, created["id"], uploaded
                    )
                    if storage_result["cleanup_pending"]:
                        notice = "Template created. Its private file needs cleanup."
                    else:
                        notice = "Template created. Private file saved."
                else:
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

                def delete_current_file(path: str) -> None:
                    storage_services.remove_template_object(request, user, template_id, path)

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
                storage_result = storage_services.upload_template_file(
                    request, user, template_id, uploaded
                )
                notice = (
                    "Private file saved. The previous private file needs cleanup."
                    if storage_result["cleanup_pending"]
                    else "Private template file saved."
                )
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
            elif action == "update-review":
                updated = template_services.update_review(
                    user,
                    _as_uuid(request.POST.get("review_id", "")),
                    {
                        "rating": int(request.POST.get("rating", "0")),
                        "comment": request.POST.get("comment", ""),
                    },
                )
                if updated is None:
                    raise ValueError("This review is no longer available to update.")
                notice = "Review updated."
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
    sort_options = {
        "created_at-desc": ("created_at", False),
        "created_at-asc": ("created_at", True),
        "name-asc": ("name", True),
        "name-desc": ("name", False),
        "category-asc": ("category", True),
        "category-desc": ("category", False),
    }
    sort = request.GET.get("sort", "created_at-desc")
    if sort not in sort_options:
        sort = "created_at-desc"
    sort_by, sort_ascending = sort_options[sort]
    context: dict[str, Any] = {
        "notice": notice,
        "error": error,
        "query": query,
        "category": category,
        "sort": sort,
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
            try:
                content, content_type, filename = storage_services.download_template_file(
                    request, user, _as_uuid(request.GET["file"])
                )
            except ValueError as error:
                raise Http404("Template file is not available.") from error
            response = HttpResponse(content, content_type=content_type)
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            response["Cache-Control"] = "no-store"
            response["Referrer-Policy"] = "no-referrer"
            return response
        context["templates"] = template_selectors.list_templates(
            user,
            category=category,
            search=query,
            sort_by=sort_by,
            ascending=sort_ascending,
            limit=100,
        )
        if "focus" in request.GET:
            focused_id = _record_uuid_or_404(request.GET.get("focus", ""))
            focused_template = template_selectors.get_template(user, focused_id)
            if focused_template is None:
                raise Http404
            if all(item.get("id") != focused_id for item in context["templates"]):
                context["templates"].append(focused_template)
            context["focused_template_id"] = focused_id
        for template in context["templates"]:
            for review in template.get("reviews", []):
                review["can_edit"] = review.get("reviewer_id") == user.id
                review["rating_options"] = (1, 2, 3, 4, 5)
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
        category_labels = {
            "healthcare": "Healthcare",
            "fieldwork": "Field Work",
            "hr": "Human Resources",
            "legal": "Legal",
            "education": "Education",
            "realestate": "Real Estate",
        }
        all_templates = template_selectors.list_templates(user, limit=100)
        context["category_choices"] = [
            {"value": "all", "label": "All Templates", "count": len(all_templates)},
            *[
                {
                    "value": item,
                    "label": category_labels[item],
                    "count": sum(template.get("category") == item for template in all_templates),
                }
                for item in context["categories"]
            ],
        ]
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
    edit_event = None
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
    elif request.GET.get("edit"):
        try:
            edit_event = schedule_selectors.get_event(user, _as_uuid(request.GET.get("edit", "")))
            if edit_event is None:
                error = "This schedule is not available to your account."
        except ValueError:
            error = "Choose a valid schedule to edit."

    requested_view = request.GET.get("view", "month")
    view = requested_view if requested_view in {"month", "week"} else "month"
    search_query = request.GET.get("q", "").strip()[:120]
    type_filter = request.GET.get("type", "all")
    if type_filter not in {"all", *_EVENT_TYPE_LABELS}:
        type_filter = "all"
    today = timezone.now().date()
    frozen_browser_now = request.headers.get("X-P7-Frozen-Now", "")
    if getattr(settings, "P7_BROWSER_MODE", False) and frozen_browser_now:
        try:
            parsed_browser_now = datetime.fromisoformat(frozen_browser_now.replace("Z", "+00:00"))
        except ValueError:
            parsed_browser_now = None
        if parsed_browser_now is not None and parsed_browser_now.tzinfo is not None:
            today = parsed_browser_now.astimezone(UTC).date()
    raw_selected_date = request.GET.get("date", "")
    try:
        selected_date = date.fromisoformat(raw_selected_date) if raw_selected_date else today
    except ValueError:
        selected_date = today
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
        week_start = selected_date - timedelta(days=(selected_date.weekday() + 1) % 7)
        calendar_days = [[week_start + timedelta(days=offset) for offset in range(7)]]
        first_day = week_start
        last_day = week_start + timedelta(days=6)
        previous_target = (week_start - timedelta(days=7)).isoformat()
        next_target = (week_start + timedelta(days=7)).isoformat()
        today_target = today.isoformat()
    else:
        week_start = None
        calendar_days = Calendar(firstweekday=6).monthdatescalendar(
            month_start.year, month_start.month
        )
        first_day = min(day for week in calendar_days for day in week)
        last_day = max(day for week in calendar_days for day in week)
        previous_target = previous_month.strftime("%Y-%m")
        next_target = next_month.strftime("%Y-%m")
        today_target = today.strftime("%Y-%m")
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
        "weekdays": ("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"),
        "view": view,
        "search_query": search_query,
        "type_filter": type_filter,
        "calendar_has_events": False,
        "templates": [],
        "edit_event": edit_event,
        "upcoming_events": [],
        "stats": {"total": 0, "completed": 0, "upcoming": 0, "highPriority": 0},
        "event_types": (
            ("form_review", "Form review"),
            ("team_meeting", "Team meeting"),
            ("training", "Training"),
            ("maintenance", "Maintenance"),
            ("other", "Other"),
        ),
    }
    try:
        events = schedule_selectors.list_events(user, start_date=first_day, end_date=last_day)
        context["templates"] = template_selectors.list_templates(user, limit=100)
        context["upcoming_events"] = _filter_schedule_events(
            _label_schedule_events(schedule_selectors.upcoming_events(user, limit=5)),
            search_query,
            type_filter,
        )
        context["stats"] = schedule_selectors.event_stats(user)
        events = _filter_schedule_events(_label_schedule_events(events), search_query, type_filter)
        context["calendar_has_events"] = bool(events)
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
                    exported_at = timezone.now()
                    return _json_download(
                        f"events_export_{exported_at.date().isoformat()}.json",
                        {
                            "exported_at": exported_at.isoformat().replace("+00:00", "Z"),
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
        context["event_stats"] = schedule_selectors.manage_event_stats(user)
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
        context["events"] = _label_schedule_events(rows)
    except (DatabaseError, ValueError):
        context["events"] = []
        context["event_stats"] = {
            "total": 0,
            "scheduled": 0,
            "completed": 0,
            "cancelled": 0,
            "high_priority": 0,
        }
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
            "settings_days": (
                ("monday", "Monday"),
                ("tuesday", "Tuesday"),
                ("wednesday", "Wednesday"),
                ("thursday", "Thursday"),
                ("friday", "Friday"),
                ("saturday", "Saturday"),
                ("sunday", "Sunday"),
            ),
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
    submission_key: UUID | None = None
    invalid_submission_key = False
    if request.method == "POST":
        try:
            template_id = _as_uuid(request.POST.get("template_id", ""))
            action = request.POST.get("action", "")
            if action != "select":
                try:
                    submission_key = _as_uuid(request.POST.get("submission_key", ""))
                except ValueError:
                    invalid_submission_key = True
                    submission_key = uuid4()
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
                    submission_key = uuid4()
                    conversation = [
                        {
                            "type": "assistant",
                            "content": (
                                f'Hi! Let\'s fill out "{template["name"]}" together. '
                                "Tell me what you would like to add in your own words. I will "
                                "ask a quick follow-up if I need another detail, and you can "
                                "review the draft before saving."
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
    if (
        action == "extract"
        and not settings.USE_MOCK_AI
        and not has_cloud_ai_consent(request, allow_form_field=True)
    ):
        error = "Review and accept cloud AI processing before sending this conversation."
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
                rejected_fields: list[dict[str, Any]] = []
                if isinstance(extracted, dict):
                    form_data, rejected_fields = voice_services.apply_validated_extraction(
                        extracted, fields, current
                    )
                response_text = result.get("response", "")
                if rejected_fields:
                    response_text = voice_services.validation_question(rejected_fields[0])
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
                elif invalid_submission_key:
                    error = "This form session is invalid. Reopen the form before saving."
                    form_data = values
                else:
                    form_data = values
                    assert submission_key is not None
                    saved = filled_services.save_filled(
                        user,
                        values,
                        template_id=template_id,
                        submission_key=submission_key,
                    )
                    return redirect(f"/filledtemplates?record={saved['id']}")
            elif action == "select":
                return redirect(f"/AIVoiceAutoFill?template={template_id}")
            elif action == "return":
                conversation = _conversation_values(request.POST.get("conversation_json", "[]"))
                form_data = _json_object(request.POST.get("form_data", "{}"), max_bytes=100_000)
            else:
                return HttpResponseNotAllowed(["GET", "POST"])
        except ai_services.AIProviderError:
            error = (
                "AI extraction is temporarily unavailable. Your form was not changed. Try again."
            )
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
            "submission_key": submission_key or uuid4(),
            "notice": notice,
            "error": error,
            "max_audio_bytes": settings.P3_MAX_AUDIO_BYTES,
            "cloud_ai_consent_policy_version": CLOUD_AI_CONSENT_POLICY_VERSION,
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
            page = _query_page(request.POST.get("page"))
            if not filled_services.delete_filled(
                user, _as_uuid(request.POST.get("record_id", ""))
            ):
                raise ValueError("This filled form is no longer available to your account.")
            return redirect(f"/filledtemplates?page={page}&notice=deleted")
        except (ValueError, DatabaseError) as exception:
            error = (
                str(exception)
                if isinstance(exception, ValueError)
                else "The filled form could not be deleted."
            )

    if "record" in request.GET and "download" in request.GET:
        return HttpResponse("Choose either a saved-form page or a download.", status=400)
    if "record" in request.GET or "download" in request.GET:
        key = "download" if "download" in request.GET else "record"
        record_id = _record_uuid_or_404(request.GET.get(key, ""))
        try:
            item = filled_selectors.get_filled(user, record_id)
        except (DatabaseError, ValueError):
            return _page(
                request,
                route,
                "application/filled_templates.html",
                {
                    "filled": [],
                    "notice": "",
                    "error": "Filled forms are temporarily unavailable.",
                    "list_unavailable": True,
                    "page": 1,
                },
                status=503,
            )
        if item is None:
            raise Http404
        if key == "download":
            safe_name = re.sub(r"[^A-Za-z0-9_-]+", "-", item["template_name"]).strip("-_")
            safe_name = (safe_name or "saved-form")[:80]
            return _json_download(
                f"{safe_name}-{item['id']}.json",
                {
                    "id": str(item["id"]),
                    "template_id": str(item["template_id"]) if item["template_id"] else None,
                    "template_name": item["template_name"],
                    "created_at": item["created_at"].isoformat(),
                    "form_data": item["form_data"],
                },
            )
        answer_rows = [
            {"key": name, "value": json.dumps(value, ensure_ascii=False, indent=2)}
            for name, value in item["form_data"].items()
        ]
        notice_codes = {"deleted": "The saved form was deleted."}
        detail_notice = notice_codes.get(request.GET.get("notice", ""), "")
        return _page(
            request,
            route,
            "application/filled_template_detail.html",
            {"item": item, "answers": answer_rows, "notice": detail_notice, "error": error},
        )

    notice_codes = {"deleted": "Filled form deleted."}
    notice = notice_codes.get(request.GET.get("notice", ""), "")
    try:
        page = _query_page(request.GET.get("page"))
    except ValueError as exception:
        page = 1
        error = str(exception)
    offset = (page - 1) * 25
    try:
        rows = filled_selectors.list_filled_summaries(user, limit=26, offset=offset)
        has_next = len(rows) > 25
        filled = rows[:25]
        list_unavailable = False
    except (DatabaseError, ValueError):
        filled = []
        has_next = False
        list_unavailable = True
        error = error or "Filled forms are temporarily unavailable."
    return _page(
        request,
        route,
        "application/filled_templates.html",
        {
            "filled": filled,
            "notice": notice,
            "error": error,
            "list_unavailable": list_unavailable,
            "page": page,
            "previous_page": page - 1 if page > 1 else None,
            "next_page": page + 1 if has_next else None,
        },
        status=400 if error == "Choose a valid page." else 200,
    )


def _activity_filters(source: Any) -> dict[str, Any]:
    search = str(source.get("q", "")).strip()
    category = str(source.get("type", "all"))
    date_range = str(source.get("range", "all"))
    page = _query_page(source.get("page"))
    if len(search) > 120:
        raise ValueError("Activity search must be at most 120 characters.")
    if category not in {"all", *CATEGORY_TYPES}:
        raise ValueError("Choose a supported activity category.")
    if date_range not in {"all", "today", "week", "month"}:
        raise ValueError("Choose a supported activity date range.")
    return {"search": search, "category": category, "range": date_range, "page": page}


def _activity_query(filters: dict[str, Any], *, notice: str = "") -> str:
    values = {
        "q": filters["search"],
        "type": filters["category"],
        "range": filters["range"],
        "page": str(filters["page"]),
    }
    if notice:
        values["notice"] = notice
    return "/activitylog?" + urlencode(values)


@require_http_methods(["GET", "POST"])
def activity_log(request: HttpRequest) -> HttpResponse:
    route = "/activitylog"
    user, denial = _guard(request, route)
    if denial is not None:
        return denial
    assert user is not None

    if request.method == "POST":
        if request.POST.get("action") != "remove":
            return HttpResponseNotAllowed(["GET", "POST"])
        try:
            filters = _activity_filters(request.POST)
            removed = activity_services.remove_activity_event(
                user, _as_uuid(request.POST.get("event_id", ""))
            )
            return redirect(_activity_query(filters, notice="removed" if removed else "missing"))
        except ValueError:
            return HttpResponse("Choose a valid activity entry and filters.", status=400)
        except DatabaseError:
            filters = {"search": "", "category": "all", "range": "all", "page": 1}
            try:
                events, total = activity_selectors.list_activity(user)
            except DatabaseError:
                events, total = [], 0
            return _page(
                request,
                route,
                "application/activity_log.html",
                {
                    "events": events,
                    "total": total,
                    "filters": filters,
                    "error": "Activity could not be updated. Please try again.",
                    "category_choices": _activity_category_choices(),
                    "range_choices": _activity_range_choices(),
                    "page": 1,
                    "refresh_url": "/activitylog",
                },
                status=503,
            )

    notice_codes = {
        "removed": "Activity entry removed. The saved form or other record is unchanged.",
        "missing": "That activity entry is no longer available.",
    }
    notice = notice_codes.get(request.GET.get("notice", ""), "")
    error = ""
    status_code = 200
    try:
        filters = _activity_filters(request.GET)
    except ValueError as exception:
        filters = {"search": "", "category": "all", "range": "all", "page": 1}
        events, total = [], 0
        error = str(exception)
        status_code = 400
    else:
        try:
            events, total = activity_selectors.list_activity(
                user,
                search=filters["search"],
                category=filters["category"],
                date_range=filters["range"],
                limit=26,
                offset=(filters["page"] - 1) * 25,
            )
        except (DatabaseError, ValueError):
            events, total = [], 0
            error = "Activity is temporarily unavailable. Please refresh in a moment."
            status_code = 503

    has_next = len(events) > 25
    events = events[:25]
    refresh_url = _activity_query(filters)
    previous_url = (
        _activity_query({**filters, "page": filters["page"] - 1})
        if filters["page"] > 1
        else ""
    )
    next_url = (
        _activity_query({**filters, "page": filters["page"] + 1}) if has_next else ""
    )
    return _page(
        request,
        route,
        "application/activity_log.html",
        {
            "events": events,
            "total": total,
            "filters": filters,
            "notice": notice,
            "error": error,
            "category_choices": _activity_category_choices(),
            "range_choices": _activity_range_choices(),
            "page": filters["page"],
            "previous_page": filters["page"] - 1 if filters["page"] > 1 else None,
            "next_page": filters["page"] + 1 if has_next else None,
            "previous_url": previous_url,
            "next_url": next_url,
            "refresh_url": refresh_url,
            "timezone_label": "UTC",
        },
        status=status_code,
    )


def _activity_category_choices() -> list[dict[str, str]]:
    return [
        {"value": "all", "label": "All activity"},
        {"value": "forms", "label": "Forms"},
        {"value": "templates", "label": "Templates"},
        {"value": "sharing", "label": "Sharing"},
        {"value": "reviews", "label": "Reviews"},
        {"value": "schedules", "label": "Schedules"},
    ]


def _activity_range_choices() -> list[dict[str, str]]:
    return [
        {"value": "all", "label": "All time"},
        {"value": "today", "label": "Today (UTC)"},
        {"value": "week", "label": "Last 7 days"},
        {"value": "month", "label": "Last 30 days"},
    ]


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
