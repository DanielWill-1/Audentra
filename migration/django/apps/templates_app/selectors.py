from typing import Any
from uuid import UUID

from django.db.models import Prefetch, Q, QuerySet

from apps.accounts.principals import SupabaseUser
from apps.db.rls import require_rls_context, rls_context
from apps.templates_app.models import Template, TemplateReview, TemplateShare

_SORT_FIELDS = {"created_at", "name", "category"}


def _review_data(review: TemplateReview) -> dict[str, Any]:
    return {
        "id": review.id,
        "template_id": review.template_id,
        "reviewer_id": review.reviewer_id,
        "reviewer_name": review.reviewer_name,
        "rating": review.rating,
        "comment": review.comment,
        "status": review.status,
        "created_at": review.created_at,
        "updated_at": review.updated_at,
    }


def _share_data(share: TemplateShare) -> dict[str, Any]:
    return {
        "id": share.id,
        "template_id": share.template_id,
        "recipient_id": share.recipient_id,
        "role": share.role,
        "shared_by": share.shared_by,
        "shared_at": share.shared_at,
        "message": share.message,
        "is_hidden": share.is_hidden,
        "updated_at": share.updated_at,
    }


def _template_data(template: Template, *, relations: bool = True) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": template.id,
        "name": template.name,
        "category": template.category,
        "description": template.description,
        "form_data": template.form_data,
        "uploaded_file": template.uploaded_file,
        "visibility": template.visibility,
        "created_by": template.created_by,
        "created_at": template.created_at,
        "updated_at": template.updated_at,
    }
    if relations:
        data["shared_with"] = [_share_data(row) for row in template.shares.all()]
        data["reviews"] = [_review_data(row) for row in template.reviews.all()]
    return data


def _template_queryset() -> QuerySet[Template]:
    return Template.objects.using("supabase").prefetch_related(
        Prefetch("shares", queryset=TemplateShare.objects.using("supabase").order_by("shared_at")),
        Prefetch(
            "reviews", queryset=TemplateReview.objects.using("supabase").order_by("-created_at")
        ),
    )


def list_templates(
    user: SupabaseUser,
    *,
    category: str | None = None,
    search: str | None = None,
    sort_by: str = "created_at",
    ascending: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> list[dict[str, Any]]:
    if sort_by not in _SORT_FIELDS or not 1 <= limit <= 100 or offset < 0:
        raise ValueError("Invalid template list options.")
    if category not in {
        None,
        "all",
        "healthcare",
        "fieldwork",
        "hr",
        "legal",
        "education",
        "realestate",
    }:
        raise ValueError("Unsupported template category.")
    with rls_context(user):
        require_rls_context()
        query = _template_queryset()
        if category not in {None, "all"}:
            query = query.filter(category=category)
        if search:
            term = search.strip()[:120]
            query = query.filter(
                Q(name__icontains=term)
                | Q(category__icontains=term)
                | Q(description__icontains=term)
            )
        ordering = sort_by if ascending else f"-{sort_by}"
        rows = list(query.order_by(ordering, "id")[offset : offset + limit])
        return [_template_data(row) for row in rows]


def get_template(user: SupabaseUser, template_id: UUID) -> dict[str, Any] | None:
    with rls_context(user):
        require_rls_context()
        template = _template_queryset().filter(id=template_id).first()
        return _template_data(template) if template is not None else None


def list_received_shares(user: SupabaseUser, *, limit: int = 100) -> list[dict[str, Any]]:
    if not 1 <= limit <= 100:
        raise ValueError("Invalid share list limit.")
    with rls_context(user):
        require_rls_context()
        rows = list(
            TemplateShare.objects.using("supabase")
            .filter(recipient_id=user.id, is_hidden=False)
            .select_related("template")
            .order_by("-shared_at")[:limit]
        )
        return [
            {**_share_data(row), "template": _template_data(row.template, relations=False)}
            for row in rows
        ]


def list_sent_shares(user: SupabaseUser, *, limit: int = 100) -> list[dict[str, Any]]:
    if not 1 <= limit <= 100:
        raise ValueError("Invalid share list limit.")
    with rls_context(user):
        require_rls_context()
        rows = list(
            TemplateShare.objects.using("supabase")
            .filter(shared_by=user.id)
            .select_related("template")
            .order_by("-shared_at")[:limit]
        )
        return [
            {**_share_data(row), "template": _template_data(row.template, relations=False)}
            for row in rows
        ]


def list_review_queue(user: SupabaseUser, *, limit: int = 100) -> list[dict[str, Any]]:
    if not 1 <= limit <= 100:
        raise ValueError("Invalid review list limit.")
    with rls_context(user):
        require_rls_context()
        rows = list(
            TemplateReview.objects.using("supabase")
            .filter(status="pending")
            .select_related("template")
            .order_by("-created_at")[:limit]
        )
        return [
            {**_review_data(row), "template": _template_data(row.template, relations=False)}
            for row in rows
        ]


def list_template_reviews(
    user: SupabaseUser, template_id: UUID, *, limit: int = 100
) -> list[dict[str, Any]]:
    if not 1 <= limit <= 100:
        raise ValueError("Invalid review list limit.")
    with rls_context(user):
        require_rls_context()
        rows = list(
            TemplateReview.objects.using("supabase")
            .filter(template_id=template_id)
            .order_by("-created_at")[:limit]
        )
        return [_review_data(row) for row in rows]
