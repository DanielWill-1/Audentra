"""Exercise the P5 data services against the configured development project.

The probe creates three fresh accounts, uses synthetic rows and exact private
Storage paths, and deletes only those accounts, sessions, and objects on exit.
The privileged key is used only for test-account/object cleanup.
"""

# ruff: noqa: E402 -- Django must be bootstrapped before model imports.

from __future__ import annotations

import json
import os
import re
import secrets
import sys
from collections.abc import Callable
from datetime import date, time, timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import Any, cast
from uuid import UUID

PROJECT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

import django

django.setup()

import httpx
from apps.accounts.profile_selectors import get_profile
from apps.accounts.profile_services import update_profile
from apps.accounts.services.gotrue import AuthServiceError
from apps.accounts.services.tokens import (
    AUTH_SESSION_KEY,
    access_token_for_verified_request,
    authenticate_session,
)
from apps.db.rls import rls_context
from apps.scheduler.selectors import (
    event_stats,
    events_by_status,
    events_by_type,
    get_event,
    list_events,
    search_events,
    upcoming_events,
)
from apps.scheduler.services import (
    create_event,
    delete_event,
    set_event_status,
    update_event,
)
from apps.storage import services as storage_services
from apps.storage.services import (
    StorageServiceError,
    delete_template_file,
    download_template_file,
    upload_template_file,
)
from apps.templates_app.models import TemplateShare
from apps.templates_app.selectors import (
    get_template,
    list_received_shares,
    list_review_queue,
    list_sent_shares,
    list_template_reviews,
    list_templates,
)
from apps.templates_app.services import (
    create_review,
    create_shares,
    create_template,
    delete_template,
    remove_share,
    request_review,
    set_share_hidden,
    set_share_role,
    set_template_visibility,
    update_review,
    update_template,
)
from apps.voice.filled_services import (
    delete_filled,
    save_filled,
)
from apps.voice.selectors import get_filled, list_filled
from django.conf import settings
from django.contrib.sessions.models import Session
from django.db import DatabaseError, connections
from django.http import HttpRequest
from django.test import Client
from supabase import create_client
from supabase.lib.client_options import SyncClientOptions

REPORT = PROJECT.parents[1] / "docs/data/P5_HOSTED_RESULTS.json"


def _check(checks: list[str], condition: bool, name: str) -> None:
    if not condition:
        raise AssertionError(name)
    checks.append(name)


def _post(client: Client, path: str, values: dict[str, str]) -> Any:
    csrf = client.cookies.get(settings.CSRF_COOKIE_NAME)
    if csrf is None:
        raise AssertionError("CSRF cookie was not initialized")
    return client.post(path, values, HTTP_X_CSRFTOKEN=csrf.value)


def _account(
    label: str,
    *,
    checks: list[str],
    emails: list[str],
    account_ids: list[str],
    session_keys: set[str],
) -> tuple[Client, Any, str, str]:
    email = f"p5-{secrets.token_hex(12)}@example.com"
    password = secrets.token_urlsafe(24)
    emails.append(email)
    client = Client(enforce_csrf_checks=True, HTTP_HOST="127.0.0.1:8000")
    if client.get("/signup/").status_code != 200:
        raise AssertionError("Signup form was not available")
    response = _post(
        client,
        "/signup/",
        {
            "email": email,
            "password": password,
            "confirm_password": password,
            "first_name": f"P5 {label}",
            "last_name": "Synthetic",
        },
    )
    if response.status_code != 302:
        raise AssertionError("Fresh hosted signup did not create a session")
    cookie = client.cookies.get(settings.SESSION_COOKIE_NAME)
    if cookie and cookie.value:
        session_keys.add(cookie.value)
    session = client.session
    auth_data = session.get(AUTH_SESSION_KEY)
    if not isinstance(auth_data, dict) or not isinstance(auth_data.get("subject"), str):
        raise AssertionError("Signup did not persist the canonical server session")
    account_ids.append(auth_data["subject"])
    principal = authenticate_session(cast(HttpRequest, SimpleNamespace(session=session)))
    if principal is None:
        raise AssertionError("Fresh signup session could not be verified")
    _check(checks, principal.email == email, f"{label.lower()}_fresh_signup_session")
    return client, principal, email, password


