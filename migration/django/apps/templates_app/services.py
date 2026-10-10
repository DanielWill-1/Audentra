import json
from collections.abc import Callable, Sequence
from typing import Any
from uuid import UUID, uuid4

from django.db import IntegrityError, transaction

from apps.accounts.principals import SupabaseUser
from apps.db.rls import require_rls_context, rls_context
from apps.templates_app.models import Template, TemplateReview, TemplateShare
from apps.templates_app.selectors import _review_data, _share_data, _template_data

_CATEGORIES = {"healthcare", "fieldwork", "hr", "legal", "education", "realestate"}
_ROLES = {"viewer", "editor", "admin"}
_REVIEW_STATUSES = {"pending", "approved", "rejected", "needs_changes"}
_TEMPLATE_FIELDS = {"name", "category", "description", "form_data", "visibility"}
_MAX_JSON_BYTES = 1_000_000


def _validate_template_values(values: dict[str, Any], *, creating: bool) -> dict[str, Any]:
    allowed = _TEMPLATE_FIELDS if creating else _TEMPLATE_FIELDS - {"category"}
    if set(values) - allowed:
        raise ValueError("Unsupported template field.")
    clean = dict(values)
    if creating and not clean.get("name"):
        raise ValueError("Template name is required.")
    if "name" in clean and (not isinstance(clean["name"], str) or not clean["name"].strip()):
        raise ValueError("Template name must be non-empty text.")
    if "name" in clean:
        clean["name"] = clean["name"].strip()[:200]
    if "category" in clean and clean["category"] not in _CATEGORIES:
        raise ValueError("Unsupported template category.")
    if "visibility" in clean and clean["visibility"] not in {"visible", "hidden"}:
        raise ValueError("Unsupported template visibility.")
    if "description" in clean and clean["description"] is not None:
        if not isinstance(clean["description"], str):
            raise ValueError("Template description must be text.")
        clean["description"] = clean["description"][:10_000]
    if "form_data" in clean and clean["form_data"] is not None:
        if not isinstance(clean["form_data"], (dict, list)):
            raise ValueError("Template form data must be a JSON object or array.")
        if (
            len(json.dumps(clean["form_data"], ensure_ascii=False).encode("utf-8"))
            > _MAX_JSON_BYTES
        ):
            raise ValueError("Template form data is too large.")
    return clean


def create_template(user: SupabaseUser, values: dict[str, Any]) -> dict[str, Any]:
    clean = _validate_template_values(values, creating=True)
    with rls_context(user):
        require_rls_context()
        template = Template.objects.using("supabase").create(
            id=uuid4(), created_by=user.id, **clean
        )
        template.refresh_from_db(using="supabase")
        return _template_data(template, relations=False)


def update_template(
    user: SupabaseUser, template_id: UUID, values: dict[str, Any]
) -> dict[str, Any] | None:
    clean = _validate_template_values(values, creating=False)
    with rls_context(user):
        require_rls_context()
        query = Template.objects.using("supabase").filter(id=template_id)
        if not query.exists():
            return None
        if clean:
            if query.update(**clean) != 1:
                return None
        row = query.first()
        return _template_data(row, relations=False) if row is not None else None


def set_template_visibility(
    user: SupabaseUser, template_id: UUID, visibility: str
) -> dict[str, Any] | None:
    if visibility not in {"visible", "hidden"}:
        raise ValueError("Unsupported template visibility.")
    return update_template(user, template_id, {"visibility": visibility})


def delete_template(
    user: SupabaseUser,
    template_id: UUID,
    *,
    delete_file: Callable[[str], None] | None = None,
) -> bool:
    with rls_context(user):
        require_rls_context()
        template = Template.objects.using("supabase").filter(id=template_id).first()
        if template is None:
            return False
        if template.uploaded_file:
            if delete_file is None:
                raise ValueError("Template file cleanup must be provided for templates with files.")
            # Keep the database transaction open; a Storage failure rolls back the row deletion.
            with transaction.atomic(using="supabase"):
                deleted, _ = template.delete(using="supabase")
                if deleted == 0:
                    return False
                delete_file(template.uploaded_file)
        else:
            deleted, _ = template.delete(using="supabase")
            return deleted > 0
        return True


