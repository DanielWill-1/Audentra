from typing import Any, cast

from django.contrib.sessions.backends.base import CreateError, UpdateError
from django.contrib.sessions.backends.db import SessionStore as DatabaseSessionStore
from django.db import DatabaseError, router, transaction


class SessionStore(DatabaseSessionStore):
    """Keep rotated auth data canonical and refuse to resurrect a deleted key."""

    def save(self, must_create: bool = False) -> None:
        if self.session_key is None:
            return self.create()
        data = cast(Any, self)._get_session(no_load=must_create)
        using = router.db_for_write(self.model)
        try:
            with transaction.atomic(using=using):
                current = (
                    self.model.objects.using(using)
                    .select_for_update()
                    .filter(session_key=self.session_key)
                    .first()
                )
                if must_create:
                    if current is not None:
                        raise CreateError
                    self.create_model_instance(data).save(force_insert=True, using=using)
                    return
                if current is None:
                    raise UpdateError
                persisted = self.decode(current.session_data)
                current_auth = persisted.get("_accounts")
                local_auth = data.get("_accounts")
                if isinstance(current_auth, dict):
                    current_generation = current_auth.get("generation", 0)
                    local_generation = (
                        local_auth.get("generation", 0) if isinstance(local_auth, dict) else -1
                    )
                    if local_generation <= current_generation:
                        data["_accounts"] = current_auth
                instance = self.create_model_instance(data)
                instance.save(force_update=True, using=using)
        except CreateError:
            raise
        except DatabaseError as error:
            if must_create:
                raise CreateError from error
            raise UpdateError from error

    def delete(self, session_key: str | None = None) -> None:
        key = session_key or self.session_key
        if key is None:
            return
        using = router.db_for_write(self.model)
        with transaction.atomic(using=using):
            row = (
                self.model.objects.using(using).select_for_update().filter(session_key=key).first()
            )
            if row is not None:
                row.delete(using=using)
