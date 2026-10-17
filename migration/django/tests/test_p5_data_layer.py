from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import date, time
from types import SimpleNamespace
from typing import cast
from uuid import UUID

import pytest
from apps.accounts.models import Profile
from apps.accounts.principals import SupabaseUser
from apps.activity.models import ActivityEvent
from apps.db.pooler import connection_profile
from apps.db.rls import (
    RlsContextError,
    _active_user,
    _allow_fixed_metadata_query,
    _query_guard,
    require_rls_context,
    rls_context,
)
from apps.db.router import DjangoStateRouter
from apps.scheduler.models import ScheduledEvent
from apps.scheduler.services import _clean_event
from apps.storage import services as storage_services
from apps.storage.services import _file_details, _validated_path
from apps.templates_app.models import Template, TemplateReview, TemplateShare
from apps.templates_app.services import _validate_template_values
from apps.voice.models import FilledTemplate
from config.settings.base import _database_from_url
from django.core.files.uploadedfile import SimpleUploadedFile

TEST_USER = UUID("11111111-1111-4111-8111-111111111111")
OTHER_USER = UUID("22222222-2222-4222-8222-222222222222")
PROJECT_REF = "pgtttjmqibxufvwehkyj"


def test_transaction_pooler_settings_disable_session_state_and_prepared_statements() -> None:
    database = _database_from_url(
        f"postgresql://django_data.{PROJECT_REF}:synthetic@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require",
        "public",
    )

    options = cast(dict[str, object], database["OPTIONS"])
    assert options["sslmode"] == "require"
    assert options["prepare_threshold"] is None
    assert "options" not in options


def test_direct_database_settings_keep_schema_search_path() -> None:
    database = _database_from_url(
        "postgresql://django_data:synthetic@db.example.supabase.co:5432/postgres?sslmode=require",
        "public",
    )

    options = cast(dict[str, object], database["OPTIONS"])
    assert options["sslmode"] == "require"
    assert options["options"] == "-c search_path=public"
    assert "prepare_threshold" not in options


def test_shared_transaction_pooler_requires_exact_project_scoped_login() -> None:
    config = {
        "HOST": "aws-0-us-east-1.pooler.supabase.com",
        "PORT": "6543",
        "USER": f"django_data.{PROJECT_REF}",
        "NAME": "postgres",
        "OPTIONS": {"sslmode": "require"},
    }

    assert connection_profile(config, PROJECT_REF) == ("shared transaction pooler", True)
    config["USER"] = "django_data.anotherprojectref"
    assert connection_profile(config, PROJECT_REF) == ("shared transaction pooler", False)


def test_session_and_dedicated_poolers_do_not_satisfy_shared_pooler_gate() -> None:
    session_config = {
        "HOST": "aws-0-us-east-1.pooler.supabase.com",
        "PORT": "5432",
        "USER": f"django_data.{PROJECT_REF}",
    }
    dedicated_config = {
        "HOST": f"db.{PROJECT_REF}.supabase.co",
        "PORT": "6543",
        "USER": "django_data",
    }

    assert connection_profile(session_config, PROJECT_REF) == ("shared session pooler", False)
    assert connection_profile(dedicated_config, PROJECT_REF) == (
        "dedicated transaction pooler",
        False,
    )


def test_unverified_principal_cannot_open_rls_context() -> None:
    principal = SupabaseUser(TEST_USER, "synthetic@example.test", {})
    with pytest.raises(RlsContextError):
        with rls_context(principal):
            pass


def test_context_required_before_supabase_cursor_execution() -> None:
    connection = SimpleNamespace(alias="supabase")
    execute = lambda *args: "executed"  # noqa: E731
    context = {"connection": connection}
    with pytest.raises(RlsContextError):
        _query_guard(execute, "SELECT * FROM public.templates", None, False, context)
    assert _query_guard(execute, "BEGIN", None, False, context) == "executed"


def test_scoped_cursor_and_one_fixed_health_query_are_permitted() -> None:
    connection = SimpleNamespace(alias="supabase")
    execute = lambda *args: "executed"  # noqa: E731
    context = {"connection": connection}
    token = _active_user.set(TEST_USER)
    try:
        assert (
            _query_guard(execute, "SELECT * FROM public.templates", None, False, context)
            == "executed"
        )
    finally:
        _active_user.reset(token)
    with _allow_fixed_metadata_query("SELECT 1"):
        assert _query_guard(execute, "SELECT 1", None, False, context) == "executed"
        with pytest.raises(RlsContextError):
            _query_guard(execute, "SELECT * FROM public.users", None, False, context)


def test_require_context_rejects_wrong_alias_and_missing_context() -> None:
    with pytest.raises(RlsContextError):
        require_rls_context()
    with pytest.raises(RlsContextError):
        require_rls_context(using="default")


