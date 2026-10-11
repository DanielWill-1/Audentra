"""Exercise real P7 template and schedule routes with temporary development accounts.

The route flow creates three fresh Auth accounts, one hidden template, share
rows, and one schedule. It verifies role boundaries, schedule persistence,
JSON export content, and exact deletion through Django views backed by the
restricted django_data pooler role. It removes only generated fixtures.
"""

# ruff: noqa: E402 -- Django must be bootstrapped before application imports.

from __future__ import annotations

import json
import os
import re
import secrets
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID

PROJECT = Path(__file__).resolve().parents[1]
REPOSITORY = PROJECT.parents[1]
sys.path.insert(0, str(PROJECT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

import django

django.setup()

import httpx
from apps.accounts.services.tokens import AUTH_SESSION_KEY, _principal
from apps.scheduler.selectors import get_event, search_events
from apps.scheduler.services import delete_event
from apps.templates_app.selectors import list_templates
from apps.templates_app.services import delete_template, remove_share
from django.conf import settings
from django.contrib.sessions.models import Session
from django.db import connections
from django.test import Client
from django.test.utils import setup_test_environment
from supabase import create_client
from supabase.lib.client_options import SyncClientOptions

setup_test_environment()


def _assert_development_target() -> None:
    database = settings.DATABASES["supabase"]
    host = str(database.get("HOST", "")).casefold()
    user = str(database.get("USER", ""))
    supabase_host = (urlsplit(settings.SUPABASE_URL).hostname or "").casefold()
    project_ref = supabase_host.split(".", 1)[0]
    if (
        not project_ref
        or not host.endswith(".pooler.supabase.com")
        or str(database.get("PORT")) != "6543"
        or not user.startswith("django_data.")
        or user.rsplit(".", 1)[-1] != project_ref
    ):
        raise RuntimeError("P7 hosted route check requires the project-scoped shared pooler role")
    if not os.getenv("SUPABASE_TEST_ADMIN_KEY", "").startswith("sb_secret_"):
        raise RuntimeError("P7 exact-fixture cleanup credential is unavailable")


def _session_key(client: Client) -> str | None:
    cookie = client.cookies.get(settings.SESSION_COOKIE_NAME)
    return cookie.value if cookie and cookie.value else None


def _post(client: Client, path: str, values: dict[str, str]) -> object:
    csrf_cookie = client.cookies.get(settings.CSRF_COOKIE_NAME)
    if csrf_cookie is None:
        raise AssertionError("CSRF cookie was not set by the local page")
    return client.post(path, values, HTTP_X_CSRFTOKEN=csrf_cookie.value)


def _new_account(label: str, nonce: str) -> tuple[Client, dict[str, object], str]:
    client = Client(enforce_csrf_checks=True, HTTP_HOST="127.0.0.1:8000")
    response = client.get("/signup/")
    if response.status_code != 200:
        raise AssertionError("Local signup page did not load")
    email = f"p7-{nonce}-{label}@example.com"
    password = secrets.token_urlsafe(24)
    response = _post(
        client,
        "/signup/",
        {
            "first_name": "P7",
            "last_name": label.title(),
            "email": email,
            "password": password,
            "confirm_password": password,
        },
    )
    if response.status_code != 302 or AUTH_SESSION_KEY not in client.session:
        raise AssertionError("Fresh development signup did not create a verified session")
    account = dict(client.session[AUTH_SESSION_KEY])
    return client, account, email


def _share_id(response: object) -> UUID:
    content = getattr(response, "content", b"")
    match = re.search(rb'name="share_id" value="([0-9a-f-]{36})"', content)
    if match is None:
        raise AssertionError("The page did not render the expected share management control")
    return UUID(match.group(1).decode("ascii"))


def _template_id(response: object) -> UUID:
    content = getattr(response, "content", b"")
    match = re.search(rb'name="template_id" value="([0-9a-f-]{36})"', content)
    if match is None:
        raise AssertionError("The owner route did not render its saved template control")
    return UUID(match.group(1).decode("ascii"))


def _sent_share_id(response: object, recipient_id: UUID) -> UUID:
    content = getattr(response, "content", b"")
    recipient = re.escape(str(recipient_id).encode("ascii"))
    match = re.search(
        rb"recipient\s+" + recipient + rb".{0,2000}?name=\"share_id\" value=\"([0-9a-f-]{36})\"",
        content,
        re.DOTALL,
    )
    if match is None:
        raise AssertionError("The sender route did not render the expected recipient share")
    return UUID(match.group(1).decode("ascii"))


def _write_results(results: dict[str, object]) -> None:
    destination = (
        REPOSITORY
        / "docs"
        / "pages"
        / "evidence"
        / "w5"
        / "post-wave-review-20261012"
        / "hosted-route-results.json"
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    _assert_development_target()
    results: dict[str, object] = {
        "run": "P7 W5/W6 protected Django routes against the development shared pooler",
        "route_waves": ["W5", "W6"],
        "source": "Fresh synthetic Auth accounts; django_data RLS context; exact fixture cleanup",
        "status": "running",
        "accounts_created": 0,
        "emails_sent": 0,
        "checks": [],
    }
    checks: list[str] = []
    accounts: list[tuple[Client, dict[str, object], str]] = []
    session_keys: set[str] = set()
    share_records: list[tuple[object, UUID]] = []
    template_id: UUID | None = None
    schedule_id: UUID | None = None
    stage = "preflight"
    cleanup_ok = True
    cleanup_status: dict[str, object] = {}
    nonce = secrets.token_hex(6)
    template_name = f"P7 hosted fixture {nonce}"
    schedule_title = f"P7 hosted schedule fixture {nonce}"
    admin_key = os.getenv("SUPABASE_TEST_ADMIN_KEY", "")

    with httpx.Client(timeout=15) as admin_http:
        admin = create_client(
            settings.SUPABASE_URL,
            admin_key,
            options=SyncClientOptions(
                auto_refresh_token=False,
                persist_session=False,
                httpx_client=admin_http,
            ),
        )
        try:
            with connections["default"].cursor() as cursor:
                cursor.execute("SELECT current_user, current_schema()")
                if cursor.fetchone() != ("django_app", "django"):
                    raise AssertionError("Django session alias is not the restricted django role")

            auth_settings = admin_http.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/settings",
                headers={"apikey": settings.SUPABASE_PUBLISHABLE_KEY},
            )
            if auth_settings.status_code != 200 or not auth_settings.json().get(
                "mailer_autoconfirm"
            ):
                raise AssertionError("Development signup is not in the approved no-email mode")
            checks.append("restricted_app_and_data_database_roles_verified")
            checks.append("development_signup_requires_no_email_delivery")

            stage = "create_accounts"
            for label in ("owner", "editor", "unrelated"):
                account = _new_account(label, nonce)
                accounts.append(account)
                if _session_key(account[0]):
                    session_keys.add(_session_key(account[0]) or "")
            owner_client, owner_session, _ = accounts[0]
            editor_client, editor_session, _ = accounts[1]
            stranger_client, _, _ = accounts[2]
            results["accounts_created"] = len(accounts)
            owner = _principal(
                str(owner_session["subject"]),
                str(owner_session.get("email", "")),
                dict(owner_session.get("user_metadata", {})),
            )
            editor = _principal(
                str(editor_session["subject"]),
                str(editor_session.get("email", "")),
                dict(editor_session.get("user_metadata", {})),
            )
            checks.append("three_fresh_accounts_authenticated_through_django")

            stage = "create_hidden_template"
            name = template_name
            form_data = {
                "fields": [
                    {
                        "id": "fixture_name",
                        "label": "Fixture name",
                        "type": "text",
                        "required": True,
                    }
                ]
            }
            create_response = _post(
                owner_client,
                "/templates",
                {
                    "action": "create",
                    "name": name,
                    "category": "healthcare",
                    "description": "Temporary P7 route test; safe to delete.",
                    "form_data": json.dumps(form_data),
                    "visibility": "hidden",
                },
            )
            if (
                create_response.status_code != 200
                or b"Template created." not in create_response.content
            ):
                raise AssertionError("Protected /templates did not create the hidden fixture")
            template_id = _template_id(create_response)
            owner_templates = owner_client.get("/templates")
            if (
                owner_templates.status_code != 200
                or name.encode() not in owner_templates.content
            ):
                raise AssertionError(
                    "Owner could not read the persisted template through /templates"
                )
            for other_client in (editor_client, stranger_client):
                response = other_client.get("/templates")
                if response.status_code != 200 or name.encode() in response.content:
                    raise AssertionError("An unshared account saw a hidden template")
            checks.append("template_creation_persisted_for_owner_only")

            stage = "viewer_share_and_read"
            response = _post(
                owner_client,
                "/templates",
                {
                    "action": "share",
                    "template_id": str(template_id),
                    "recipient_ids": str(editor.id),
                    "role": "viewer",
                    "message": "Temporary hosted P7 check",
                },
            )
            if response.status_code != 200 or b"Share saved" not in response.content:
                raise AssertionError("Owner could not share through the protected template route")
            viewer_share_id = _share_id(response)
            share_records.append((owner, viewer_share_id))
            viewer_page = editor_client.get("/templates")
            if viewer_page.status_code != 200 or name.encode() not in viewer_page.content:
                raise AssertionError("Viewer could not read the shared hidden template")
            checks.append("viewer_reads_owner_shared_hidden_template")

            stage = "viewer_and_unrelated_denials"
            denied_update = _post(
                editor_client,
                "/templates",
                {
                    "action": "update",
                    "template_id": str(template_id),
                    "name": name,
                    "description": "Viewer must not edit this.",
                    "visibility": "hidden",
                    "form_data": json.dumps(form_data),
                },
            )
            denied_delete = _post(
                stranger_client,
                "/templates",
                {"action": "delete", "template_id": str(template_id)},
            )
            denied_export = stranger_client.get(
                f"/templates?export=template&id={template_id}"
            )
            if (
                denied_update.status_code != 200
                or b"Template saved." in denied_update.content
                or denied_delete.status_code != 200
                or b"Template deleted." in denied_delete.content
                or denied_export.status_code != 404
            ):
                raise AssertionError("Viewer or unrelated account crossed a protected action")
            checks.append("viewer_edit_and_unrelated_delete_export_denied")

            stage = "editor_role_and_persistence"
            owner_page = owner_client.get("/templates")
            if owner_page.status_code != 200:
                raise AssertionError("Owner template list stopped returning HTTP 200")
            editor_share_id = _share_id(owner_page)
            if editor_share_id != viewer_share_id:
                raise AssertionError("Owner route returned a different share row")
            stage = "owner_promote_viewer_to_editor"
            role_response = _post(
                owner_client,
                "/templates",
                {
                    "action": "share-role",
                    "share_id": str(viewer_share_id),
                    "role": "editor",
                },
            )
            if b"Share role updated." not in role_response.content:
                contexts = [
                    context.flatten()
                    for context in (role_response.context or [])
                ]
                results["owner_role_route_diagnostic"] = {
                    "status": role_response.status_code,
                    "resolved_url_name": (
                        role_response.resolver_match.url_name
                        if role_response.resolver_match
                        else None
                    ),
                    "request_method": role_response.wsgi_request.method,
                    "request_action": role_response.wsgi_request.POST.get("action"),
                    "login_redirect": role_response.status_code == 302,
                    "csrf_denied": role_response.status_code == 403,
                    "share_unavailable_message": (
                        b"This share is no longer available to update." in role_response.content
                    ),
                    "generic_action_error": (
                        b"The template action could not be completed." in role_response.content
                    ),
                    "success_notice_in_template_context": any(
                        context.get("notice") == "Share role updated." for context in contexts
                    ),
                    "share_unavailable_in_template_context": any(
                        context.get("error") == "This share is no longer available to update."
                        for context in contexts
                    ),
                    "generic_error_in_template_context": any(
                        context.get("error") == "The template action could not be completed."
                        for context in contexts
                    ),
                }
                raise AssertionError("Owner could not promote the recipient to editor")
            checks.append("owner_promoted_viewer_to_editor_through_route")
            stage = "editor_update"
            editor_save = _post(
                editor_client,
                "/templates",
                {
                    "action": "update",
                    "template_id": str(template_id),
                    "name": name,
                    "description": "Updated by the authorized editor.",
                    "visibility": "hidden",
                    "form_data": json.dumps(form_data),
                },
            )
            if b"Template saved." not in editor_save.content:
                raise AssertionError("Authorized editor could not save template content")
            checks.append("editor_saved_template_content_through_route")
            stage = "editor_owner_readback"
            owner_after_edit = owner_client.get("/templates")
            if b"Updated by the authorized editor." not in owner_after_edit.content:
                raise AssertionError("Editor write did not persist through the protected route")
            checks.append("editor_update_persisted_and_visible_to_owner")

            stage = "admin_share_management_without_content_edit"
            admin_role_response = _post(
                owner_client,
                "/templates",
                {
                    "action": "share-role",
                    "share_id": str(viewer_share_id),
                    "role": "admin",
                },
            )
            if b"Share role updated." not in admin_role_response.content:
                raise AssertionError("Owner could not promote the recipient to share admin")
            admin_edit = _post(
                editor_client,
                "/templates",
                {
                    "action": "update",
                    "template_id": str(template_id),
                    "name": name,
                    "description": "Admin must not edit content.",
                    "visibility": "hidden",
                    "form_data": json.dumps(form_data),
                },
            )
            if b"Template saved." in admin_edit.content:
                raise AssertionError("Share admin unexpectedly edited template content")
            admin_share = _post(
                editor_client,
                "/templates",
                {
                    "action": "share",
                    "template_id": str(template_id),
                    "recipient_ids": str(accounts[2][1]["subject"]),
                    "role": "viewer",
                    "message": "Temporary nested share fixture",
                },
            )
            if b"Share saved" not in admin_share.content:
                raise AssertionError("Share admin could not grant a bounded viewer share")
            stranger_id = UUID(str(accounts[2][1]["subject"]))
            admin_share_id = _sent_share_id(admin_share, stranger_id)
            share_records.append((editor, admin_share_id))
            stranger_received = stranger_client.get("/templates")
            if (
                b"Template saved." in admin_edit.content
                or name.encode() not in stranger_received.content
            ):
                raise AssertionError("Admin share or no-content-edit boundary did not hold")
            checks.append("admin_manages_shares_without_template_edit_rights")

            stage = "admin_revoke_and_owner_revoke"
            admin_revoke = _post(
                editor_client,
                "/templates",
                {"action": "remove-share", "share_id": str(admin_share_id)},
            )
            stranger_after_admin_revoke = stranger_client.get("/templates")
            if b"Share removed." not in admin_revoke.content or name.encode() in (
                stranger_after_admin_revoke.content
            ):
                raise AssertionError("Share admin could not revoke only its generated share")
            owner_revoke = _post(
                owner_client,
                "/templates",
                {"action": "remove-share", "share_id": str(viewer_share_id)},
            )
            editor_after_revoke = editor_client.get("/templates")
            owner_after_revoke = owner_client.get("/templates")
            if (
                b"Share removed." not in owner_revoke.content
                or name.encode() in editor_after_revoke.content
                or name.encode() not in owner_after_revoke.content
            ):
                raise AssertionError("Owner revoke did not remove recipient access cleanly")
            checks.append("admin_and_owner_revocation_restore_expected_visibility")

            stage = "schedule_route_persistence_and_export"
            schedule_create = _post(
                owner_client,
                "/scheduler",
                {
                    "action": "create",
                    "title": schedule_title,
                    "description": "Temporary P7 route verification fixture",
                    "date": date.today().isoformat(),
                    "time": "23:11",
                    "duration": "30",
                    "type": "form_review",
                    "priority": "high",
                    "attendees": "P7 verification",
                    "location": "Local test fixture",
                    "form_id": str(template_id),
                    "reminder_minutes": "0",
                },
            )
            if b"Schedule created." not in schedule_create.content:
                raise AssertionError("Owner could not create a schedule through the Django route")
            matches = search_events(owner, schedule_title)
            if len(matches) != 1 or matches[0]["title"] != schedule_title:
                raise AssertionError("The schedule route did not persist exactly one fixture")
            schedule_id = UUID(str(matches[0]["id"]))
            if matches[0]["created_by"] != owner.id:
                raise AssertionError("The persisted schedule owner differs from the verified user")
            checks.append("schedule_route_create_persisted_owner_scoped_event")

            schedule_list = owner_client.get("/manage-schedules", {"q": schedule_title})
            if (
                schedule_list.status_code != 200
                or schedule_title.encode() not in schedule_list.content
            ):
                raise AssertionError("The management route did not read the persisted schedule")
            checks.append("schedule_management_route_reads_persisted_event")

            schedule_export = _post(
                owner_client,
                "/manage-schedules",
                {"action": "export", "selected_ids": str(schedule_id)},
            )
            if schedule_export.status_code != 200:
                raise AssertionError("The schedule export route did not return a JSON response")
            export_payload = json.loads(schedule_export.content)
            exported_events = export_payload.get("events")
            if (
                not isinstance(exported_events, list)
                or len(exported_events) != 1
                or exported_events[0].get("id") != str(schedule_id)
                or exported_events[0].get("title") != schedule_title
                or exported_events[0].get("created_by") != str(owner.id)
                or exported_events[0].get("date") != date.today().isoformat()
                or exported_events[0].get("status") != "scheduled"
            ):
                raise AssertionError("Schedule JSON export did not contain the persisted fixture")
            checks.append("schedule_export_contains_persisted_event_content")

            schedule_delete = _post(
                owner_client,
                "/scheduler",
                {"action": "delete", "event_id": str(schedule_id)},
            )
            if b"Schedule deleted." not in schedule_delete.content or get_event(owner, schedule_id):
                raise AssertionError("The schedule route did not remove its exact fixture")
            checks.append("schedule_route_delete_removed_exact_fixture")
            results["status"] = "passed"
        except Exception as error:
            results["status"] = "failed"
            results["failed_stage"] = stage
            results["failure_type"] = type(error).__name__
            if isinstance(error, AssertionError):
                results["failed_check"] = str(error)
        finally:
            for client, _, _ in accounts:
                key = _session_key(client)
                if key:
                    session_keys.add(key)
            cleanup_status["generated_shares_removed"] = True
            for actor, share_id in reversed(share_records):
                try:
                    remove_share(actor, share_id)
                except Exception:
                    cleanup_status["generated_shares_removed"] = False
            cleanup_status["generated_template_removed"] = True
            if template_name and accounts:
                try:
                    owner_session = accounts[0][1]
                    owner = _principal(
                        str(owner_session["subject"]),
                        str(owner_session.get("email", "")),
                        dict(owner_session.get("user_metadata", {})),
                    )
                    cleanup_id = template_id
                    if cleanup_id is None:
                        matching = [
                            row["id"]
                            for row in list_templates(owner, search=template_name)
                            if row["name"] == template_name
                        ]
                        if len(matching) > 1:
                            cleanup_status["generated_template_removed"] = False
                        elif matching:
                            cleanup_id = UUID(str(matching[0]))
                    if cleanup_id is not None:
                        delete_template(owner, cleanup_id)
                        still_present = any(
                            row["id"] == cleanup_id
                            for row in list_templates(owner, search=template_name)
                        )
                        cleanup_status["generated_template_removed"] = not still_present
                except Exception:
                    cleanup_status["generated_template_removed"] = False
            cleanup_status["generated_schedules_removed"] = True
            if accounts:
                try:
                    owner_session = accounts[0][1]
                    owner = _principal(
                        str(owner_session["subject"]),
                        str(owner_session.get("email", "")),
                        dict(owner_session.get("user_metadata", {})),
                    )
                    if schedule_id is None:
                        matching_events = search_events(owner, schedule_title)
                        if len(matching_events) > 1:
                            cleanup_status["generated_schedules_removed"] = False
                        elif matching_events:
                            schedule_id = UUID(str(matching_events[0]["id"]))
                    if schedule_id is not None and get_event(owner, schedule_id) is not None:
                        delete_event(owner, schedule_id)
                    if schedule_id is not None:
                        cleanup_status["generated_schedules_removed"] = (
                            get_event(owner, schedule_id) is None
                        )
                except Exception:
                    cleanup_status["generated_schedules_removed"] = False
            deleted_accounts = 0
            for _, session, _ in reversed(accounts):
                try:
                    admin.auth.admin.delete_user(str(session["subject"]))
                    deleted_accounts += 1
                except Exception:
                    cleanup_ok = False
            cleanup_status["generated_accounts_deleted"] = deleted_accounts == len(accounts)
            try:
                Session.objects.filter(session_key__in=session_keys).delete()
                cleanup_status["tracked_sessions_deleted"] = not Session.objects.filter(
                    session_key__in=session_keys
                ).exists()
            except Exception:
                cleanup_status["tracked_sessions_deleted"] = False
            cleanup_ok = cleanup_ok and all(
                value is True for value in cleanup_status.values()
            )
            results["cleanup"] = cleanup_status
            results["cleanup_ok"] = cleanup_ok
            results["checks"] = checks
            results["accounts_created"] = len(accounts)
            _write_results(results)

    print(json.dumps(results), flush=True)
    return 0 if results.get("status") == "passed" and cleanup_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