def _deny(call: Callable[[], Any]) -> bool:
    try:
        result = call()
    except (DatabaseError, StorageServiceError, AuthServiceError, ValueError):
        return True
    return result is None or result is False


def _client_request(client: Client) -> HttpRequest:
    return cast(HttpRequest, SimpleNamespace(session=client.session))


def _id(value: Any) -> UUID:
    return value if isinstance(value, UUID) else UUID(str(value))


def main() -> int:
    checks: list[str] = []
    emails: list[str] = []
    account_ids: list[str] = []
    session_keys: set[str] = set()
    object_paths: list[str] = []
    result: dict[str, Any] = {
        "status": "failed",
        "date": date.today().isoformat(),
        "environment": "linked development Supabase; configured Django data alias",
        "checks": checks,
        "accounts_created": 0,
        "accounts_deleted": 0,
        "storage_objects_removed": 0,
        "emails_sent": 0,
    }
    failed_stage = "preflight"
    exception_type: str | None = None
    cleanup_ok = True
    data_database = settings.DATABASES["supabase"]
    database_host = str(data_database.get("HOST", "")).lower()
    database_port = str(data_database.get("PORT", ""))
    transaction_pooler = (
        database_host.endswith(".pooler.supabase.com") and database_port == "6543"
    )
    result["database_host_mode"] = (
        "shared transaction pooler"
        if transaction_pooler
        else "direct host"
        if ".supabase.co" in database_host
        else "other"
    )
    result["pooler_verified"] = transaction_pooler
    result["environment"] = (
        "linked development Supabase; Django "
        f"{result['database_host_mode']} database URL"
    )
    admin_key = os.getenv("SUPABASE_TEST_ADMIN_KEY", "")
    if not settings.SUPABASE_PUBLISHABLE_KEY.startswith("sb_publishable_"):
        raise SystemExit("Development publishable key is not configured")
    if not admin_key.startswith("sb_secret_"):
        raise SystemExit("Development test cleanup key is not configured")

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
            failed_stage = "hosted_auth_and_profile"
            public_settings = admin_http.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/settings",
                headers={"apikey": settings.SUPABASE_PUBLISHABLE_KEY},
            )
            _check(
                checks,
                public_settings.status_code == 200
                and public_settings.json().get("mailer_autoconfirm") is True,
                "development_signup_confirmation_disabled",
            )

            owner_client, owner, _, owner_password = _account(
                "Owner",
                checks=checks,
                emails=emails,
                account_ids=account_ids,
                session_keys=session_keys,
            )
            owner_profile = get_profile(owner)
            _check(
                checks,
                owner_profile["first_name"] == "P5 Owner"
                and owner_profile["last_name"] == "Synthetic",
                "fresh_signup_idempotently_provisions_profile",
            )
            owner_profile = update_profile(owner, {"company": "P5 Synthetic"})
            _check(
                checks,
                owner_profile["company"] == "P5 Synthetic"
                and get_profile(owner)["company"] == "P5 Synthetic",
                "profile_read_and_update_are_user_scoped",
            )

            failed_stage = "p4_signup_login_logout_regression"
            _check(
                checks,
                owner_client.get("/auth/session/").status_code == 200,
                "protected_page_after_signup",
            )
            _check(checks, _post(owner_client, "/logout/", {}).status_code == 302, "logout")
            _check(
                checks,
                owner_client.get("/auth/session/").status_code == 302,
                "logout_removes_protected_access",
            )
            owner_client.get("/login/")
            _check(
                checks,
                _post(
                    owner_client,
                    "/login/",
                    {"email": owner.email or "", "password": owner_password},
                ).status_code
                == 302,
                "password_login_after_signup_profile_provisioning",
            )
            cookie = owner_client.cookies.get(settings.SESSION_COOKIE_NAME)
            if cookie and cookie.value:
                session_keys.add(cookie.value)
            owner = authenticate_session(_client_request(owner_client))
            if owner is None:
                raise AssertionError("Owner could not establish a fresh login session")

            _check(
                checks,
                connections["default"].settings_dict["USER"] == "django_app"
                and connections["supabase"].settings_dict["USER"] == "django_data",
                "restricted_database_aliases_configured",
            )

            failed_stage = "template_crud_visibility_and_sharing"
            with rls_context(owner):
                with connections["supabase"].cursor() as cursor:
                    cursor.execute(
                        "SELECT current_user, auth.uid() = %s::uuid, "
                        "has_table_privilege(current_user, 'public.templates', 'INSERT')",
                        [str(owner.id)],
                    )
                    role, identity_matches, can_insert = cursor.fetchone()
            _check(
                checks,
                role == "authenticated" and identity_matches is True and can_insert is True,
                "hosted_rls_identity_and_template_insert_grant",
            )

            editor_client, editor, _, _ = _account(
                "Editor",
                checks=checks,
                emails=emails,
                account_ids=account_ids,
                session_keys=session_keys,
            )
            stranger_client, stranger, _, _ = _account(
                "Stranger",
                checks=checks,
                emails=emails,
                account_ids=account_ids,
                session_keys=session_keys,
            )
            result["accounts_created"] = len(account_ids)
            stranger_profile = get_profile(stranger)
            _check(
                checks,
                stranger_profile["first_name"] == "P5 Stranger"
                and stranger_profile["id"] != owner_profile["id"],
                "profiles_are_isolated_between_accounts",
            )
            primary = create_template(
                owner,
                {
                    "name": "P5 Hosted Private File",
                    "category": "education",
                    "description": "Synthetic P5 verification template",
                    "form_data": {"fields": [{"label": "Answer", "type": "text"}]},
                    "visibility": "visible",
                },
            )
            _check(checks, bool(primary.get("id")), "owner_created_primary_template")
            primary_id = _id(primary["id"])
            secondary = create_template(
                owner,
                {
                    "name": "P5 Hosted Review Queue",
                    "category": "legal",
                    "description": "Synthetic review verification template",
                    "form_data": {"fields": []},
                    "visibility": "visible",
                },
            )
            _check(checks, bool(secondary.get("id")), "owner_created_secondary_template")
            secondary_id = _id(secondary["id"])
            owner_list = list_templates(owner, sort_by="name", ascending=True, limit=10)
            _check(
                checks,
                any(row["id"] == primary_id for row in owner_list)
                and any(row["id"] == secondary_id for row in owner_list),
                "template_create_list_sort_and_pagination",
            )
            _check(
                checks,
                any(row["id"] == primary_id for row in list_templates(owner, category="education"))
                and any(
                    row["id"] == primary_id
                    for row in list_templates(owner, search="Hosted Private")
                ),
                "template_category_and_search_filters",
            )
            _check(
                checks,
                get_template(editor, primary_id) is not None
                and get_template(stranger, primary_id) is not None,
                "visible_templates_are_discoverable_to_authenticated_accounts",
            )
            _check(
                checks,
                update_template(editor, primary_id, {"description": "viewer must not edit"})
                is None,
                "viewer_cannot_edit_template_content",
            )
            set_template_visibility(owner, primary_id, "hidden")
            _check(
                checks,
                get_template(editor, primary_id) is None
                and get_template(stranger, primary_id) is None,
                "hidden_template_is_not_discoverable_without_a_share",
            )
            set_template_visibility(owner, primary_id, "visible")
            updated = update_template(owner, primary_id, {"description": "Owner edit verified"})
            _check(
                checks,
                updated is not None and updated["description"] == "Owner edit verified",
                "owner_can_update_template_content",
            )

            failed_stage = "private_storage_upload_download_and_access"
            file_content = b'{"synthetic":true,"phase":"P5"}'
            first_upload = upload_template_file(
                _client_request(owner_client),
                owner,
                primary_id,
                SimpleNamespace(name="p5.json", read=lambda _size: file_content),
            )
            object_paths.append(first_upload["path"])
            _check(
                checks,
                first_upload["cleanup_pending"] is False,
                "private_storage_upload_owner",
            )
            _check(
                checks,
                _deny(
                    lambda: download_template_file(
                        _client_request(editor_client), editor, primary_id
                    )
                ),
                "visible_template_does_not_grant_file_access",
            )
            replacement = b'{"synthetic":true,"phase":"P5 replacement"}'
            second_upload = upload_template_file(
                _client_request(owner_client),
                owner,
                primary_id,
                SimpleNamespace(name="replacement.json", read=lambda _size: replacement),
            )
            if second_upload["cleanup_pending"]:
                raise AssertionError("Old private Storage object cleanup was not completed")
            object_paths.remove(first_upload["path"])
            object_paths.append(second_upload["path"])
            downloaded = download_template_file(_client_request(owner_client), owner, primary_id)
            _check(
                checks,
                downloaded[0] == replacement
                and downloaded[1] == "application/json"
                and downloaded[2] == "template.json",
                "private_storage_download_uses_current_file_and_mime",
            )
            anonymous = create_client(settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY)
            try:
                anonymous.storage.from_(storage_services.BUCKET).download(second_upload["path"])
            except Exception:
                checks.append("anonymous_private_storage_read_denied")
            else:
                raise AssertionError("Anonymous request read a private Storage object")

            failed_stage = "sharing_access_and_escalation"
            owner_share = create_shares(owner, primary_id, [editor.id], "viewer")[0]
            owner_share_id = _id(owner_share["id"])
            _check(
                checks,
                bool(list_received_shares(editor))
                and any(row["id"] == owner_share_id for row in list_sent_shares(owner)),
                "received_and_sent_share_lists_are_account_scoped",
            )
            _check(
                checks,
                download_template_file(_client_request(editor_client), editor, primary_id)[0]
                == replacement,
                "shared_viewer_can_read_private_template_file",
            )
            _check(
                checks,
                _deny(
                    lambda: download_template_file(
                        _client_request(stranger_client), stranger, primary_id
                    )
                ),
                "unrelated_account_cannot_read_shared_private_file",
            )
            set_share_hidden(editor, owner_share_id, True)
            _check(
                checks,
                all(row["id"] != owner_share_id for row in list_received_shares(editor)),
                "recipient_local_share_visibility",
            )
            set_share_hidden(editor, owner_share_id, False)
            _check(
                checks,
                _deny(lambda: set_share_role(editor, owner_share_id, "admin")),
                "recipient_cannot_escalate_share_role",
            )
            _check(
                checks,
                update_template(editor, primary_id, {"description": "viewer must not edit"})
                is None,
                "viewer_share_cannot_edit_template",
            )
            set_share_role(owner, owner_share_id, "editor")
            editor_change = update_template(
                editor, primary_id, {"description": "Editor content update verified"}
            )
            _check(
                checks,
                editor_change is not None
                and editor_change["description"] == "Editor content update verified",
                "editor_can_update_template_content",
            )
            try:
                editor_visibility = set_template_visibility(editor, primary_id, "hidden")
            except DatabaseError:
                editor_visibility = None
            _check(
                checks,
                editor_visibility is None
                and (owner_after_visibility := get_template(owner, primary_id)) is not None
                and owner_after_visibility["visibility"] == "visible",
                "editor_cannot_change_owner_visibility",
            )
            set_share_role(owner, owner_share_id, "admin")
            _check(
                checks,
                update_template(editor, primary_id, {"description": "admin cannot edit"})
                is None,
                "share_admin_cannot_edit_template_content",
            )
            admin_share = create_shares(editor, primary_id, [stranger.id], "viewer")[0]
            admin_share_id = _id(admin_share["id"])
            _check(
                checks,
                get_template(stranger, primary_id) is not None
                and download_template_file(
                    _client_request(stranger_client), stranger, primary_id
                )[0]
                == replacement,
                "admin_can_manage_shares_and_new_viewer_can_read",
            )
            admin_share_removed = remove_share(editor, admin_share_id)
            with rls_context(stranger):
                residual_share = TemplateShare.objects.using("supabase").filter(
                    id=admin_share_id
                ).exists()
                with connections["supabase"].cursor() as cursor:
                    cursor.execute(
                        "SELECT auth.uid(), public.p5_template_access_role(%s)",
                        [primary_id],
                    )
                    storage_actor_id, storage_access_role = cursor.fetchone()
                    cursor.execute(
                        "SELECT count(*), COALESCE(bool_or(owner_id = auth.uid()::text), false) "
                        "FROM storage.objects WHERE bucket_id = %s AND name = %s",
                        [storage_services.BUCKET, second_upload["path"]],
                    )
                    visible_storage_rows, storage_owner_matches = cursor.fetchone()
            revoked_access_denied = _deny(
                lambda: download_template_file(
                    _client_request(stranger_client), stranger, primary_id
                )
            )
            if not admin_share_removed or not revoked_access_denied:
                raise AssertionError(
                    "Share admin revoke failed "
                    f"(share_removed={admin_share_removed}, "
                    f"access_denied={revoked_access_denied}, "
                    f"share_visible_to_recipient={residual_share}, "
                    f"storage_actor_matches={storage_actor_id == stranger.id}, "
                    f"role_after_revoke={storage_access_role}, "
                    f"visible_storage_rows={visible_storage_rows}, "
                    f"storage_owner_matches={storage_owner_matches})"
                )
            _check(checks, True, "share_admin_can_revoke_recipient_access")
            new_owner_share = create_shares(owner, primary_id, [stranger.id], "viewer")[0]
            _check(
                checks,
                remove_share(owner, _id(new_owner_share["id"]))
                and _deny(
                    lambda: download_template_file(
                        _client_request(stranger_client), stranger, primary_id
                    )
                ),
                "template_owner_can_revoke_share",
            )

            failed_stage = "review_author_and_owner_scope"
            review = create_review(
                editor, primary_id, rating=5, comment="Synthetic P5 review"
            )
            review_id = _id(review["id"])
            _check(
                checks,
                any(row["id"] == review_id for row in list_template_reviews(editor, primary_id))
                and any(row["id"] == review_id for row in list_template_reviews(owner, primary_id))
                and not list_template_reviews(stranger, primary_id),
                "review_visible_to_author_and_template_owner_only",
            )
            _check(
                checks,
                any(row["id"] == review_id for row in list_review_queue(editor))
                and any(row["id"] == review_id for row in list_review_queue(owner))
                and not list_review_queue(stranger),
                "review_queue_is_participant_scoped",
            )
            revised_review = update_review(
                editor, review_id, {"rating": 4, "comment": "Author edit verified"}
            )
            _check(
                checks,
                revised_review is not None and revised_review["rating"] == 4,
                "review_author_can_edit_review_content",
            )
            approved_review = update_review(owner, review_id, {"status": "approved"})
            _check(
                checks,
                approved_review is not None and approved_review["status"] == "approved",
                "template_owner_can_moderate_review",
            )
            try:
                editor_status = update_review(editor, review_id, {"status": "rejected"})
            except DatabaseError:
                editor_status = None
            _check(
                checks,
                editor_status is None
                and list_template_reviews(owner, primary_id)[0]["status"] == "approved",
                "review_author_cannot_self_approve_or_change_status",
            )
            queued_review = request_review(stranger, secondary_id)
            queued_review_id = _id(queued_review["id"])
            _check(
                checks,
                queued_review["status"] == "pending"
                and any(row["id"] == queued_review_id for row in list_review_queue(stranger))
                and any(row["id"] == queued_review_id for row in list_review_queue(owner))
                and not any(row["id"] == queued_review_id for row in list_review_queue(editor)),
                "review_request_queue_is_pending_and_participant_scoped",
            )

            failed_stage = "scheduler_crud_search_and_aggregate"
            today = date.today()
            event_completed = create_event(
                owner,
                {
                    "title": "P5 completed event",
                    "description": "Synthetic completion fixture",
                    "date": today,
                    "time": time(9, 0),
                    "type": "form_review",
                    "priority": "medium",
                    "attendees": ["synthetic@example.test"],
                    "location": "P5 test",
                },
            )
            event_upcoming = create_event(
                owner,
                {
                    "title": "P5 high-priority event",
                    "description": "Searchable synthetic fixture",
                    "date": today + timedelta(days=2),
                    "time": time(10, 30),
                    "type": "maintenance",
                    "priority": "high",
                    "location": "P5 lab",
                },
            )
            completed_id = _id(event_completed["id"])
            upcoming_id = _id(event_upcoming["id"])
            set_event_status(owner, completed_id, "completed")
            _check(
                checks,
                len(list_events(owner, start_date=today, end_date=today + timedelta(days=7))) == 2
                and get_event(owner, upcoming_id) is not None
                and any(row["id"] == upcoming_id for row in upcoming_events(owner)),
                "scheduler_create_list_range_detail_and_upcoming",
            )
            _check(
                checks,
                len(events_by_status(owner, "completed")) == 1
                and len(events_by_type(owner, "maintenance")) == 1
                and any(row["id"] == upcoming_id for row in search_events(owner, "P5 lab"))
                and not search_events(owner, "%' OR 1=1 --"),
                "scheduler_status_type_and_parameterized_search",
            )
            event_updated = update_event(owner, upcoming_id, {"location": "P5 updated"})
            stats = event_stats(owner)
            _check(
                checks,
                event_updated is not None
                and event_updated["location"] == "P5 updated"
                and stats == {"total": 2, "completed": 1, "upcoming": 1, "highPriority": 1},
                "scheduler_update_and_aggregate_stats",
            )
            _check(
                checks,
                get_event(editor, upcoming_id) is None
                and update_event(editor, upcoming_id, {"title": "spoof"}) is None
                and not delete_event(editor, upcoming_id),
                "scheduler_rows_are_private_to_event_owner",
            )
            set_event_status(owner, upcoming_id, "cancelled")
            _check(
                checks,
                events_by_status(owner, "cancelled")[0]["id"] == upcoming_id
                and delete_event(owner, completed_id)
                and delete_event(owner, upcoming_id),
                "scheduler_cancel_and_owner_delete",
            )

            failed_stage = "filled_form_record_crud_and_isolation"
            filled = save_filled(
                editor,
                {"answers": {"synthetic": "P5"}},
                template_id=primary_id,
                template_name="ignored when a template is supplied",
            )
            filled_id = _id(filled["id"])
            snapshot = save_filled(
                owner, {"answers": {"standalone": True}}, template_name="P5 snapshot"
            )
            snapshot_id = _id(snapshot["id"])
            _check(
                checks,
                any(row["id"] == filled_id for row in list_filled(editor))
                and get_filled(editor, filled_id) is not None
                and get_filled(owner, filled_id) is None
                and get_filled(stranger, filled_id) is None,
                "filled_record_list_detail_and_owner_isolation",
            )
            _check(
                checks,
                not delete_filled(owner, filled_id)
                and delete_filled(editor, filled_id)
                and get_filled(editor, filled_id) is None
                and delete_filled(owner, snapshot_id),
                "filled_record_owner_delete",
            )

            failed_stage = "storage_and_template_delete_authority"
            callback_called = False

            def forbidden_file_delete(_path: str) -> None:
                nonlocal callback_called
                callback_called = True

            _check(
                checks,
                delete_template(editor, primary_id, delete_file=forbidden_file_delete) is False
                and not callback_called
                and get_template(owner, primary_id) is not None,
                "share_admin_cannot_delete_or_cleanup_owner_template",
            )
            _check(
                checks,
                delete_template_file(_client_request(owner_client), owner, primary_id)
                and (owner_after_file_delete := get_template(owner, primary_id)) is not None
                and owner_after_file_delete["uploaded_file"] is None,
                "owner_can_clear_file_reference_and_delete_private_object",
            )
            object_paths.remove(second_upload["path"])

            secondary_upload = upload_template_file(
                _client_request(owner_client),
                owner,
                secondary_id,
                SimpleNamespace(name="review.csv", read=lambda _size: b"answer\nP5\n"),
            )
            object_paths.append(secondary_upload["path"])
            verified_owner_token = access_token_for_verified_request(
                _client_request(owner_client), owner
            )
            if verified_owner_token is None:
                raise AssertionError("Owner session did not produce a verified Storage token")

            def remove_secondary_file(path: str) -> None:
                if path != secondary_upload["path"]:
                    raise AssertionError("Template deletion requested an unexpected object")
                storage_services._storage_request(
                    verified_owner_token, lambda bucket: bucket.remove([path])
                )
                object_paths.remove(path)

            _check(
                checks,
                delete_template(
                    owner, secondary_id, delete_file=remove_secondary_file
                )
                and get_template(owner, secondary_id) is None,
                "owner_template_delete_cleans_exact_private_storage_object",
            )
            result["status"] = "passed"
        except Exception as error:
            exception_type = type(error).__name__
            result["failed_stage"] = failed_stage
            result["exception_type"] = exception_type
            detail = str(error)
            cause = error.__cause__
            if cause is not None:
                detail = f"{detail} | {type(cause).__name__}: {cause}"
            for sensitive_value in [*emails, *account_ids]:
                detail = detail.replace(sensitive_value, "<synthetic-account>")
            result["failure_detail"] = re.sub(
                r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
                "<uuid>",
                detail,
            )[:700]
        finally:
            result["accounts_created"] = len(account_ids)
            owner_client_obj = locals().get("owner_client")
            owner_obj = locals().get("owner")
            owner_token: str | None = None
            if owner_client_obj is not None and owner_obj is not None:
                try:
                    owner_request = _client_request(owner_client_obj)
                    owner_token = access_token_for_verified_request(owner_request, owner_obj)
                except Exception:
                    owner_token = None
                for path in list(object_paths):
                    removed = False
                    if owner_token:
                        try:
                            def remove_object(bucket: Any, object_path: str = path) -> Any:
                                return bucket.remove([object_path])

                            storage_services._storage_request(owner_token, remove_object)
                            removed = True
                        except Exception:
                            pass
                    if not removed:
                        try:
                            admin.storage.from_(storage_services.BUCKET).remove([path])
                            removed = True
                        except Exception:
                            cleanup_ok = False
                    if removed:
                        result["storage_objects_removed"] += 1

            if emails:
                try:
                    users = admin.auth.admin.list_users(page=1, per_page=1000)
                    for user in users:
                        if user.email in emails and user.id not in account_ids:
                            account_ids.append(user.id)
                except Exception:
                    cleanup_ok = False
            for user_id in account_ids:
                try:
                    admin.auth.admin.delete_user(user_id)
                    result["accounts_deleted"] += 1
                except Exception:
                    cleanup_ok = False
            try:
                if session_keys:
                    Session.objects.using("default").filter(session_key__in=session_keys).delete()
            except Exception:
                cleanup_ok = False
            result["cleanup_ok"] = cleanup_ok
            if not cleanup_ok:
                result["status"] = "failed"
                result["cleanup_failed"] = True
            result["checks"] = checks
            REPORT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
            print(json.dumps(result), flush=True)

    return 0 if result["status"] == "passed" and cleanup_ok else 1


if __name__ == "__main__":
    sys.exit(main())
