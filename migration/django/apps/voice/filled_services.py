import json
from typing import Any
from uuid import UUID, uuid4

from apps.accounts.principals import SupabaseUser
from apps.db.rls import require_rls_context, rls_context
from apps.templates_app.models import Template
from apps.voice.models import FilledTemplate
from apps.voice.selectors import _filled_data


def save_filled(
    user: SupabaseUser,
    form_data: dict[str, Any],
    *,
    template_id: UUID | None = None,
    template_name: str = "",
) -> dict[str, Any]:
    if not isinstance(form_data, dict) or len(form_data) > 200:
        raise ValueError("Form data must be an object with at most 200 fields.")
    try:
        encoded = json.dumps(form_data, ensure_ascii=False)
    except (TypeError, ValueError) as error:
        raise ValueError("Form data must contain JSON values.") from error
    if len(encoded.encode("utf-8")) > 1_000_000:
        raise ValueError("Form data is too large.")
    if not isinstance(template_name, str) or len(template_name) > 200:
        raise ValueError("Template name must be at most 200 characters.")

    with rls_context(user):
        require_rls_context()
        if template_id is not None:
            template = Template.objects.using("supabase").filter(id=template_id).first()
            if template is None:
                raise ValueError("Template is not available to this account.")
            template_name = template.name
        if not template_name.strip():
            raise ValueError("Template name is required when no template ID is supplied.")
        row = FilledTemplate.objects.using("supabase").create(
            id=uuid4(),
            user_id=user.id,
            template_id=template_id,
            template_name=template_name.strip(),
            form_data=form_data,
        )
        return _filled_data(row)


def delete_filled(user: SupabaseUser, record_id: UUID) -> bool:
    with rls_context(user):
        require_rls_context()
        deleted, _ = FilledTemplate.objects.using("supabase").filter(id=record_id).delete()
        return deleted > 0
