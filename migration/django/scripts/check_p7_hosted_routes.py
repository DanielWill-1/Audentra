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
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit
from uuid import UUID

PROJECT = Path(__file__).resolve().parents[1]
REPOSITORY = PROJECT.parents[1]
sys.path.insert(0, str(PROJECT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

import django

django.setup()

import httpx
from apps.accounts.principals import SupabaseUser
from apps.accounts.services.tokens import AUTH_SESSION_KEY, _principal
from apps.db.rls import rls_context
from apps.scheduler.selectors import get_event, search_events
from apps.scheduler.services import delete_event
from apps.storage import services as storage_services
from apps.templates_app.selectors import (
    get_template,
    list_received_shares,
    list_sent_shares,
    list_template_reviews,
    list_templates,
)
from apps.templates_app.services import delete_template, remove_share
from apps.voice.filled_services import delete_filled
from apps.voice.selectors import get_filled, list_filled
from django.conf import settings
from django.contrib.sessions.models import Session
from django.core.files.uploadedfile import SimpleUploadedFile
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
            "accepted_terms": "on",
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


class _TextOccurrencePaths(HTMLParser):
    def __init__(self, text: str) -> None:
        super().__init__(convert_charrefs=True)
        self.text = text
        self.stack: list[tuple[str, dict[str, str | None]]] = []
        self.paths: list[list[dict[str, str | None]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        self.stack.append(
            (
                tag,
                {
                    key: values.get(key)
                    for key in ("id", "class", "role", "data-template-results")
                    if values.get(key) is not None
                },
            )
        )

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        return

    def handle_endtag(self, tag: str) -> None:
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data: str) -> None:
        if self.text in data:
            self.paths.append([{"tag": tag, **attrs} for tag, attrs in self.stack])


def _text_occurrence_paths(response: object, text: str) -> list[list[dict[str, str | None]]]:
    parser = _TextOccurrencePaths(text)
    parser.feed(getattr(response, "content", b"").decode("utf-8", errors="replace"))
    return parser.paths


def _template_context_diagnostic(response: object, template_id: UUID) -> dict[str, list[str]]:
    contexts = [context.flatten() for context in (getattr(response, "context", None) or [])]
    page_context = next(
        (
            context
            for context in reversed(contexts)
            if any(
                key in context
                for key in ("templates", "received_shares", "sent_shares", "review_queue")
            )
        ),
        {},
    )
    result: dict[str, list[str]] = {}
    for key in ("templates", "received_shares", "sent_shares", "review_queue"):
        matches: list[str] = []
        for row in page_context.get(key, []):
            template = row.get("template") if isinstance(row, dict) else None
            candidate_id = row.get("id") if key == "templates" else (template or {}).get("id")
            if candidate_id is not None:
                matches.append(str(candidate_id))
        result[key] = matches
    return result


def _storage_object_exists(user: SupabaseUser, path: str) -> bool:
    with rls_context(user):
        with connections["supabase"].cursor() as cursor:
            cursor.execute(
                "SELECT count(*) FROM storage.objects WHERE bucket_id = %s AND name = %s",
                [storage_services.BUCKET, path],
            )
            row = cursor.fetchone()
    return bool(row and row[0])


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
    evidence_run = os.getenv("P7_EVIDENCE_RUN", "closeout-20261012")
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,47}", evidence_run, re.IGNORECASE):
        raise ValueError("P7_EVIDENCE_RUN must be a short filesystem-safe label.")
    destination = (
        REPOSITORY
        / "docs"
        / "pages"
        / "evidence"
        / "w5"
        / evidence_run
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
    duplicate_template_id: UUID | None = None
    schedule_id: UUID | None = None
    review_ids: set[UUID] = set()
    filled_ids: set[UUID] = set()
    storage_paths: set[str] = set()
    storage_cleaned_paths: set[str] = set()
    stage = "preflight"
    cleanup_ok = True
    cleanup_status: dict[str, object] = {}
    nonce = secrets.token_hex(6)
    template_name = f"P7 hosted fixture {nonce}"
    schedule_title = f"P7 hosted schedule fixture {nonce}"
    filled_marker = f"P7 route fixture {nonce}"
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
            stranger_client, stranger_session, _ = accounts[2]
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
            stranger = _principal(
                str(stranger_session["subject"]),
                str(stranger_session.get("email", "")),
                dict(stranger_session.get("user_metadata", {})),
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
            if owner_templates.status_code != 200 or name.encode() not in owner_templates.content:
                raise AssertionError(
                    "Owner could not read the persisted template through /templates"
                )
            for other_client in (editor_client, stranger_client):
                response = other_client.get("/templates")
                if response.status_code != 200 or name.encode() in response.content:
                    raise AssertionError("An unshared account saw a hidden template")
            checks.append("template_creation_persisted_for_owner_only")

            stage = "private_storage_route_upload_replace_download"
            first_file = b'{"synthetic":"P7 first private file"}'
            first_upload = _post(
                owner_client,
                "/templates",
                {
                    "action": "upload",
                    "template_id": str(template_id),
                    "template_file": SimpleUploadedFile(
                        "first.json", first_file, content_type="application/json"
                    ),
                },
            )
            stored_template = get_template(owner, template_id)
            if stored_template is None or not stored_template.get("uploaded_file"):
                raise AssertionError(
                    "The uploaded file reference was not persisted on its template"
                )
            first_path = str(stored_template["uploaded_file"])
            storage_paths.add(first_path)
            if b"Private template file saved." not in first_upload.content:
                raise AssertionError(
                    "The authenticated template route did not upload a private file"
                )
            if not first_path.startswith(f"templates/{template_id}/"):
                raise AssertionError("The private file path escaped its generated template prefix")
            first_download = owner_client.get("/templates", {"file": str(template_id)})
            if (
                first_download.status_code != 200
                or first_download.content != first_file
                or first_download["Content-Type"] != "application/json"
                or first_download["Cache-Control"] != "no-store"
            ):
                raise AssertionError("Owner route download did not return the uploaded bytes")

            replacement_file = b'{"synthetic":"P7 replacement private file"}'
            replacement_upload = _post(
                owner_client,
                "/templates",
                {
                    "action": "upload",
                    "template_id": str(template_id),
                    "template_file": SimpleUploadedFile(
                        "replacement.json", replacement_file, content_type="application/json"
                    ),
                },
            )
            stored_template = get_template(owner, template_id)
            replacement_path = (
                str(stored_template["uploaded_file"])
                if stored_template is not None and stored_template.get("uploaded_file")
                else ""
            )
            if replacement_path:
                storage_paths.add(replacement_path)
            if (
                b"Private template file saved." not in replacement_upload.content
                or not replacement_path
            ):
                raise AssertionError("The route did not replace the private file reference")
            replacement_download = owner_client.get("/templates", {"file": str(template_id)})
            if (
                replacement_path == first_path
                or replacement_download.status_code != 200
                or replacement_download.content != replacement_file
                or replacement_download["Cache-Control"] != "no-store"
                or _storage_object_exists(owner, first_path)
            ):
                raise AssertionError("Replacement download did not return fresh private bytes")
            storage_cleaned_paths.add(first_path)
            checks.extend(
                [
                    "django_session_route_uploads_private_storage_bytes",
                    "django_route_replacement_serves_current_object_and_no_store_response",
                    "replacement_route_removes_only_the_prior_private_object",
                ]
            )

            stage = "template_duplicate_visibility_search_and_export"
            duplicate_response = _post(
                owner_client,
                "/templates",
                {"action": "duplicate", "template_id": str(template_id)},
            )
            duplicates = [
                row
                for row in list_templates(owner, search=f"{name} copy")
                if row["name"] == f"{name} copy"
            ]
            if b"Template duplicated." not in duplicate_response.content or len(duplicates) != 1:
                raise AssertionError("The route did not persist one exact template duplicate")
            duplicate_template_id = UUID(str(duplicates[0]["id"]))
            if duplicate_template_id == template_id:
                raise AssertionError("Template duplication reused the original identifier")
            duplicate_template = get_template(owner, duplicate_template_id)
            if (
                duplicate_template is None
                or duplicate_template["form_data"] != form_data
                or duplicate_template["visibility"] != "visible"
            ):
                raise AssertionError(
                    "The duplicated template did not preserve content and visibility"
                )
            export_response = owner_client.get(
                "/templates", {"export": "template", "id": str(template_id)}
            )
            export_payload = json.loads(export_response.content)
            if (
                export_response.status_code != 200
                or export_payload.get("name") != name
                or export_payload.get("form_data") != form_data
                or not export_response.get("Content-Disposition", "").endswith(
                    f'{nonce}_template.json"'
                )
            ):
                raise AssertionError("Template export did not return the stored JSON content")
            visible_response = _post(
                owner_client,
                "/templates",
                {"action": "visibility", "template_id": str(template_id), "visibility": "visible"},
            )
            visible_to_other = stranger_client.get("/templates")
            public_file_denial = stranger_client.get(
                "/templates", {"file": str(template_id)}
            )
            hidden_again = _post(
                owner_client,
                "/templates",
                {"action": "visibility", "template_id": str(template_id), "visibility": "hidden"},
            )
            owner_template_after_hide = get_template(owner, template_id)
            stranger_template_after_hide = get_template(stranger, template_id)
            if (
                b"Template visibility updated." not in visible_response.content
                or name.encode() not in visible_to_other.content
                or public_file_denial.status_code != 404
                or b"Template visibility updated." not in hidden_again.content
                or owner_template_after_hide is None
                or owner_template_after_hide.get("visibility") != "hidden"
                or stranger_template_after_hide is not None
            ):
                raise AssertionError(
                    "Template visibility or private file boundary failed "
                    f"(public_list_status={visible_to_other.status_code}, "
                    f"public_file_status={public_file_denial.status_code}, "
                    f"owner_visibility={(owner_template_after_hide or {}).get('visibility')}, "
                    f"stranger_can_read_after_hide={stranger_template_after_hide is not None})"
                )
            checks.extend(
                [
                    "template_duplicate_preserves_form_content",
                    "template_visibility_toggle_changes_shared_listing",
                    "public_template_visibility_does_not_grant_private_file_access",
                    "template_json_export_contains_saved_name_and_fields",
                ]
            )

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
            viewer_file = editor_client.get("/templates", {"file": str(template_id)})
            unrelated_file = stranger_client.get("/templates", {"file": str(template_id)})
            if (
                viewer_file.status_code != 200
                or viewer_file.content != replacement_file
                or unrelated_file.status_code != 404
                or unrelated_file.content == replacement_file
            ):
                raise AssertionError(
                    "Shared file route boundary failed "
                    f"(viewer_status={viewer_file.status_code}, "
                    f"viewer_bytes_match={viewer_file.content == replacement_file}, "
                    f"unrelated_status={unrelated_file.status_code}, "
                    f"unrelated_bytes_match={unrelated_file.content == replacement_file})"
                )
            checks.append("viewer_reads_owner_shared_hidden_template")
            checks.extend(
                [
                    "shared_viewer_reads_private_file_through_django_route",
                    "unrelated_account_cannot_download_private_file_through_django_route",
                ]
            )

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
            denied_export = stranger_client.get(f"/templates?export=template&id={template_id}")
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
                contexts = [context.flatten() for context in (role_response.context or [])]
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

            stage = "review_request_author_edit_and_owner_moderation_routes"
            review_request = _post(
                editor_client,
                "/templates",
                {"action": "request-review", "template_id": str(template_id)},
            )
            pending_reviews = [
                row
                for row in list_template_reviews(editor, template_id)
                if row["reviewer_id"] == editor.id
            ]
            if (
                b"Review request submitted." not in review_request.content
                or len(pending_reviews) != 1
                or pending_reviews[0]["status"] != "pending"
            ):
                raise AssertionError("The review request route did not persist a pending review")
            review_id = UUID(str(pending_reviews[0]["id"]))
            review_ids.add(review_id)
            review_comment = f"Revised review {nonce}"
            edit_review = _post(
                editor_client,
                "/templates",
                {
                    "action": "update-review",
                    "review_id": str(review_id),
                    "rating": "4",
                    "comment": review_comment,
                },
            )
            editor_review_page = editor_client.get("/templates")
            owner_review_page = owner_client.get("/templates")
            stranger_review_page = stranger_client.get("/templates")
            edited_reviews = list_template_reviews(editor, template_id)
            if (
                b"Review updated." not in edit_review.content
                or review_comment.encode() not in editor_review_page.content
                or review_comment.encode() not in owner_review_page.content
                or review_comment.encode() in stranger_review_page.content
                or not any(
                    row["id"] == review_id
                    and row["rating"] == 4
                    and row["comment"] == review_comment
                    for row in edited_reviews
                )
                or b"Save my review" not in editor_review_page.content
                or b"Save my review" in owner_review_page.content
            ):
                raise AssertionError("The review content route or participant visibility failed")
            owner_queue = owner_client.get("/templates")
            if (
                b"Review: " not in owner_queue.content
                or str(review_id).encode() not in owner_queue.content
            ):
                raise AssertionError("The owner review queue omitted its pending review")
            author_decision = _post(
                editor_client,
                "/templates",
                {"action": "moderate-review", "review_id": str(review_id), "status": "approved"},
            )
            if b"Review decision saved." in author_decision.content:
                raise AssertionError("A review author changed their own decision status")
            owner_decision = _post(
                owner_client,
                "/templates",
                {"action": "moderate-review", "review_id": str(review_id), "status": "approved"},
            )
            final_reviews = list_template_reviews(owner, template_id)
            if b"Review decision saved." not in owner_decision.content or not any(
                row["id"] == review_id and row["status"] == "approved" for row in final_reviews
            ):
                raise AssertionError(
                    "The owner did not persist the review decision through the route"
                )
            checks.extend(
                [
                    "review_request_route_persists_pending_item",
                    "review_author_route_edits_own_content_and_owner_can_read_it",
                    "unrelated_account_cannot_read_review_content",
                    "review_author_cannot_moderate_own_status",
                    "template_owner_route_moderates_review_status",
                ]
            )

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
            stranger_context_before_revoke = _template_context_diagnostic(
                stranger_received, template_id
            )
            if (
                b"Template saved." in admin_edit.content
                or str(template_id) not in stranger_context_before_revoke["templates"]
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
            admin_share_still_visible = any(
                row["id"] == admin_share_id for row in list_received_shares(stranger)
            )
            stranger_template_still_visible = get_template(stranger, template_id) is not None
            stranger_context_after_revoke = _template_context_diagnostic(
                stranger_after_admin_revoke, template_id
            )
            hidden_template_in_route_list = str(template_id) in stranger_context_after_revoke[
                "templates"
            ]
            public_duplicate_in_route_list = str(duplicate_template_id) in (
                stranger_context_after_revoke["templates"]
            )
            name_occurrence_paths = _text_occurrence_paths(stranger_after_admin_revoke, name)
            results["admin_revoke_html_diagnostic"] = {
                "hidden_template_in_route_list": hidden_template_in_route_list,
                "public_duplicate_in_route_list": public_duplicate_in_route_list,
                "unique_name_text_remains_outside_template_card": (
                    name.encode() in stranger_after_admin_revoke.content
                    and not hidden_template_in_route_list
                ),
                "name_prefix_belongs_to_public_duplicate": (
                    public_duplicate_in_route_list and not hidden_template_in_route_list
                ),
                "matching_text_element_paths": name_occurrence_paths,
                "route_context_template_ids": stranger_context_after_revoke,
                "fixture_template_ids": {
                    "hidden_shared_template": str(template_id),
                    "public_duplicate": str(duplicate_template_id),
                },
            }
            if (
                b"Share removed." not in admin_revoke.content
                or hidden_template_in_route_list
                or not public_duplicate_in_route_list
            ):
                raise AssertionError(
                    "Share admin revoke did not remove only its generated share "
                    f"(status={admin_revoke.status_code}, "
                    f"removed_feedback={b'Share removed.' in admin_revoke.content}, "
                    f"recipient_share_still_visible={admin_share_still_visible}, "
                    f"recipient_template_still_visible={stranger_template_still_visible}, "
                    f"hidden_template_in_route_list={hidden_template_in_route_list}, "
                    f"public_duplicate_in_route_list={public_duplicate_in_route_list})"
                )
            owner_revoke = _post(
                owner_client,
                "/templates",
                {"action": "remove-share", "share_id": str(viewer_share_id)},
            )
            editor_after_revoke = editor_client.get("/templates")
            owner_after_revoke = owner_client.get("/templates")
            editor_template_ids_after_revoke = _template_context_diagnostic(
                editor_after_revoke, template_id
            )["templates"]
            owner_template_ids_after_revoke = _template_context_diagnostic(
                owner_after_revoke, template_id
            )["templates"]
            if (
                b"Share removed." not in owner_revoke.content
                or str(template_id) in editor_template_ids_after_revoke
                or str(template_id) not in owner_template_ids_after_revoke
            ):
                raise AssertionError("Owner revoke did not remove recipient access cleanly")
            revoked_file = editor_client.get("/templates", {"file": str(template_id)})
            if revoked_file.status_code != 404 or revoked_file.content == replacement_file:
                raise AssertionError("Revoked recipient could still download the private file")
            checks.append("admin_and_owner_revocation_restore_expected_visibility")
            checks.append("revoked_recipient_cannot_download_private_file_through_django_route")

            stage = "revoked_and_unrelated_voice_extract_and_save_denials"
            voice_values = {
                "template_id": str(template_id),
                "conversation_json": json.dumps([]),
                "form_data": json.dumps({}),
                "message": "Temporary access-boundary fixture.",
                "field_fixture_name": filled_marker,
            }
            for actor_client in (editor_client, stranger_client):
                with patch("apps.ai.services.extract") as extract:
                    rejected_extraction = _post(
                        actor_client,
                        "/AIVoiceAutoFill",
                        {**voice_values, "action": "extract"},
                    )
                    rejected_save = _post(
                        actor_client,
                        "/AIVoiceAutoFill",
                        {**voice_values, "action": "save"},
                    )
                extract.assert_not_called()
                for response in (rejected_extraction, rejected_save):
                    if (
                        response.status_code != 200
                        or b"This template is no longer available to your account."
                        not in response.content
                    ):
                        raise AssertionError(
                            "Revoked or unrelated voice access was not rejected before provider use"
                        )
            if any(
                row["form_data"].get("fixture_name") == filled_marker
                for row in list_filled(owner, limit=250)
            ):
                raise AssertionError("A revoked or unrelated voice save persisted a filled record")
            checks.append(
                "revoked_and_unrelated_voice_extract_and_save_denied_before_provider_or_persistence"
            )

            stage = "schedule_route_persistence_and_export"
            utc_today = datetime.now(UTC).date()
            schedule_create = _post(
                owner_client,
                "/scheduler",
                {
                    "action": "create",
                    "title": schedule_title,
                    "description": "Temporary P7 route verification fixture",
                    "date": utc_today.isoformat(),
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
                or exported_events[0].get("date") != utc_today.isoformat()
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

            stage = "filled_form_route_owner_persistence_denial_and_delete"
            save_response = _post(
                owner_client,
                "/AIVoiceAutoFill",
                {
                    "action": "save",
                    "template_id": str(template_id),
                    "conversation_json": json.dumps([]),
                    "field_fixture_name": filled_marker,
                },
            )
            if save_response.status_code != 302 or save_response["Location"] != "/filledtemplates":
                raise AssertionError("The reviewed voice form did not redirect to filled forms")
            matching_filled = [
                row
                for row in list_filled(owner, limit=250)
                if row["template_id"] == template_id
                and row["form_data"].get("fixture_name") == filled_marker
            ]
            if len(matching_filled) != 1:
                raise AssertionError("The voice route did not persist one exact filled-form record")
            filled_id = UUID(str(matching_filled[0]["id"]))
            filled_ids.add(filled_id)
            owner_filled = owner_client.get("/filledtemplates")
            stranger_filled = stranger_client.get("/filledtemplates")
            if (
                owner_filled.status_code != 200
                or filled_marker.encode() not in owner_filled.content
                or filled_marker.encode() in stranger_filled.content
                or get_filled(stranger, filled_id) is not None
            ):
                raise AssertionError("Filled-form route did not preserve owner-only visibility")
            stranger_delete_filled = _post(
                stranger_client,
                "/filledtemplates",
                {"action": "delete", "record_id": str(filled_id)},
            )
            if (
                b"Filled form deleted." in stranger_delete_filled.content
                or get_filled(owner, filled_id) is None
            ):
                raise AssertionError("An unrelated account deleted the filled-form fixture")
            owner_delete_filled = _post(
                owner_client,
                "/filledtemplates",
                {"action": "delete", "record_id": str(filled_id)},
            )
            if b"Filled form deleted." not in owner_delete_filled.content or get_filled(
                owner, filled_id
            ):
                raise AssertionError("Owner route did not delete the exact filled-form fixture")
            checks.extend(
                [
                    "voice_review_save_route_persists_filled_record",
                    "filled_record_list_route_is_owner_scoped",
                    "unrelated_account_cannot_delete_filled_record",
                    "owner_route_deletes_exact_filled_record",
                ]
            )

            stage = "template_route_delete_cleans_private_storage"
            delete_template_response = _post(
                owner_client,
                "/templates",
                {"action": "delete", "template_id": str(template_id)},
            )
            if (
                b"Template deleted." not in delete_template_response.content
                or get_template(owner, template_id) is not None
                or _storage_object_exists(owner, replacement_path)
            ):
                raise AssertionError("Owner template route did not remove the exact private object")
            storage_cleaned_paths.add(replacement_path)
            checks.append("owner_template_delete_route_cleans_template_and_private_object")

            duplicate_delete = _post(
                owner_client,
                "/templates",
                {"action": "delete", "template_id": str(duplicate_template_id)},
            )
            if (
                b"Template deleted." not in duplicate_delete.content
                or get_template(owner, duplicate_template_id) is not None
            ):
                raise AssertionError("Owner route did not delete the generated duplicate")
            checks.append("owner_route_deletes_generated_duplicate")

            results["fixtures"] = {
                "account_ids": [str(account[1]["subject"]) for account in accounts],
                "template_ids": [str(template_id), str(duplicate_template_id)],
                "share_ids": [str(share_id) for _, share_id in share_records],
                "schedule_ids": [str(schedule_id)],
                "review_ids": [str(review_id) for review_id in sorted(review_ids, key=str)],
                "filled_record_ids": [str(record_id) for record_id in sorted(filled_ids, key=str)],
                "storage_object_paths": sorted(storage_paths),
            }
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
                    if any(row["id"] == share_id for row in list_sent_shares(actor)):
                        cleanup_status["generated_shares_removed"] = False
                except Exception:
                    cleanup_status["generated_shares_removed"] = False
            cleanup_status["generated_templates_removed"] = True
            owner: SupabaseUser | None = None
            owner_client: Client | None = None
            cleanup_template_ids: set[UUID] = {
                value for value in (template_id, duplicate_template_id) if value is not None
            }
            if accounts:
                try:
                    owner_session = accounts[0][1]
                    owner = _principal(
                        str(owner_session["subject"]),
                        str(owner_session.get("email", "")),
                        dict(owner_session.get("user_metadata", {})),
                    )
                    owner_client = accounts[0][0]
                    if template_id is None and template_name:
                        matching = [
                            row["id"]
                            for row in list_templates(owner, search=template_name)
                            if row["name"] == template_name
                        ]
                        cleanup_template_ids.update(UUID(str(value)) for value in matching)
                    if duplicate_template_id is None and template_name:
                        matching_duplicates = [
                            row["id"]
                            for row in list_templates(owner, search=f"{template_name} copy")
                            if row["name"] == f"{template_name} copy"
                        ]
                        cleanup_template_ids.update(
                            UUID(str(value)) for value in matching_duplicates
                        )
                    for cleanup_id in cleanup_template_ids:
                        current_template = get_template(owner, cleanup_id)
                        if current_template is not None:
                            cleanup_response = _post(
                                owner_client,
                                "/templates",
                                {"action": "delete", "template_id": str(cleanup_id)},
                            )
                            if b"Template deleted." not in cleanup_response.content:
                                current_template = get_template(owner, cleanup_id)
                                if current_template and current_template.get("uploaded_file"):
                                    storage_services.delete_template_file(
                                        owner_client, owner, cleanup_id
                                    )
                                delete_template(owner, cleanup_id)
                        if get_template(owner, cleanup_id) is not None:
                            cleanup_status["generated_templates_removed"] = False
                except Exception:
                    cleanup_status["generated_templates_removed"] = False
            else:
                cleanup_status["generated_templates_removed"] = False
            cleanup_status["generated_reviews_removed"] = True
            if owner is not None:
                try:
                    cleanup_status["generated_reviews_removed"] = not any(
                        list_template_reviews(owner, cleanup_id)
                        for cleanup_id in cleanup_template_ids
                    )
                except Exception:
                    cleanup_status["generated_reviews_removed"] = False
            cleanup_status["generated_filled_records_removed"] = True
            if owner is not None:
                try:
                    current_filled = list_filled(owner, limit=250)
                    cleanup_filled_ids = set(filled_ids)
                    cleanup_filled_ids.update(
                        UUID(str(row["id"]))
                        for row in current_filled
                        if row.get("form_data", {}).get("fixture_name") == filled_marker
                    )
                    for record_id in cleanup_filled_ids:
                        if get_filled(owner, record_id) is not None:
                            delete_filled(owner, record_id)
                    cleanup_status["generated_filled_records_removed"] = all(
                        get_filled(owner, record_id) is None for record_id in cleanup_filled_ids
                    )
                except Exception:
                    cleanup_status["generated_filled_records_removed"] = False
            cleanup_status["generated_storage_objects_removed"] = True
            if storage_paths - storage_cleaned_paths:
                if owner is None:
                    cleanup_status["generated_storage_objects_removed"] = False
                else:
                    owner_session = accounts[0][1]
                    owner_token = str(owner_session.get("access_token", ""))
                    for object_path in storage_paths - storage_cleaned_paths:
                        removed = False
                        if owner_token:
                            try:
                                storage_services._storage_request(
                                    owner_token,
                                    lambda bucket, path=object_path: bucket.remove([path]),
                                )
                                removed = True
                            except storage_services.StorageServiceError:
                                pass
                        if not removed:
                            try:
                                admin.storage.from_(storage_services.BUCKET).remove([object_path])
                                removed = True
                            except Exception:
                                pass
                        if removed and _storage_object_exists(owner, object_path):
                            removed = False
                        if not removed:
                            cleanup_status["generated_storage_objects_removed"] = False
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
            cleanup_ok = cleanup_ok and all(value is True for value in cleanup_status.values())
            results["cleanup"] = cleanup_status
            results["cleanup_ok"] = cleanup_ok
            results["checks"] = checks
            results["accounts_created"] = len(accounts)
            results["fixtures"] = {
                "account_ids": [str(account[1]["subject"]) for account in accounts],
                "template_ids": [str(value) for value in sorted(cleanup_template_ids, key=str)],
                "share_ids": [str(share_id) for _, share_id in share_records],
                "schedule_ids": [str(schedule_id)] if schedule_id else [],
                "review_ids": [str(review_id) for review_id in sorted(review_ids, key=str)],
                "filled_record_ids": [str(record_id) for record_id in sorted(filled_ids, key=str)],
                "storage_object_paths": sorted(storage_paths),
            }
            _write_results(results)

    print(json.dumps(results), flush=True)
    return 0 if results.get("status") == "passed" and cleanup_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
