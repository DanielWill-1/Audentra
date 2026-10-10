from uuid import uuid4

from django.db import models
from django.db.models.functions import Now


class Template(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    name = models.TextField()
    category = models.TextField()
    description = models.TextField(null=True)
    form_data = models.JSONField(null=True)
    uploaded_file = models.TextField(null=True)
    visibility = models.TextField()
    created_by = models.UUIDField()
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "templates"


class TemplateShare(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    template = models.ForeignKey(
        Template,
        db_column="template_id",
        related_name="shares",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
    )
    recipient_id = models.UUIDField()
    role = models.TextField()
    shared_by = models.UUIDField()
    shared_at = models.DateTimeField(db_default=Now())
    message = models.TextField()
    is_hidden = models.BooleanField(default=False)
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "template_shares"


class TemplateReview(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    template = models.ForeignKey(
        Template,
        db_column="template_id",
        related_name="reviews",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
    )
    reviewer_id = models.UUIDField()
    reviewer_name = models.TextField()
    rating = models.SmallIntegerField()
    comment = models.TextField()
    status = models.TextField()
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "template_reviews"
