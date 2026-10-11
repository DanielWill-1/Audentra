from __future__ import annotations

import json
import re
from datetime import date, time
from unittest.mock import patch
from uuid import UUID

import pytest
from apps.accounts import profile_selectors, profile_services
from apps.accounts.principals import SupabaseUser
from apps.accounts.services.gotrue import AuthServiceError
from apps.accounts.services.tokens import _principal
from apps.ai import services as ai_services
from apps.scheduler import selectors as schedule_selectors
from apps.scheduler import services as schedule_services
from apps.templates_app import selectors as template_selectors
from apps.templates_app import services as template_services
from apps.voice import filled_services
from apps.voice import selectors as filled_selectors
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, override_settings
from django.urls import resolve

USER_ID = UUID("11111111-1111-4111-8111-111111111111")
OTHER_ID = UUID("22222222-2222-4222-8222-222222222222")
TEMPLATE_ID = UUID("33333333-3333-4333-8333-333333333333")
EVENT_ID = UUID("44444444-4444-4444-8444-444444444444")
RECORD_ID = UUID("55555555-5555-4555-8555-555555555555")
SHARE_ID = UUID("66666666-6666-4666-8666-666666666666")
REVIEW_ID = UUID("77777777-7777-4777-8777-777777777777")
VERIFIED_USER = _principal(str(USER_ID), "synthetic@example.invalid", {"first_name": "Demo"})
SAMPLE_TEMPLATE = {
    "id": TEMPLATE_ID,
    "name": "Patient intake",
    "category": "healthcare",
    "description": "Synthetic test template",
    "form_data": {
        "fields": [
            {"id": "patient_name", "label": "Patient name", "type": "text", "required": True},
            {"id": "email", "label": "Email", "type": "email", "required": False},
        ]
    },
    "visibility": "visible",
    "created_by": USER_ID,
    "created_at": "2026-10-11T10:00:00Z",
    "updated_at": "2026-10-11T10:00:00Z",
    "uploaded_file": None,
    "shared_with": [],
    "reviews": [],
}
SAMPLE_EVENT = {
    "id": EVENT_ID,
    "title": "Review form",
    "description": "Review a patient form",
    "date": date(2026, 10, 12),
    "time": time(9, 30),
    "duration": 60,
    "type": "form_review",
    "priority": "high",
    "attendees": ["Demo User"],
    "location": "Room 1",
    "form_id": TEMPLATE_ID,
    "reminder_minutes": 15,
    "status": "scheduled",
    "created_by": USER_ID,
}


@pytest.fixture
def authenticated_client(monkeypatch: pytest.MonkeyPatch) -> Client:
    monkeypatch.setattr(
        "apps.accounts.middleware.authenticate_session", lambda _request: VERIFIED_USER
    )
    return Client(HTTP_HOST="localhost")


