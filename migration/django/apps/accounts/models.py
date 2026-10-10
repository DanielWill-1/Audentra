from django.db import models
from django.db.models.functions import Now


class Profile(models.Model):
    id = models.UUIDField(primary_key=True)
    first_name = models.CharField(max_length=100, default="")
    last_name = models.CharField(max_length=100, default="")
    company = models.CharField(max_length=200, default="")
    industry = models.CharField(max_length=120, default="")
    created_at = models.DateTimeField(db_default=Now())
    updated_at = models.DateTimeField(db_default=Now())

    class Meta:
        managed = False
        db_table = "users"
