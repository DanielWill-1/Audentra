"""Transaction-scoped access to Supabase tables using the verified Auth principal."""

from __future__ import annotations

import json
import re
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any
from uuid import UUID

from django.conf import settings
from django.db import connections, transaction

from apps.accounts.principals import SupabaseUser

SUPABASE_ALIAS = "supabase"
_active_user: ContextVar[UUID | None] = ContextVar("supabase_rls_user", default=None)
_fixed_metadata_sql: ContextVar[str | None] = ContextVar("supabase_metadata_sql", default=None)
_guard_manager: Any = None


class RlsContextError(RuntimeError):
    """Raised when Supabase data access has no verified, scoped identity."""


def _transaction_control(sql: str) -> bool:
    statement = sql.strip().rstrip(";").upper()
    return bool(
        statement in {"BEGIN", "COMMIT", "ROLLBACK"}
        or re.fullmatch(
            r"(?:SAVEPOINT|RELEASE SAVEPOINT|ROLLBACK TO SAVEPOINT) [A-Z0-9_\"]+", statement
        )
        or statement.startswith("SET TRANSACTION ")
    )


def _query_guard(
    execute: Callable[..., Any], sql: str, params: Any, many: bool, context: dict[str, Any]
) -> Any:
    connection = context["connection"]
    if connection.alias == SUPABASE_ALIAS:
        if (
            _active_user.get() is None
            and sql != _fixed_metadata_sql.get()
            and not _transaction_control(sql)
        ):
            raise RlsContextError("Supabase query requires a verified RLS context.")
    return execute(sql, params, many, context)


def install_query_guard() -> None:
    """Install the process-lifetime Django cursor guard for the PostgreSQL data alias."""
    global _guard_manager
    if _guard_manager is not None:
        return
    config = settings.DATABASES.get(SUPABASE_ALIAS, {})
    if config.get("ENGINE") != "django.db.backends.postgresql":
        return
    _guard_manager = connections[SUPABASE_ALIAS].execute_wrapper(_query_guard)
    _guard_manager.__enter__()


def require_rls_context(*, using: str = SUPABASE_ALIAS) -> UUID:
    if using != SUPABASE_ALIAS:
        raise RlsContextError("RLS-scoped application queries must use the Supabase alias.")
    user_id = _active_user.get()
    if user_id is None:
        raise RlsContextError("Supabase query requires a verified RLS context.")
    return user_id


@contextmanager
def rls_context(user: SupabaseUser, *, using: str = SUPABASE_ALIAS) -> Iterator[None]:
    """Run scoped ORM/raw queries in one transaction and on one connection."""
    if using != SUPABASE_ALIAS:
        raise RlsContextError("RLS contexts are supported only on the Supabase alias.")
    if not isinstance(user, SupabaseUser) or not user.is_authenticated or not user.is_verified:
        raise RlsContextError("A server-verified Supabase user is required.")

    current = _active_user.get()
    if current is not None and current != user.id:
        raise RlsContextError("Cannot switch users inside an active RLS transaction.")

    token = None if current is not None else _active_user.set(user.id)
    try:
        with transaction.atomic(using=using):
            if current is None:
                connection = connections[using]
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT set_config('request.jwt.claim.sub', %s, true)", [str(user.id)]
                    )
                    cursor.execute(
                        "SELECT set_config('request.jwt.claims', %s, true)",
                        [json.dumps({"sub": str(user.id), "role": "authenticated"})],
                    )
                    cursor.execute("SET LOCAL ROLE authenticated")
                    cursor.execute("SET LOCAL search_path = public, auth")
            yield
    finally:
        if token is not None:
            _active_user.reset(token)


@contextmanager
def _allow_fixed_metadata_query(sql: str) -> Iterator[None]:
    """Allow one exact, fixed catalog query used only by the database health check."""
    token = _fixed_metadata_sql.set(sql)
    try:
        yield
    finally:
        _fixed_metadata_sql.reset(token)
