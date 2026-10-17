from uuid import uuid4

from django.db import models
from django.db.models.functions import Now


class ActivityEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    user_id = models.UUIDField()
    event_type = models.TextField()
    entity_kind = models.TextField()
    entity_id = models.UUIDField()
    related_template_id = models.UUIDField(null=True)
    label = models.CharField(max_length=200)
    metadata = models.JSONField(default=dict)
    occurred_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "activity_events"