def create_shares(
    user: SupabaseUser,
    template_id: UUID,
    recipient_ids: Sequence[UUID],
    role: str,
    *,
    message: str = "",
) -> list[dict[str, Any]]:
    if role not in _ROLES or not recipient_ids or len(recipient_ids) > 100:
        raise ValueError("Invalid share role or recipient count.")
    recipients = list(dict.fromkeys(recipient_ids))
    if len(recipients) != len(recipient_ids):
        raise ValueError("Duplicate share recipients are not allowed.")
    if not all(isinstance(value, UUID) for value in recipients):
        raise ValueError("Recipient IDs must be UUIDs.")
    if not isinstance(message, str) or len(message) > 1000:
        raise ValueError("Share message must be at most 1000 characters.")
    with rls_context(user):
        require_rls_context()
        try:
            with transaction.atomic(using="supabase"):
                rows = [
                    TemplateShare(
                        id=uuid4(),
                        template_id=template_id,
                        recipient_id=recipient,
                        role=role,
                        shared_by=user.id,
                        message=message,
                    )
                    for recipient in recipients
                ]
                TemplateShare.objects.using("supabase").bulk_create(rows)
        except IntegrityError as error:
            raise ValueError(
                "Share requires an existing recipient and a new template-recipient pair."
            ) from error
        return [_share_data(row) for row in rows]


def remove_share(user: SupabaseUser, share_id: UUID) -> bool:
    with rls_context(user):
        require_rls_context()
        deleted, _ = TemplateShare.objects.using("supabase").filter(id=share_id).delete()
        return deleted > 0


def set_share_hidden(user: SupabaseUser, share_id: UUID, hidden: bool) -> dict[str, Any] | None:
    if not isinstance(hidden, bool):
        raise ValueError("Hidden state must be boolean.")
    with rls_context(user):
        require_rls_context()
        query = TemplateShare.objects.using("supabase").filter(id=share_id)
        if not query.exists():
            return None
        query.update(is_hidden=hidden)
        row = query.first()
        return _share_data(row) if row is not None else None


def set_share_role(user: SupabaseUser, share_id: UUID, role: str) -> dict[str, Any] | None:
    if role not in _ROLES:
        raise ValueError("Unsupported share role.")
    with rls_context(user):
        require_rls_context()
        query = TemplateShare.objects.using("supabase").filter(id=share_id)
        if not query.exists():
            return None
        if query.update(role=role) != 1:
            return None
        row = query.first()
        return _share_data(row) if row is not None else None


def request_review(user: SupabaseUser, template_id: UUID) -> dict[str, Any]:
    name = " ".join(
        value.strip()
        for value in (
            user.user_metadata.get("first_name", ""),
            user.user_metadata.get("last_name", ""),
        )
        if isinstance(value, str) and value.strip()
    )[:200]
    with rls_context(user):
        require_rls_context()
        try:
            with transaction.atomic(using="supabase"):
                review = TemplateReview.objects.using("supabase").create(
                    id=uuid4(),
                    template_id=template_id,
                    reviewer_id=user.id,
                    reviewer_name=name,
                    rating=0,
                    comment="",
                    status="pending",
                )
        except IntegrityError as error:
            raise ValueError("A review already exists or the template is not available.") from error
        return _review_data(review)


def create_review(
    user: SupabaseUser,
    template_id: UUID,
    *,
    rating: int,
    comment: str = "",
    status: str = "pending",
) -> dict[str, Any]:
    if isinstance(rating, bool) or not isinstance(rating, int) or not 0 <= rating <= 5:
        raise ValueError("Rating must be between 0 and 5.")
    if status not in _REVIEW_STATUSES or not isinstance(comment, str) or len(comment) > 10_000:
        raise ValueError("Invalid review content or status.")
    if status != "pending":
        raise ValueError("New reviews must start pending.")
    name_value = user.user_metadata.get("first_name", "")
    name = name_value.strip()[:200] if isinstance(name_value, str) else ""
    with rls_context(user):
        require_rls_context()
        try:
            with transaction.atomic(using="supabase"):
                review = TemplateReview.objects.using("supabase").create(
                    id=uuid4(),
                    template_id=template_id,
                    reviewer_id=user.id,
                    reviewer_name=name,
                    rating=rating,
                    comment=comment,
                    status=status,
                )
        except IntegrityError as error:
            raise ValueError("A review already exists or the template is not available.") from error
        return _review_data(review)


def update_review(
    user: SupabaseUser, review_id: UUID, values: dict[str, Any]
) -> dict[str, Any] | None:
    if set(values) - {"rating", "comment", "status"}:
        raise ValueError("Unsupported review field.")
    clean = dict(values)
    if "rating" in clean and (
        isinstance(clean["rating"], bool)
        or not isinstance(clean["rating"], int)
        or not 0 <= clean["rating"] <= 5
    ):
        raise ValueError("Rating must be between 0 and 5.")
    if "comment" in clean and (
        not isinstance(clean["comment"], str) or len(clean["comment"]) > 10_000
    ):
        raise ValueError("Review comment is too long or invalid.")
    if "status" in clean and clean["status"] not in _REVIEW_STATUSES:
        raise ValueError("Unsupported review status.")
    with rls_context(user):
        require_rls_context()
        query = TemplateReview.objects.using("supabase").filter(id=review_id)
        if not query.exists():
            return None
        if clean:
            query.update(**clean)
        row = query.first()
        return _review_data(row) if row is not None else None
