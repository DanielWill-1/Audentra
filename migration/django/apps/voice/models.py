from uuid import uuid4

from django.db import models
from django.db.models.functions import Now

from apps.templates_app.models import Template


class FilledTemplate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    user_id = models.UUIDField()
    template = models.ForeignKey(
        Template,
        db_column="template_id",
        null=True,
        related_name="filled_submissions",
        on_delete=models.DO_NOTHING,
        db_constraint=False,
    )
    template_name = models.TextField()
    form_data = models.JSONField()
    created_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "filled_templates"
