from uuid import uuid4

from django.db import models
from django.db.models.functions import Now


class ScheduledEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid4)
    title = models.TextField()
    description = models.TextField()
    date = models.DateField()
    time = models.TimeField()
    duration = models.IntegerField()
    type = models.TextField()
    priority = models.TextField()
    attendees = models.JSONField()
    location = models.TextField()
    form_id = models.UUIDField(null=True)
    reminder_minutes = models.IntegerField()
    status = models.TextField()
    created_by = models.UUIDField()
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "scheduled_events"
