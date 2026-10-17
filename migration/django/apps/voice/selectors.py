from typing import Any
from uuid import UUID

from apps.accounts.principals import SupabaseUser
from apps.db.rls import require_rls_context, rls_context
from apps.voice.models import FilledTemplate


def _filled_data(row: FilledTemplate) -> dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "template_id": row.template_id,
        "template_name": row.template_name,
        "form_data": row.form_data,
        "created_at": row.created_at,
    }


def list_filled(user: SupabaseUser, *, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
    if not 1 <= limit <= 250 or offset < 0:
        raise ValueError("Invalid filled-form list options.")
    with rls_context(user):
        require_rls_context()
        rows = list(
            FilledTemplate.objects.using("supabase").order_by("-created_at", "-id")[
                offset : offset + limit
            ]
        )
        return [_filled_data(row) for row in rows]


def list_filled_summaries(
    user: SupabaseUser, *, limit: int = 100, offset: int = 0
) -> list[dict[str, Any]]:
    if not 1 <= limit <= 250 or offset < 0:
        raise ValueError("Invalid filled-form summary options.")
    with rls_context(user):
        require_rls_context()
        return list(
            FilledTemplate.objects.using("supabase")
            .order_by("-created_at", "-id")
            .values("id", "template_name", "created_at")[offset : offset + limit]
        )


def get_filled(user: SupabaseUser, record_id: UUID) -> dict[str, Any] | None:
    with rls_context(user):
        require_rls_context()
        row = FilledTemplate.objects.using("supabase").filter(id=record_id).first()
        return _filled_data(row) if row is not None else None
