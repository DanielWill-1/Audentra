from typing import Any


class DjangoStateRouter:
    """Keep sessions and other Django-owned foundation tables off the data alias."""

    state_apps = {"sessions"}
    data_apps = {"accounts", "scheduler", "templates_app", "voice"}

    def db_for_read(self, model: Any, **hints: Any) -> str:
        del hints
        if getattr(getattr(model, "_meta", None), "app_label", None) in self.data_apps:
            return "supabase"
        return "default"

    def db_for_write(self, model: Any, **hints: Any) -> str:
        del hints
        if getattr(getattr(model, "_meta", None), "app_label", None) in self.data_apps:
            return "supabase"
        return "default"

    def allow_relation(self, obj1: Any, obj2: Any, **hints: Any) -> bool:
        del hints
        return bool(obj1._state.db is not None and obj1._state.db == obj2._state.db)

    def allow_migrate(
        self,
        db: str,
        app_label: str,
        model_name: str | None = None,
        **hints: Any,
    ) -> bool:
        del model_name, hints
        return db == "default" and app_label in self.state_apps
