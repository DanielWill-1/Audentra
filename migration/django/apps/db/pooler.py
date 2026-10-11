"""Recognize supported restricted Supabase PostgreSQL connection modes."""

from __future__ import annotations

from typing import Any


def connection_profile(database: dict[str, Any], project_ref: str) -> tuple[str, bool]:
    """Return the configured mode and whether its role/target settings are exact."""
    host = str(database.get("HOST", "")).lower()
    port = str(database.get("PORT", ""))
    username = str(database.get("USER", ""))
    database_name = str(database.get("NAME", ""))
    options = database.get("OPTIONS", {})
    sslmode = options.get("sslmode") if isinstance(options, dict) else None

    if host == f"db.{project_ref}.supabase.co" and port == "5432":
        return "direct host", username == "django_data"
    if host.endswith(".pooler.supabase.com"):
        if port == "6543":
            valid = (
                username == f"django_data.{project_ref}"
                and database_name == "postgres"
                and sslmode == "require"
            )
            return "shared transaction pooler", valid
        if port == "5432":
            return "shared session pooler", False
    if host == f"db.{project_ref}.supabase.co" and port == "6543":
        return "dedicated transaction pooler", False
    return "other", False
