from types import SimpleNamespace
from unittest.mock import patch

import pytest
from apps.core.health import DatabaseBoundaryError, inspect_database_alias
from apps.db.router import DjangoStateRouter
from django.conf import settings
from django.test import Client


def test_suite_uses_only_disposable_in_memory_databases() -> None:
    assert set(settings.DATABASES) == {"default", "supabase"}
    for database in settings.DATABASES.values():
        assert database["ENGINE"] == "django.db.backends.sqlite3"
        database_name = str(database["NAME"])
        assert database_name == ":memory:" or (
            database_name.startswith("file:memorydb_") and "mode=memory" in database_name
        )


def test_router_keeps_sessions_on_default_only() -> None:
    router = DjangoStateRouter()
    assert router.allow_migrate("default", "sessions") is True
    assert router.allow_migrate("supabase", "sessions") is False
    assert router.allow_migrate("default", "contenttypes") is False


def test_router_uses_default_for_foundation_models() -> None:
    router = DjangoStateRouter()
    model = SimpleNamespace(_state=SimpleNamespace(db=None))
    assert router.db_for_read(model) == "default"
    assert router.db_for_write(model) == "default"


def test_health_reports_success_only_after_both_aliases_pass() -> None:
    with patch("apps.core.views.inspect_database_alias", return_value={"status": "ok"}) as probe:
        response = Client().get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "checks": {"default": "ok", "supabase": "ok"}}
    assert [call.args[0] for call in probe.call_args_list] == ["default", "supabase"]


def test_health_hides_database_failures() -> None:
    with patch(
        "apps.core.views.inspect_database_alias", side_effect=RuntimeError("private detail")
    ):
        response = Client().get("/healthz")

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
    assert b"private detail" not in response.content


def test_health_accepts_get_only() -> None:
    response = Client().post("/healthz")
    assert response.status_code == 405


def test_migrated_pages_and_auth_mount_without_django_admin() -> None:
    assert Client().get("/").status_code == 200
    assert Client().get("/dashboard").status_code == 302
    assert not any("AuthenticationMiddleware" in item for item in settings.MIDDLEWARE)
    assert "django.contrib.auth" not in settings.INSTALLED_APPS
    assert "django.contrib.admin" not in settings.INSTALLED_APPS


def test_live_probe_rejects_non_postgresql_connections() -> None:
    with patch("apps.core.health.connections", {"default": SimpleNamespace(vendor="sqlite")}):
        with pytest.raises(DatabaseBoundaryError, match="PostgreSQL"):
            inspect_database_alias("default")


def test_health_sets_supabase_search_path_inside_its_transaction() -> None:
    statements: list[str] = []

    class Cursor:
        def __enter__(self) -> "Cursor":
            return self

        def __exit__(self, *_args: object) -> None:
            return None

        def execute(self, statement: str) -> None:
            statements.append(statement)

        def fetchone(self) -> tuple[object, ...]:
            return (
                "django_data",
                "public",
                False,
                False,
                False,
                False,
                False,
                True,
                True,
                False,
                False,
                True,
                False,
                True,
                True,
                False,
                False,
                True,
            )

    database = SimpleNamespace(vendor="postgresql", cursor=Cursor)
    with (
        patch("apps.core.health.connections", {"supabase": database}),
        patch("apps.core.health.transaction.atomic") as atomic,
    ):
        assert inspect_database_alias("supabase") == {"alias": "supabase", "status": "ok"}

    atomic.assert_called_once_with(using="supabase")
    assert statements[0] == "SET LOCAL search_path = public"
    assert statements[1].startswith("\nSELECT current_user,")


def test_unknown_database_alias_is_rejected() -> None:
    with pytest.raises(DatabaseBoundaryError, match="Unknown"):
        inspect_database_alias("other")