def _template_reads(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        template_selectors, "list_templates", lambda *_args, **_kwargs: [SAMPLE_TEMPLATE]
    )
    monkeypatch.setattr(
        template_selectors, "get_template", lambda *_args, **_kwargs: SAMPLE_TEMPLATE
    )
    monkeypatch.setattr(template_selectors, "list_received_shares", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(template_selectors, "list_sent_shares", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(template_selectors, "list_review_queue", lambda *_args, **_kwargs: [])


@pytest.mark.django_db(databases=[])
def test_all_protected_pages_render_for_a_verified_session(
    authenticated_client: Client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _template_reads(monkeypatch)
    monkeypatch.setattr(
        profile_selectors,
        "get_profile",
        lambda _user: {
            "first_name": "Demo",
            "last_name": "User",
            "company": "",
            "industry": "",
        },
    )
    monkeypatch.setattr(schedule_selectors, "upcoming_events", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(
        schedule_selectors,
        "event_stats",
        lambda _user: {
            "total": 0,
            "completed": 0,
            "upcoming": 0,
            "highPriority": 0,
        },
    )
    monkeypatch.setattr(schedule_selectors, "list_events", lambda *_args, **_kwargs: [SAMPLE_EVENT])
    monkeypatch.setattr(
        schedule_selectors, "search_events", lambda *_args, **_kwargs: [SAMPLE_EVENT]
    )
    monkeypatch.setattr(filled_selectors, "list_filled", lambda *_args, **_kwargs: [])

    for route, heading in (
        ("/dashboard", "What would you like to work on?"),
        ("/templates", "Templates"),
        ("/scheduler", "Scheduler"),
        ("/manage-schedules", "Manage schedules"),
        ("/scheduler-settings", "Scheduler settings"),
        ("/AIVoiceAutoFill", "AI voice form"),
        ("/filledtemplates", "Filled templates"),
        ("/activitylog", "Activity log"),
    ):
        response = authenticated_client.get(route)
        assert response.status_code == 200, route
        assert heading.encode() in response.content, route
        assert response.headers["Cache-Control"] == "no-store"
        assert response.headers["Referrer-Policy"] == "no-referrer"
        assert b'id="root"' not in response.content
        assert b"/assets/index-" not in response.content
        assert (resolve(route).url_name or "").startswith("app-")


@pytest.mark.django_db(databases=[])
def test_protected_pages_reject_missing_and_unverified_principals(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client = Client(HTTP_HOST="localhost")
    anonymous = client.get("/templates")
    assert anonymous.status_code == 302
    assert anonymous.headers["Location"] == "/login?next=%2Ftemplates"
    monkeypatch.setattr(
        "apps.accounts.middleware.authenticate_session",
        lambda _request: SupabaseUser(USER_ID, "unverified@example.invalid", {}),
    )
    unverified = client.get("/dashboard")
    assert unverified.status_code == 302
    assert unverified.headers["Location"] == "/login?next=%2Fdashboard"


@pytest.mark.django_db(databases=[])
def test_auth_provider_unavailability_fails_closed_on_protected_routes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "apps.accounts.middleware.authenticate_session",
        lambda _request: (_ for _ in ()).throw(AuthServiceError("synthetic unavailable")),
    )
    response = Client(HTTP_HOST="localhost").get("/dashboard")
    assert response.status_code == 503
    assert b"synthetic" not in response.content
    assert response.headers["Cache-Control"] == "no-store"


@pytest.mark.django_db(databases=[])
def test_profile_post_uses_verified_identity_and_requires_csrf(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "apps.accounts.middleware.authenticate_session", lambda _request: VERIFIED_USER
    )
    monkeypatch.setattr(
        profile_selectors,
        "get_profile",
        lambda _user: {
            "first_name": "Demo",
            "last_name": "User",
            "company": "",
            "industry": "",
        },
    )
    _template_reads(monkeypatch)
    monkeypatch.setattr(schedule_selectors, "upcoming_events", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(
        schedule_selectors,
        "event_stats",
        lambda _user: {
            "total": 0,
            "completed": 0,
            "upcoming": 0,
            "highPriority": 0,
        },
    )
    monkeypatch.setattr(
        profile_services,
        "update_profile",
        lambda user, values: {
            **values,
            "id": user.id,
        },
    )
    client = Client(enforce_csrf_checks=True, HTTP_HOST="localhost")
    page = client.get("/dashboard")
    assert page.status_code == 200
    token_match = re.search(rb'name="csrfmiddlewaretoken" value="([^"]+)"', page.content)
    assert token_match
    update = {
        "action": "save-profile",
        "first_name": "Demo",
        "last_name": "User",
        "company": "Example",
        "industry": "Healthcare",
    }
    assert client.post("/dashboard", update).status_code == 403
    response = client.post(
        "/dashboard",
        update,
        HTTP_X_CSRFTOKEN=token_match.group(1).decode(),
        HTTP_REFERER="http://localhost/dashboard",
    )
    assert response.status_code == 200
    assert b"Profile saved." in response.content


@pytest.mark.django_db(databases=[])
def test_template_builder_action_saves_validated_json_and_export_matches_source_contract(
    authenticated_client: Client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _template_reads(monkeypatch)
    create = patch.object(template_services, "create_template", return_value=SAMPLE_TEMPLATE)
    with create as create_template:
        response = authenticated_client.post(
            "/templates",
            {
                "action": "create",
                "name": "Patient intake",
                "category": "healthcare",
                "description": "Synthetic test template",
                "visibility": "visible",
                "form_data": json.dumps(SAMPLE_TEMPLATE["form_data"]),
            },
        )
    assert response.status_code == 200
    assert b"Template created." in response.content
    create_template.assert_called_once()
    assert create_template.call_args.args[0] is VERIFIED_USER
    assert create_template.call_args.args[1]["form_data"] == SAMPLE_TEMPLATE["form_data"]

    monkeypatch.setattr(template_selectors, "get_template", lambda _user, _id: SAMPLE_TEMPLATE)
    exported = authenticated_client.get(f"/templates?export=template&id={TEMPLATE_ID}")
    assert exported.status_code == 200
    assert exported["Content-Type"].startswith("application/json")
    body = json.loads(exported.content)
    assert set(body) == {
        "name",
        "category",
        "description",
        "form_data",
        "created_at",
        "exported_at",
    }
    assert body["form_data"] == SAMPLE_TEMPLATE["form_data"]
    assert exported["Content-Disposition"] == 'attachment; filename="patient_intake_template.json"'


@pytest.mark.django_db(databases=[])
def test_share_and_review_management_actions_use_their_own_record_ids(
    authenticated_client: Client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _template_reads(monkeypatch)
    with (
        patch.object(
            template_services,
            "set_share_role",
            return_value={"id": SHARE_ID, "role": "editor"},
        ) as set_role,
        patch.object(template_services, "remove_share", return_value=True) as remove_share,
        patch.object(
            template_services,
            "set_share_hidden",
            return_value={"id": SHARE_ID, "is_hidden": True},
        ) as hide_share,
        patch.object(
            template_services,
            "update_review",
            return_value={"id": REVIEW_ID, "status": "approved"},
        ) as update_review,
    ):
        role_response = authenticated_client.post(
            "/templates",
            {"action": "share-role", "share_id": str(SHARE_ID), "role": "editor"},
        )
        revoke_response = authenticated_client.post(
            "/templates",
            {"action": "remove-share", "share_id": str(SHARE_ID)},
        )
        hide_response = authenticated_client.post(
            "/templates",
            {"action": "hide-share", "share_id": str(SHARE_ID), "hidden": "true"},
        )
        review_response = authenticated_client.post(
            "/templates",
            {
                "action": "moderate-review",
                "review_id": str(REVIEW_ID),
                "status": "approved",
            },
        )

    for response, message in (
        (role_response, b"Share role updated."),
        (revoke_response, b"Share removed."),
        (hide_response, b"Received share preference updated."),
        (review_response, b"Review decision saved."),
    ):
        assert response.status_code == 200
        assert message in response.content
    set_role.assert_called_once_with(VERIFIED_USER, SHARE_ID, "editor")
    remove_share.assert_called_once_with(VERIFIED_USER, SHARE_ID)
    hide_share.assert_called_once_with(VERIFIED_USER, SHARE_ID, True)
    update_review.assert_called_once_with(
        VERIFIED_USER, REVIEW_ID, {"status": "approved"}
    )


@pytest.mark.django_db(databases=[])
def test_schedule_filters_and_selected_export_are_principal_scoped(
    authenticated_client: Client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        schedule_selectors,
        "search_events",
        lambda user, _term: [SAMPLE_EVENT] if user.id == USER_ID else [],
    )
    monkeypatch.setattr(
        schedule_selectors,
        "list_events",
        lambda user, **_kwargs: [SAMPLE_EVENT] if user.id == USER_ID else [],
    )
    monkeypatch.setattr(
        schedule_selectors,
        "get_event",
        lambda user, event_id: (
            SAMPLE_EVENT if user.id == USER_ID and event_id == EVENT_ID else None
        ),
    )
    filtered = authenticated_client.get(
        "/manage-schedules?q=review&type=form_review&status=scheduled&sort=priority&order=desc"
    )
    assert filtered.status_code == 200
    assert b"Review form" in filtered.content

    exported = authenticated_client.post(
        "/manage-schedules",
        {"action": "export", "selected_ids": [str(EVENT_ID)]},
    )
    assert exported.status_code == 200
    payload = json.loads(exported.content)
    assert set(payload) == {"exported_at", "events"}
    assert payload["events"][0]["id"] == str(EVENT_ID)
    assert exported["Content-Disposition"].endswith('.json"')

    monkeypatch.setattr(schedule_selectors, "get_event", lambda _user, _id: None)
    with patch.object(schedule_services, "delete_event") as delete_event:
        denied = authenticated_client.post(
            "/manage-schedules",
            {"action": "delete", "selected_ids": [str(EVENT_ID), str(RECORD_ID)]},
        )
    assert denied.status_code == 200
    assert b"selected schedules could not be updated" in denied.content
    delete_event.assert_not_called()


@pytest.mark.django_db(databases=[])
def test_voice_extraction_matches_ids_and_labels_then_saves_only_after_review(
    authenticated_client: Client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _template_reads(monkeypatch)
    monkeypatch.setattr(
        ai_services,
        "extract",
        lambda *_args: {
            "response": "I captured the patient name.",
            "extractedData": {"Patient Name": "Ana Rivera"},
        },
    )
    extracted = authenticated_client.post(
        "/AIVoiceAutoFill",
        {
            "action": "extract",
            "template_id": str(TEMPLATE_ID),
            "conversation_json": "[]",
            "form_data": "{}",
            "message": "The patient is Ana Rivera.",
        },
    )
    assert extracted.status_code == 200
    assert b"Ana Rivera" in extracted.content
    assert b"I captured the patient name." in extracted.content

    with patch.object(filled_services, "save_filled", return_value={"id": RECORD_ID}) as save:
        saved = authenticated_client.post(
            "/AIVoiceAutoFill",
            {
                "action": "save",
                "template_id": str(TEMPLATE_ID),
                "conversation_json": "[]",
                "field_patient_name": "Ana Rivera",
                "field_email": "ana@example.invalid",
            },
        )
    assert saved.status_code == 302
    assert saved.headers["Location"] == "/filledtemplates"
    save.assert_called_once_with(
        VERIFIED_USER,
        {"patient_name": "Ana Rivera", "email": "ana@example.invalid"},
        template_id=TEMPLATE_ID,
    )

    with patch.object(filled_services, "save_filled") as save_missing:
        incomplete = authenticated_client.post(
            "/AIVoiceAutoFill",
            {
                "action": "save",
                "template_id": str(TEMPLATE_ID),
                "conversation_json": "[]",
                "field_patient_name": "",
            },
        )
    assert incomplete.status_code == 200
    assert b"Complete the required fields: Patient name" in incomplete.content
    save_missing.assert_not_called()


@pytest.mark.django_db(databases=[])
def test_filled_forms_are_owner_scoped_and_delete_uses_service(
    authenticated_client: Client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        filled_selectors,
        "list_filled",
        lambda user, **_kwargs: [
            {
                "id": RECORD_ID,
                "user_id": user.id,
                "template_id": TEMPLATE_ID,
                "template_name": "Patient intake",
                "form_data": {"patient_name": "Ana"},
                "created_at": "2026-10-11T10:00:00Z",
            },
        ],
    )
    page = authenticated_client.get("/filledtemplates")
    assert page.status_code == 200
    assert b"Patient intake" in page.content and b"Ana" in page.content
    with patch.object(filled_services, "delete_filled", return_value=True) as delete:
        response = authenticated_client.post(
            "/filledtemplates", {"action": "delete", "record_id": str(RECORD_ID)}
        )
    assert response.status_code == 200
    delete.assert_called_once_with(VERIFIED_USER, RECORD_ID)


@pytest.mark.django_db(databases=[])
def test_voice_form_media_transcription_to_filled_record_flow_is_deterministic(
    authenticated_client: Client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _template_reads(monkeypatch)
    monkeypatch.setattr(
        "apps.api.middleware.authenticate_bearer", lambda _token: VERIFIED_USER
    )
    received_audio: dict[str, object] = {}

    def transcribe(audio: bytes, mime_type: str) -> str:
        received_audio.update(audio=audio, mime_type=mime_type)
        return "The patient name is Ana Rivera."

    monkeypatch.setattr("apps.speech.views.transcribe_audio", transcribe)
    monkeypatch.setattr(
        ai_services,
        "extract",
        lambda *_args: {
            "response": "I found the patient name. Review it before saving.",
            "extractedData": {"Patient name": "Ana Rivera"},
        },
    )

    with override_settings(
        P3_SERVICES_ENABLED=True,
        P3_ALLOWED_ORIGINS=["http://localhost:5173"],
        P3_API_MARKER="fixture-marker",
    ):
        transcription = authenticated_client.post(
            "/api/transcribe",
            {
                "audio": SimpleUploadedFile(
                    "recording.webm", b"synthetic-webm", content_type="audio/webm"
                ),
                "mimeType": "audio/webm;codecs=opus",
            },
            HTTP_HOST="127.0.0.1:8000",
            HTTP_ORIGIN="http://localhost:5173",
            HTTP_X_INTERNAL_API_TOKEN="fixture-marker",
            HTTP_AUTHORIZATION="Bearer fixture-access",
        )
    assert transcription.status_code == 200
    transcript = json.loads(transcription.content)["transcript"]
    assert transcript == "The patient name is Ana Rivera."
    assert received_audio == {
        "audio": b"synthetic-webm",
        "mime_type": "audio/webm;codecs=opus",
    }

    extracted = authenticated_client.post(
        "/AIVoiceAutoFill",
        {
            "action": "extract",
            "template_id": str(TEMPLATE_ID),
            "conversation_json": "[]",
            "form_data": "{}",
            "message": transcript,
        },
    )
    assert extracted.status_code == 200
    assert b"I found the patient name" in extracted.content
    assert b'name="field_patient_name" value="Ana Rivera"' in extracted.content

    filled_row = {
        "id": RECORD_ID,
        "user_id": USER_ID,
        "template_id": TEMPLATE_ID,
        "template_name": "Patient intake",
        "form_data": {"patient_name": "Ana Rivera", "email": ""},
        "created_at": "2026-10-12T10:00:00Z",
    }
    monkeypatch.setattr(filled_selectors, "list_filled", lambda *_args, **_kwargs: [filled_row])
    with patch.object(filled_services, "save_filled", return_value={"id": RECORD_ID}) as save:
        saved = authenticated_client.post(
            "/AIVoiceAutoFill",
            {
                "action": "save",
                "template_id": str(TEMPLATE_ID),
                "conversation_json": json.dumps(
                    [
                        {"type": "user", "content": transcript},
                        {"type": "assistant", "content": "I found the patient name."},
                    ]
                ),
                "field_patient_name": "Ana Rivera",
                "field_email": "",
            },
        )
    assert saved.status_code == 302
    assert saved.headers["Location"] == "/filledtemplates"
    save.assert_called_once_with(
        VERIFIED_USER,
        {"patient_name": "Ana Rivera", "email": ""},
        template_id=TEMPLATE_ID,
    )

    listed = authenticated_client.get("/filledtemplates")
    assert listed.status_code == 200 and b"Ana Rivera" in listed.content
    with patch.object(filled_services, "delete_filled", return_value=True) as delete:
        deleted = authenticated_client.post(
            "/filledtemplates", {"action": "delete", "record_id": str(RECORD_ID)}
        )
    assert deleted.status_code == 200 and b"Filled form deleted." in deleted.content
    delete.assert_called_once_with(VERIFIED_USER, RECORD_ID)


@pytest.mark.django_db(databases=[])
def test_voice_form_denies_another_principal_when_template_is_unreadable(
    authenticated_client: Client,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    other_user = _principal(str(OTHER_ID), "other@example.invalid", {})
    monkeypatch.setattr(
        "apps.accounts.middleware.authenticate_session", lambda _request: other_user
    )
    monkeypatch.setattr(template_selectors, "list_templates", lambda *_args, **_kwargs: [])

    def unreadable(user: SupabaseUser, template_id: UUID) -> None:
        assert user.id == OTHER_ID
        assert template_id == TEMPLATE_ID
        return None

    monkeypatch.setattr(template_selectors, "get_template", unreadable)
    stranger = Client(HTTP_HOST="localhost")
    with patch.object(ai_services, "extract") as extract, patch.object(
        filled_services, "save_filled"
    ) as save:
        denied = stranger.post(
            "/AIVoiceAutoFill",
            {
                "action": "extract",
                "template_id": str(TEMPLATE_ID),
                "conversation_json": "[]",
                "form_data": "{}",
                "message": "The patient name is Ana Rivera.",
            },
        )
    assert denied.status_code == 200
    assert b"This template is no longer available to your account." in denied.content
    extract.assert_not_called()
    save.assert_not_called()


@pytest.mark.django_db(databases=[])
def test_auth_next_can_return_to_protected_pages_but_not_external_destinations() -> None:
    client = Client(HTTP_HOST="localhost")
    safe = client.get("/login?next=%2Ftemplates")
    assert safe.status_code == 200
    assert b'value="/templates"' in safe.content
    external = client.get("/login?next=https%3A%2F%2Fevil.example%2F")
    assert external.status_code == 200
    assert b'value="/auth/session/"' in external.content


@pytest.mark.django_db(databases=[])
def test_route_aliases_accept_slashless_and_trailing_slash_without_redirecting_posts() -> None:
    for route in (
        "/login",
        "/login/",
        "/signup",
        "/signup/",
        "/forgot-password",
        "/forgot-password/",
    ):
        assert resolve(route)
    assert resolve("/scheduler/").url_name == "app-scheduler"
    assert resolve("/scheduler").url_name == "app-scheduler"
    assert resolve("/reset-password/").url_name == "reset-password"
