import json
from typing import Any
from uuid import UUID, uuid4

from django.db import IntegrityError, transaction

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
    submission_key: UUID | None = None,
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

    if submission_key is not None and not isinstance(submission_key, UUID):
        raise ValueError("The form submission key is invalid. Start a new form session.")

    normalized_name = template_name.strip()
    with rls_context(user):
        require_rls_context()
        if submission_key is not None:
            existing = (
                FilledTemplate.objects.using("supabase")
                .filter(user_id=user.id, submission_key=submission_key)
                .first()
            )
            if existing is not None:
                same_template = existing.template_id == template_id
                if template_id is not None and existing.template_id is None:
                    same_template = True
                if template_id is None:
                    same_template = (
                        existing.template_id is None and existing.template_name == normalized_name
                    )
                if same_template and existing.form_data == form_data:
                    return _filled_data(existing)
                raise ValueError(
                    "This form session was already saved with different values. "
                    "Your current entries are still here; start a new form to save them separately."
                )

        if template_id is not None:
            template = Template.objects.using("supabase").filter(id=template_id).first()
            if template is None:
                raise ValueError("Template is not available to this account.")
            template_name = template.name
        if not template_name.strip():
            raise ValueError("Template name is required when no template ID is supplied.")
        try:
            with transaction.atomic(using="supabase"):
                row = FilledTemplate.objects.using("supabase").create(
                    id=uuid4(),
                    user_id=user.id,
                    template_id=template_id,
                    template_name=template_name.strip(),
                    form_data=form_data,
                    submission_key=submission_key,
                )
        except IntegrityError as conflict:
            if submission_key is None:
                raise
            existing = (
                FilledTemplate.objects.using("supabase")
                .filter(user_id=user.id, submission_key=submission_key)
                .first()
            )
            if existing is None:
                raise
            same_template = existing.template_id == template_id or (
                template_id is not None and existing.template_id is None
            )
            if template_id is None:
                same_template = (
                    existing.template_id is None and existing.template_name == template_name.strip()
                )
            if not same_template or existing.form_data != form_data:
                raise ValueError(
                    "This form session was already saved with different values. "
                    "Your current entries are still here; start a new form to save them separately."
                ) from conflict
            row = existing
        return _filled_data(row)


def delete_filled(user: SupabaseUser, record_id: UUID) -> bool:
    with rls_context(user):
        require_rls_context()
        deleted, _ = FilledTemplate.objects.using("supabase").filter(id=record_id).delete()
        return deleted > 0