def test_unmanaged_model_routing_and_migration_separation() -> None:
    router = DjangoStateRouter()
    for model in (
        Profile,
        Template,
        TemplateShare,
        TemplateReview,
        ScheduledEvent,
        FilledTemplate,
        ActivityEvent,
    ):
        assert model._meta.managed is False
        assert router.db_for_read(model) == "supabase"
        assert router.db_for_write(model) == "supabase"
        assert router.allow_migrate("supabase", model._meta.app_label) is False
    assert TemplateShare._meta.get_field("is_hidden").default is False
    assert router.allow_migrate("default", "sessions") is True
    assert router.allow_migrate("default", "templates_app") is False


def test_template_payload_allowlist_and_json_size() -> None:
    clean = _validate_template_values(
        {"name": "  Intake  ", "category": "healthcare", "form_data": {"fields": []}},
        creating=True,
    )
    assert clean["name"] == "Intake"
    with pytest.raises(ValueError):
        _validate_template_values({"name": "Bad", "category": "invented"}, creating=True)
    with pytest.raises(ValueError):
        _validate_template_values({"created_by": TEST_USER}, creating=True)


def test_scheduler_contract_rejects_spoofed_owner_and_bad_filters() -> None:
    event = _clean_event(
        {"title": "Review", "date": date(2026, 10, 11), "time": time(9, 0)}, creating=True
    )
    assert event["title"] == "Review"
    with pytest.raises(ValueError):
        _clean_event({"created_by": TEST_USER}, creating=False)
    with pytest.raises(ValueError):
        _clean_event(
            {"title": "Bad", "date": date.today(), "time": time(9), "duration": 0}, creating=True
        )


def test_storage_paths_are_template_scoped_and_content_checked() -> None:
    template_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    path = "templates/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf"
    assert _validated_path(path, template_id) == path
    with pytest.raises(ValueError):
        _validated_path("https://example.test/file.pdf", template_id)
    with pytest.raises(ValueError):
        _validated_path(path, TEST_USER)
    upload = SimpleUploadedFile("data.json", b'{"ok": true}')
    assert _file_details(upload) == (b'{"ok": true}', "application/json")
    invalid = SimpleUploadedFile("data.pdf", b"not a pdf")
    with pytest.raises(ValueError):
        _file_details(invalid)


