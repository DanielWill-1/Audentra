"""Provision the loopback-only Supabase demo database."""

from __future__ import annotations

import argparse
import json
import os
import secrets
import shutil
import subprocess
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

import psycopg
from dotenv import dotenv_values
from psycopg import sql
from psycopg.types.json import Jsonb

PROJECT_DIR = Path(__file__).resolve().parents[1]
REPOSITORY_DIR = PROJECT_DIR.parents[1]
SUPABASE_DIR = REPOSITORY_DIR / "supabase"
STATE_DIR = PROJECT_DIR / ".state"
STATE_FILE = STATE_DIR / "local-supabase.env"
CREDENTIALS_FILE = STATE_DIR / "local-demo-credentials.txt"
DEMO_EMAIL = "demo@voiceform.local"
DEMO_TEMPLATE_ID = "00000000-0000-4000-8000-000000000501"


class LocalSetupError(RuntimeError):
    """Safe, user-facing local setup failure."""


def _run_supabase(arguments: list[str], *, timeout: int = 300) -> str:
    executable = shutil.which("supabase")
    if executable is None:
        raise LocalSetupError("Supabase CLI is unavailable. Install it, then retry.")
    try:
        result = subprocess.run(
            [executable, *arguments],
            cwd=REPOSITORY_DIR,
            env={**os.environ, "SUPABASE_TELEMETRY_DISABLED": "1"},
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        raise LocalSetupError(
            "Supabase CLI did not finish. Check the local Supabase stack."
        ) from None
    if result.returncode:
        raise LocalSetupError(
            f"Supabase CLI failed during {arguments[0]}. No command output was saved."
        )
    return result.stdout


def _is_loopback(value: str, port: int, *, allow_credentials: bool = False) -> bool:
    try:
        parsed = urlsplit(value)
        host = (parsed.hostname or "").casefold()
        return (
            parsed.scheme in {"http", "postgresql", "postgres"}
            and host in {"localhost", "127.0.0.1", "::1"}
            and parsed.port == port
            and (allow_credentials or (parsed.username is None and parsed.password is None))
            and not parsed.fragment
        )
    except ValueError:
        return False


def _local_status() -> dict[str, str]:
    supplied_status = os.getenv("P10_LOCAL_SUPABASE_STATUS_JSON", "").strip()
    try:
        payload = (
            json.loads(supplied_status)
            if supplied_status
            else json.loads(_run_supabase(["status", "--output", "json"], timeout=30))
        )
    except (json.JSONDecodeError, LocalSetupError):
        raise LocalSetupError(
            "Local Supabase is not ready. Start it with supabase start, then retry."
        ) from None
    values = {
        "api_url": payload.get("API_URL", ""),
        "db_url": payload.get("DB_URL", ""),
        "publishable_key": payload.get("PUBLISHABLE_KEY", ""),
        "service_role_key": payload.get("SERVICE_ROLE_KEY", ""),
    }
    if (
        not _is_loopback(values["api_url"], 54321)
        or not _is_loopback(values["db_url"], 54322, allow_credentials=True)
        or not values["publishable_key"].startswith("sb_publishable_")
        or not values["service_role_key"]
    ):
        raise LocalSetupError(
            "Supabase status did not report the expected local API, database, and Auth keys."
        )
    return values


def _existing_state() -> dict[str, str]:
    return {
        key: value
        for key, value in dotenv_values(STATE_FILE).items()
        if isinstance(value, str)
    }


def _secret(existing: dict[str, str], name: str, minimum_length: int = 32) -> str:
    value = existing.get(name, "").strip()
    return value if len(value) >= minimum_length else secrets.token_urlsafe(48)


def _write_state(status: dict[str, str], existing: dict[str, str]) -> dict[str, str]:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    values = {
        "P10_LOCAL_SUPABASE_URL": status["api_url"],
        "P10_LOCAL_SUPABASE_PUBLISHABLE_KEY": status["publishable_key"],
        "P10_LOCAL_DJANGO_SECRET_KEY": _secret(
            existing, "P10_LOCAL_DJANGO_SECRET_KEY", minimum_length=50
        ),
        "P10_LOCAL_DJANGO_APP_PASSWORD": _secret(existing, "P10_LOCAL_DJANGO_APP_PASSWORD"),
        "P10_LOCAL_DJANGO_DATA_PASSWORD": _secret(existing, "P10_LOCAL_DJANGO_DATA_PASSWORD"),
        "P10_LOCAL_DEMO_EMAIL": DEMO_EMAIL,
        "P10_LOCAL_DEMO_PASSWORD": _secret(existing, "P10_LOCAL_DEMO_PASSWORD"),
    }
    values["P10_LOCAL_DJANGO_DATABASE_URL"] = (
        "postgresql://django_app:"
        + quote(values["P10_LOCAL_DJANGO_APP_PASSWORD"], safe="")
        + "@127.0.0.1:54322/postgres?sslmode=disable"
    )
    values["P10_LOCAL_SUPABASE_DATABASE_URL"] = (
        "postgresql://django_data:"
        + quote(values["P10_LOCAL_DJANGO_DATA_PASSWORD"], safe="")
        + "@127.0.0.1:54322/postgres?sslmode=disable"
    )
    STATE_FILE.write_text(
        "# Generated for loopback Supabase only. Do not copy into hosted .env files.\n"
        + "\n".join(f"{name}={json.dumps(value)}" for name, value in values.items())
        + "\n",
        encoding="utf-8",
    )
    CREDENTIALS_FILE.write_text(
        "VoiceForm synthetic local demo account\n"
        "Local Supabase only. The password is generated per workstation.\n"
        f"Email: {DEMO_EMAIL}\n"
        f"Password: {values['P10_LOCAL_DEMO_PASSWORD']}\n",
        encoding="utf-8",
    )
    return values


def _provision_roles(admin_url: str, values: dict[str, str]) -> None:
    bootstrap_path = SUPABASE_DIR / "bootstrap" / "django_app_role.sql"
    try:
        bootstrap = bootstrap_path.read_text(encoding="utf-8")
        with psycopg.connect(admin_url, connect_timeout=5) as connection:
            rows = connection.execute(
                """
                SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
                       rolinherit, rolbypassrls
                FROM pg_roles
                WHERE rolname IN ('django_app', 'django_data')
                """
            ).fetchall()
            existing_roles = {row[0] for row in rows}
            if not existing_roles:
                connection.execute(bootstrap)
            elif existing_roles != {"django_app", "django_data"}:
                raise LocalSetupError(
                    "Only one restricted Django role exists. "
                    "Inspect the local database before setup."
                )
            else:
                for row in rows:
                    if tuple(row[1:]) != (True, False, False, False, False, False):
                        raise LocalSetupError(
                            "A local Django database role has unexpected permissions."
                        )
                memberships = connection.execute(
                    """
                    SELECT member_role.rolname, granted_role.rolname
                    FROM pg_auth_members AS membership
                    JOIN pg_roles AS member_role ON member_role.oid = membership.member
                    JOIN pg_roles AS granted_role ON granted_role.oid = membership.roleid
                    WHERE member_role.rolname IN ('django_app', 'django_data')
                    """
                ).fetchall()
                if any(
                    member != "django_data" or role != "authenticated"
                    for member, role in memberships
                ):
                    raise LocalSetupError(
                        "A local Django database role has an unexpected role membership."
                    )

            schema_owner = connection.execute(
                """
                SELECT owner.rolname
                FROM pg_namespace AS schema
                JOIN pg_roles AS owner ON owner.oid = schema.nspowner
                WHERE schema.nspname = 'django'
                """
            ).fetchone()
            if schema_owner is None:
                connection.execute(
                    sql.SQL("CREATE SCHEMA django AUTHORIZATION {}").format(
                        sql.Identifier(connection.info.user)
                    )
                )
            elif schema_owner[0] != connection.info.user:
                raise LocalSetupError(
                    "The local Django session schema has an unexpected owner."
                )

            connection.execute("GRANT USAGE, CREATE ON SCHEMA django TO django_app")
            connection.execute("GRANT USAGE ON SCHEMA public TO django_data")
            connection.execute("ALTER ROLE django_app SET search_path = django")
            connection.execute("ALTER ROLE django_data SET search_path = public")
            connection.execute(
                "GRANT authenticated TO django_data WITH INHERIT FALSE, SET TRUE"
            )
            for role, password_name in (
                ("django_app", "P10_LOCAL_DJANGO_APP_PASSWORD"),
                ("django_data", "P10_LOCAL_DJANGO_DATA_PASSWORD"),
            ):
                connection.execute(
                    sql.SQL("ALTER ROLE {} PASSWORD {}").format(
                        sql.Identifier(role), sql.Literal(values[password_name])
                    )
                )
    except psycopg.Error:
        raise LocalSetupError(
            "Could not prepare restricted Django roles in local Supabase."
        ) from None

    for name in ("P10_LOCAL_DJANGO_DATABASE_URL", "P10_LOCAL_SUPABASE_DATABASE_URL"):
        try:
            with psycopg.connect(values[name], connect_timeout=5) as connection:
                connection.execute("SELECT current_user").fetchone()
        except psycopg.Error:
            raise LocalSetupError(
                "A restricted Django database connection could not be verified locally."
            ) from None


def _admin_request(
    method: str,
    url: str,
    publishable_key: str,
    service_role_key: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method=method,
        headers={
            "apikey": publishable_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urlopen(request, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError):
        raise LocalSetupError(
            "Supabase Auth could not provision the synthetic local demo account."
        ) from None
    if not isinstance(result, dict):
        raise LocalSetupError("Supabase Auth returned an invalid local setup response.")
    return result


def _provision_demo_data(
    status: dict[str, str], values: dict[str, str]
) -> None:
    admin_url = status["db_url"]
    try:
        with psycopg.connect(admin_url, connect_timeout=5) as connection:
            row = connection.execute(
                "SELECT id FROM auth.users WHERE lower(email) = lower(%s)",
                [DEMO_EMAIL],
            ).fetchone()
    except psycopg.Error:
        raise LocalSetupError("Could not inspect the synthetic local demo account.") from None

    user_payload = {
        "email": DEMO_EMAIL,
        "password": values["P10_LOCAL_DEMO_PASSWORD"],
        "email_confirm": True,
        "user_metadata": {
            "first_name": "VoiceForm",
            "last_name": "Demo",
        },
    }
    auth_url = status["api_url"].rstrip("/") + "/auth/v1/admin/users"
    user_id = str(row[0]) if row else ""
    if user_id:
        _admin_request(
            "PUT",
            auth_url + "/" + user_id,
            status["publishable_key"],
            status["service_role_key"],
            user_payload,
        )
    else:
        created = _admin_request(
            "POST",
            auth_url,
            status["publishable_key"],
            status["service_role_key"],
            user_payload,
        )
        user_id = created.get("id", "")

    try:
        with psycopg.connect(admin_url, connect_timeout=5) as connection:
            row = connection.execute(
                "SELECT id FROM auth.users WHERE lower(email) = lower(%s)",
                [DEMO_EMAIL],
            ).fetchone()
            if row is None or str(row[0]) != user_id:
                raise LocalSetupError(
                    "The synthetic local demo account was not saved by Supabase Auth."
                )
            connection.execute(
                """
                INSERT INTO public.templates
                    (id, name, category, description, form_data, visibility, created_by)
                VALUES (%s, %s, %s, %s, %s, 'visible', %s)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    category = EXCLUDED.category,
                    description = EXCLUDED.description,
                    form_data = EXCLUDED.form_data,
                    visibility = EXCLUDED.visibility,
                    created_by = EXCLUDED.created_by
                """,
                [
                    DEMO_TEMPLATE_ID,
                    "Demo patient intake",
                    "healthcare",
                    "Synthetic example. Use fictional values only.",
                    Jsonb(
                        {
                            "fields": [
                                {
                                    "id": "patient_name",
                                    "label": "Patient name",
                                    "type": "text",
                                    "required": True,
                                },
                                {
                                    "id": "email",
                                    "label": "Email",
                                    "type": "email",
                                    "required": False,
                                },
                                {
                                    "id": "reason",
                                    "label": "Reason for visit",
                                    "type": "text",
                                    "required": True,
                                },
                            ]
                        }
                    ),
                    user_id,
                ],
            )
    except psycopg.Error:
        raise LocalSetupError(
            "Could not seed the synthetic local demo template."
        ) from None


def _setup() -> None:
    status = _local_status()
    values = _write_state(status, _existing_state())
    _provision_roles(status["db_url"], values)
    _provision_demo_data(status, values)
    print(
        json.dumps(
            {
                "ok": True,
                "database": "loopback_supabase",
                "seed": "synthetic_demo_account_and_template",
                "demo_email": DEMO_EMAIL,
                "credentials_file": str(CREDENTIALS_FILE.relative_to(PROJECT_DIR)),
            },
            sort_keys=True,
        )
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--local",
        action="store_true",
        required=True,
        help="confirm this script is only provisioning the loopback Supabase project",
    )
    parser.parse_args()

    try:
        _setup()
    except LocalSetupError as error:
        print(json.dumps({"ok": False, "failure": str(error)}, sort_keys=True))
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