def test_private_download_uses_a_fresh_cdn_cache_key_per_request(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    template_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    path = "templates/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf"
    template = SimpleNamespace(id=template_id, created_by=TEST_USER, uploaded_file=path)
    monkeypatch.setattr(Template, "objects", _TemplateTestManager(template))
    operations: list[tuple[str, object]] = []
    bucket = _StorageTestBucket(operations)
    _patch_storage_context(monkeypatch, operations, bucket)

    first = storage_services.download_template_file(
        SimpleNamespace(), _storage_test_user(), template_id
    )
    second = storage_services.download_template_file(
        SimpleNamespace(), _storage_test_user(), template_id
    )

    assert first == second == (b"synthetic private file", "application/pdf", "template.pdf")
    first_params, second_params = bucket.download_query_params
    assert first_params.keys() == second_params.keys() == {"cacheNonce"}
    assert first_params["cacheNonce"] != second_params["cacheNonce"]


def test_public_template_does_not_grant_private_file_download(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    template_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    path = f"templates/{template_id}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf"
    template = SimpleNamespace(id=template_id, created_by=TEST_USER, uploaded_file=path)
    monkeypatch.setattr(Template, "objects", _TemplateTestManager(template))

    class NoShareQuery:
        def exists(self) -> bool:
            return False

    class NoShareManager:
        def using(self, _alias: str) -> NoShareManager:
            return self

        def filter(self, **_filters: object) -> NoShareQuery:
            return NoShareQuery()

    monkeypatch.setattr(TemplateShare, "objects", NoShareManager())
    operations: list[tuple[str, object]] = []
    _patch_storage_context(monkeypatch, operations, _StorageTestBucket(operations))
    stranger = SupabaseUser(OTHER_USER, "stranger@example.test", {})
    object.__setattr__(stranger, "_verified", True)

    with pytest.raises(ValueError, match="Template file is not available"):
        storage_services.download_template_file(SimpleNamespace(), stranger, template_id)

    assert operations == []


def _storage_test_user() -> SupabaseUser:
    user = SupabaseUser(TEST_USER, "test@example.test", {})
    object.__setattr__(user, "_verified", True)
    return user


class _TemplateTestManager:
    def __init__(self, template: SimpleNamespace) -> None:
        self.template = template

    def using(self, _alias: str) -> _TemplateTestManager:
        return self

    def filter(self, **filters: object) -> _TemplateTestQuery:
        return _TemplateTestQuery(self.template, filters)


class _TemplateTestQuery:
    def __init__(self, template: SimpleNamespace, filters: dict[str, object]) -> None:
        self.template = template
        self.filters = filters

    def _matches(self) -> bool:
        return all(getattr(self.template, key) == value for key, value in self.filters.items())

    def first(self) -> SimpleNamespace | None:
        return self.template if self._matches() else None

    def update(self, **values: object) -> int:
        if not self._matches():
            return 0
        for key, value in values.items():
            setattr(self.template, key, value)
        return 1


class _StorageTestBucket:
    def __init__(self, operations: list[tuple[str, object]], on_upload: object = None) -> None:
        self.operations = operations
        self.on_upload = on_upload
        self.download_query_params: list[dict[str, str]] = []

    def upload(self, path: str, _content: bytes, _options: dict[str, str]) -> None:
        self.operations.append(("upload", path))
        if callable(self.on_upload):
            self.on_upload()

    def remove(self, paths: list[str]) -> None:
        self.operations.append(("remove", paths[0]))

    def download(self, path: str, *, query_params: dict[str, str]) -> bytes:
        self.operations.append(("download", (path, query_params.copy())))
        self.download_query_params.append(query_params.copy())
        return b"synthetic private file"


def _patch_storage_context(
    monkeypatch: pytest.MonkeyPatch,
    operations: list[tuple[str, object]],
    bucket: object,
) -> None:
    @contextmanager
    def fake_context(_user: SupabaseUser) -> Iterator[None]:
        yield None

    @contextmanager
    def fake_bucket(_token: str) -> Iterator[object]:
        yield bucket

    monkeypatch.setattr(storage_services, "rls_context", fake_context)
    monkeypatch.setattr(storage_services, "require_rls_context", lambda: TEST_USER)
    monkeypatch.setattr(
        storage_services,
        "access_token_for_verified_request",
        lambda *_args: "test-token",
    )
    monkeypatch.setattr(storage_services, "_bucket", fake_bucket)


def test_storage_upload_replaces_reference_then_removes_only_old_object(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    template_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    old_path = f"templates/{template_id}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf"
    template = SimpleNamespace(id=template_id, created_by=TEST_USER, uploaded_file=old_path)
    monkeypatch.setattr(Template, "objects", _TemplateTestManager(template))
    operations: list[tuple[str, object]] = []
    _patch_storage_context(monkeypatch, operations, _StorageTestBucket(operations))

    result = storage_services.upload_template_file(
        SimpleNamespace(), _storage_test_user(), template_id, SimpleUploadedFile("new.json", b"{}")
    )

    assert template.uploaded_file == result["path"]
    assert result["cleanup_pending"] is False
    assert operations == [("upload", result["path"]), ("remove", old_path)]


def test_storage_upload_cleans_new_object_when_reference_changes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    template_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    old_path = f"templates/{template_id}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf"
    competing_path = f"templates/{template_id}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.pdf"
    template = SimpleNamespace(id=template_id, created_by=TEST_USER, uploaded_file=old_path)
    monkeypatch.setattr(Template, "objects", _TemplateTestManager(template))
    operations: list[tuple[str, object]] = []
    bucket = _StorageTestBucket(
        operations, lambda: setattr(template, "uploaded_file", competing_path)
    )
    _patch_storage_context(monkeypatch, operations, bucket)

    with pytest.raises(ValueError, match="changed before"):
        storage_services.upload_template_file(
            SimpleNamespace(),
            _storage_test_user(),
            template_id,
            SimpleUploadedFile("new.json", b"{}"),
        )

    uploaded_path = operations[0][1]
    assert operations == [("upload", uploaded_path), ("remove", uploaded_path)]
    assert template.uploaded_file == competing_path


def test_storage_upload_reports_exact_object_if_compensation_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    template_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    old_path = f"templates/{template_id}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf"
    competing_path = f"templates/{template_id}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.pdf"
    template = SimpleNamespace(id=template_id, created_by=TEST_USER, uploaded_file=old_path)
    monkeypatch.setattr(Template, "objects", _TemplateTestManager(template))
    operations: list[tuple[str, object]] = []

    class FailingCleanupBucket(_StorageTestBucket):
        def remove(self, paths: list[str]) -> None:
            self.operations.append(("remove", paths[0]))
            raise OSError("storage unavailable")

    bucket = FailingCleanupBucket(
        operations, lambda: setattr(template, "uploaded_file", competing_path)
    )
    _patch_storage_context(monkeypatch, operations, bucket)

    with pytest.raises(storage_services.StorageServiceError) as captured:
        storage_services.upload_template_file(
            SimpleNamespace(),
            _storage_test_user(),
            template_id,
            SimpleUploadedFile("new.json", b"{}"),
        )

    assert captured.value.cleanup_path == operations[0][1]


def test_storage_delete_clears_reference_before_reporting_cleanup_failure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    template_id = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    path = f"templates/{template_id}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf"
    template = SimpleNamespace(id=template_id, created_by=TEST_USER, uploaded_file=path)
    monkeypatch.setattr(Template, "objects", _TemplateTestManager(template))

    class FailingBucket(_StorageTestBucket):
        def remove(self, paths: list[str]) -> None:
            self.operations.append(("remove", paths[0]))
            raise OSError("storage unavailable")

    operations: list[tuple[str, object]] = []
    _patch_storage_context(monkeypatch, operations, FailingBucket(operations))

    with pytest.raises(
        storage_services.StorageServiceError, match="reference was cleared"
    ) as captured:
        storage_services.delete_template_file(SimpleNamespace(), _storage_test_user(), template_id)

    assert template.uploaded_file is None
    assert captured.value.cleanup_path == path
    assert operations == [("remove", path)]
