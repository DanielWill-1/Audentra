"""Capture and compare the hosted development schema using read-only SELECTs."""

# ruff: noqa: E402 -- Django must be bootstrapped before application imports.

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

PROJECT = Path(__file__).resolve().parents[1]
REPOSITORY = PROJECT.parents[1]
P5_BASELINE = REPOSITORY / "docs" / "data" / "P5_TARGET_INVENTORY.json"
sys.path.insert(0, str(PROJECT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

import django

django.setup()

from apps.db.rls import _allow_fixed_metadata_query
from django.conf import settings
from django.db import connections, transaction

APP_TABLES = (
    "users",
    "templates",
    "template_shares",
    "template_reviews",
    "scheduled_events",
    "filled_templates",
)
ROLE_NAMES = ("authenticated", "django_app", "django_data", "service_role")


def select_rows(alias: str, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with connections[alias].cursor() as cursor:
        if alias == "supabase":
            with _allow_fixed_metadata_query(sql):
                cursor.execute(sql, params)
        else:
            cursor.execute(sql, params)
        names = [column[0] for column in cursor.description or ()]
        return [dict(zip(names, row, strict=True)) for row in cursor.fetchall()]


def select_rows_as_authenticated(sql: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    try:
        with transaction.atomic(using="supabase"):
            with connections["supabase"].cursor() as cursor:
                cursor.execute("SET TRANSACTION READ ONLY")
                with _allow_fixed_metadata_query("SET LOCAL ROLE authenticated"):
                    cursor.execute("SET LOCAL ROLE authenticated")
                with _allow_fixed_metadata_query("SET LOCAL search_path = public, storage"):
                    cursor.execute("SET LOCAL search_path = public, storage")
                with _allow_fixed_metadata_query(sql):
                    cursor.execute(sql)
                names = [column[0] for column in cursor.description or ()]
                rows = [dict(zip(names, row, strict=True)) for row in cursor.fetchall()]
    except Exception:
        connections["supabase"].rollback()
        raise
    return rows


def alias_facts(alias: str) -> dict[str, Any]:
    database = settings.DATABASES[alias]
    rows = select_rows(
        alias,
        "SELECT current_user AS role, current_schema() AS schema, "
        "current_database() AS database, current_setting('search_path') AS search_path, "
        "current_setting('server_version') AS server_version",
    )
    return {
        "configured_engine": database.get("ENGINE"),
        "configured_role": database.get("USER"),
        "configured_database": database.get("NAME"),
        "configured_port": str(database.get("PORT", "")),
        "connected": rows[0],
    }


def record_difference(
    baseline: list[dict[str, Any]],
    current: list[dict[str, Any]],
    fields: tuple[str, ...],
    key_fields: tuple[str, ...] | None = None,
) -> dict[str, Any]:
    key_fields = key_fields if key_fields is not None else fields[:2]

    def normalized(rows: list[dict[str, Any]]) -> dict[tuple[str, ...], dict[str, Any]]:
        result: dict[tuple[str, ...], dict[str, Any]] = {}
        for row in rows:
            key = tuple(str(row.get(field)) for field in key_fields) or ("singleton",)
            result[key] = {field: row.get(field) for field in fields}
        return result

    expected = normalized(baseline)
    actual = normalized(current)
    missing = [expected[key] for key in sorted(expected.keys() - actual.keys())]
    unexpected = [actual[key] for key in sorted(actual.keys() - expected.keys())]
    changed = [
        {"baseline": expected[key], "current": actual[key]}
        for key in sorted(expected.keys() & actual.keys())
        if expected[key] != actual[key]
    ]
    return {
        "status": "pass" if not (missing or unexpected or changed) else "drift",
        "baseline_count": len(expected),
        "current_count": len(actual),
        "missing": missing,
        "unexpected": unexpected,
        "changed": changed,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--attempt", type=int, default=1)
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,47}", args.run_id, re.IGNORECASE):
        parser.error("--run-id must be a short filesystem-safe label")
    if not 1 <= args.attempt <= 99:
        parser.error("--attempt must be between 1 and 99")

    run_directory = REPOSITORY / "docs" / "parity" / "evidence" / "p9" / args.run_id
    output_name = (
        "P9_SCHEMA_ACCEPTANCE.json"
        if args.attempt == 1
        else f"P9_SCHEMA_ACCEPTANCE_ATTEMPT_{args.attempt:02}.json"
    )
    output = run_directory / output_name
    if not run_directory.is_dir():
        raise FileNotFoundError(f"P9 run directory does not exist: {args.run_id}")
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite hosted schema evidence: {output}")

    baseline = json.loads(P5_BASELINE.read_text(encoding="utf-8"))
    expected_project = baseline["project_ref"]
    supabase_db = settings.DATABASES["supabase"]
    supabase_host = str(supabase_db.get("HOST", "")).casefold()
    supabase_role = str(supabase_db.get("USER", ""))
    supabase_url_host = (urlsplit(settings.SUPABASE_URL).hostname or "").casefold()
    project_ref = supabase_url_host.split(".", 1)[0]
    if (
        project_ref != expected_project
        or not supabase_host.endswith(".pooler.supabase.com")
        or str(supabase_db.get("PORT")) != "6543"
        or not supabase_role.startswith("django_data.")
        or supabase_role.rsplit(".", 1)[-1] != project_ref
    ):
        raise RuntimeError(
            "Read-only schema check requires the accepted project-scoped development pooler role"
        )

    result: dict[str, Any] = {
        "run_id": args.run_id,
        "captured_at": datetime.now(UTC).isoformat(),
        "status": "running",
        "target": {
            "project": baseline["project"],
            "project_ref": project_ref,
            "host_mode": "shared transaction pooler",
            "pooler_port": 6543,
            "role_boundary": (
                "django_data project-scoped pooler credential; no privileged credentials"
            ),
        },
        "read_only": True,
        "runtime_aliases": {},
        "public_application_objects": [],
        "public_columns": [],
        "public_constraints": [],
        "public_indexes": [],
        "application_policies": [],
        "application_triggers": [],
        "security_definer_functions": [],
        "storage": {
            "buckets": [],
            "policies": [],
            "objects_security": {},
        },
        "roles": [],
        "memberships": [],
        "schema_privileges": [],
        "table_grants": [],
        "comparison": {},
        "unavailable_sections": [],
    }

    result["runtime_aliases"] = {
        alias: alias_facts(alias) for alias in ("default", "supabase")
    }
    result["public_application_objects"] = select_rows(
        "supabase",
        "SELECT c.relname AS name, c.relkind AS kind, c.relrowsecurity AS rls_enabled, "
        "c.relforcerowsecurity AS rls_forced, owner.rolname AS owner "
        "FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
        "JOIN pg_roles owner ON owner.oid = c.relowner "
        "WHERE n.nspname = 'public' AND c.relname = ANY(%s) "
        "AND c.relkind IN ('r','p','v','m','f') ORDER BY c.relname",
        (list(APP_TABLES),),
    )
    result["public_columns"] = select_rows(
        "supabase",
        "SELECT c.relname AS table, a.attname AS name, "
        "format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable, "
        "pg_get_expr(d.adbin, d.adrelid) AS default, a.attgenerated AS generated, "
        "a.attidentity AS identity "
        "FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid "
        "JOIN pg_namespace n ON n.oid = c.relnamespace "
        "LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum "
        "WHERE n.nspname = 'public' AND c.relname = ANY(%s) "
        "AND a.attnum > 0 AND NOT a.attisdropped ORDER BY c.relname, a.attnum",
        (list(APP_TABLES),),
    )
    result["public_constraints"] = select_rows(
        "supabase",
        "SELECT c.relname AS table, con.conname AS name, "
        "con.contype::text AS type, "
        "pg_get_constraintdef(con.oid, true) AS definition "
        "FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid "
        "JOIN pg_namespace n ON n.oid = c.relnamespace "
        "WHERE n.nspname = 'public' AND c.relname = ANY(%s) ORDER BY c.relname, con.conname",
        (list(APP_TABLES),),
    )
    result["public_indexes"] = select_rows(
        "supabase",
        "SELECT 'public.' || tablename AS table, indexname AS name, indexdef AS definition "
        "FROM pg_indexes WHERE schemaname = 'public' AND tablename = ANY(%s) "
        "ORDER BY tablename, indexname",
        (list(APP_TABLES),),
    )
    result["application_policies"] = select_rows(
        "supabase",
        "SELECT schemaname AS schema, tablename AS table, policyname AS name, "
        "cmd AS command, roles, qual AS using, with_check AS check "
        "FROM pg_policies WHERE schemaname = 'public' AND tablename = ANY(%s) "
        "ORDER BY tablename, policyname",
        (list(APP_TABLES),),
    )
    result["application_triggers"] = select_rows(
        "supabase",
        "SELECT c.relname AS table, t.tgname AS name, "
        "'EXECUTE FUNCTION ' || p.proname || '()' AS definition "
        "FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid "
        "JOIN pg_namespace n ON n.oid = c.relnamespace "
        "JOIN pg_proc p ON p.oid = t.tgfoid "
        "WHERE n.nspname = 'public' AND NOT t.tgisinternal AND c.relname = ANY(%s) "
        "ORDER BY c.relname, t.tgname",
        (list(APP_TABLES),),
    )
    result["security_definer_functions"] = select_rows(
        "supabase",
        "SELECT regexp_replace(p.oid::regprocedure::text, '^public\\.', '') AS name, "
        "owner.rolname AS owner, p.prosecdef AS security_definer, p.proconfig AS configuration "
        "FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace "
        "JOIN pg_roles owner ON owner.oid = p.proowner "
        "WHERE n.nspname = 'public' AND p.prosecdef ORDER BY name",
    )
    try:
        result["storage"]["buckets"] = select_rows_as_authenticated(
            'SELECT id, name, "public" AS is_public, file_size_limit, allowed_mime_types '
            "FROM storage.buckets WHERE id = 'template-files' ORDER BY id"
        )
        for bucket in result["storage"]["buckets"]:
            bucket["public"] = bucket.pop("is_public")
    except Exception as error:
        result["unavailable_sections"].append(
            {
                "section": "storage bucket catalog",
                "error_type": type(error).__name__,
                "message": str(error)[:250],
            }
        )
        connections["supabase"].rollback()
    try:
        result["storage"]["policies"] = select_rows(
            "supabase",
            "SELECT schemaname AS schema, tablename AS table, policyname AS name, "
            "cmd AS command, roles, qual AS using, with_check AS check "
            "FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' "
            "ORDER BY policyname",
        )
        result["storage"]["objects_security"] = select_rows_as_authenticated(
            "SELECT c.relrowsecurity AS rls_enabled, "
            "has_table_privilege('authenticated', 'storage.objects', 'SELECT') "
            "AS select_granted_to_authenticated, "
            "has_table_privilege('authenticated', 'storage.objects', 'INSERT') "
            "AS insert_granted_to_authenticated, "
            "has_table_privilege('authenticated', 'storage.objects', 'UPDATE') "
            "AS update_granted_to_authenticated, "
            "has_table_privilege('authenticated', 'storage.objects', 'DELETE') "
            "AS delete_granted_to_authenticated, "
            "has_schema_privilege('authenticated', 'storage', 'USAGE') "
            "AS storage_usage_granted_to_authenticated "
            "FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace "
            "WHERE n.nspname = 'storage' AND c.relname = 'objects'",
        )
        if result["storage"]["objects_security"]:
            result["storage"]["objects_security"] = result["storage"]["objects_security"][0]
    except Exception as error:
        result["unavailable_sections"].append(
            {
                "section": "storage object grants and RLS state",
                "error_type": type(error).__name__,
                "message": str(error)[:250],
            }
        )
        connections["supabase"].rollback()

    result["roles"] = select_rows(
        "supabase",
        "SELECT rolname AS name, rolsuper AS superuser, rolbypassrls AS bypassrls, "
        "rolcreatedb AS createdb, rolcreaterole AS createrole, rolinherit AS inherit, "
        "rolcanlogin AS login FROM pg_roles WHERE rolname = ANY(%s) ORDER BY rolname",
        (list(ROLE_NAMES),),
    )
    result["memberships"] = select_rows(
        "supabase",
        "SELECT parent.rolname AS role, member.rolname AS member, "
        "membership.admin_option, membership.inherit_option, membership.set_option "
        "FROM pg_auth_members membership JOIN pg_roles parent ON parent.oid = membership.roleid "
        "JOIN pg_roles member ON member.oid = membership.member "
        "WHERE parent.rolname = 'authenticated' AND member.rolname = 'django_data'",
    )
    result["schema_privileges"] = select_rows(
        "supabase",
        "SELECT role_name AS role, schema_name AS schema, "
        "has_schema_privilege(role_name, schema_name, 'USAGE') AS usage, "
        "has_schema_privilege(role_name, schema_name, 'CREATE') AS create "
        "FROM (SELECT role_name, schema_name FROM unnest(%s::text[]) AS role_name "
        "CROSS JOIN unnest(ARRAY['public','django']::text[]) AS schema_name) checks "
        "ORDER BY schema_name, role_name",
        (list(ROLE_NAMES),),
    )
    result["table_grants"] = select_rows(
        "supabase",
        "SELECT table_schema AS schema, table_name AS table, grantee, privilege_type, is_grantable "
        "FROM information_schema.role_table_grants "
        "WHERE table_schema IN ('public','django','storage') "
        "AND grantee = ANY(%s) "
        "AND (table_schema <> 'public' OR table_name = ANY(%s)) "
        "ORDER BY table_schema, table_name, grantee, privilege_type",
        (list(ROLE_NAMES), list(APP_TABLES)),
    )

    hosted_route_results = run_directory / "P9_HOSTED_ROUTE_RESULTS.json"
    if hosted_route_results.is_file():
        hosted = json.loads(hosted_route_results.read_text(encoding="utf-8"))
        bucket_metadata = hosted.get("storage_bucket_metadata")
        result["storage"]["bucket_metadata_source"] = {
            "artifact": "P9_HOSTED_ROUTE_RESULTS.json",
            "http_status": bucket_metadata.get("http_status")
            if isinstance(bucket_metadata, dict)
            else None,
            "access_method": bucket_metadata.get("access_method")
            if isinstance(bucket_metadata, dict)
            else None,
        }
        if (
            hosted.get("project_ref") == project_ref
            and hosted.get("cleanup_ok") is True
            and isinstance(bucket_metadata, dict)
            and bucket_metadata.get("http_status") == 200
            and bucket_metadata.get("id") == "template-files"
        ):
            result["storage"]["buckets"] = [
                {
                    field: bucket_metadata.get(field)
                    for field in (
                        "id",
                        "name",
                        "public",
                        "file_size_limit",
                        "allowed_mime_types",
                    )
                }
            ]
            result["storage"]["bucket_metadata_source"] = (
                "P9_HOSTED_ROUTE_RESULTS.json: authenticated read-only Storage API GET; "
                "exact synthetic fixture cleanup passed"
            )
        else:
            result["unavailable_sections"].append(
                {
                    "section": "storage bucket privacy/limits",
                    "message": (
                        "The authenticated hosted route probe did not return verified bucket "
                        "metadata with successful fixture cleanup."
                    ),
                }
            )
    else:
        result["unavailable_sections"].append(
            {
                "section": "storage bucket privacy/limits",
                "message": "No P9 hosted route result with authenticated bucket metadata exists.",
            }
        )

    baseline_database = baseline["database"]
    baseline_storage = baseline["storage"]
    comparisons = {
        "public_application_objects": record_difference(
            baseline_database["public_application_objects"],
            result["public_application_objects"],
            ("name", "kind", "rls_enabled", "rls_forced"),
            ("name",),
        ),
        "public_columns": record_difference(
            baseline_database["public_columns"], result["public_columns"],
            ("table", "name", "type", "nullable", "default"),
            ("table", "name"),
        ),
        "public_constraints": record_difference(
            baseline_database["public_constraints"], result["public_constraints"],
            ("table", "name", "type", "definition"),
            ("table", "name"),
        ),
        "public_indexes": record_difference(
            baseline_database["public_indexes"], result["public_indexes"],
            ("table", "name", "definition"),
            ("table", "name"),
        ),
        "application_policies": record_difference(
            baseline_database["application_policies"], result["application_policies"],
            ("schema", "table", "name", "command", "roles", "using", "check"),
            ("schema", "table", "name"),
        ),
        "application_triggers": record_difference(
            baseline_database["application_triggers"], result["application_triggers"],
            ("table", "name", "definition"),
            ("table", "name"),
        ),
        "security_definer_functions": record_difference(
            baseline_database["security_definer_functions"],
            result["security_definer_functions"],
            ("name", "owner", "security_definer", "configuration"),
            ("name",),
        ),
        "roles": record_difference(
            baseline["roles"], result["roles"],
            ("name", "superuser", "bypassrls", "createdb", "createrole", "inherit", "login"),
            ("name",),
        ),
        "memberships": record_difference(
            baseline["memberships"], result["memberships"],
            ("role", "member", "admin_option", "inherit_option", "set_option"),
            ("role", "member"),
        ),
        "schema_privileges": record_difference(
            baseline["schema_privileges"],
            [row for row in result["schema_privileges"] if row["role"] != "service_role"],
            ("role", "schema", "usage", "create"),
            ("role", "schema"),
        ),
        "storage_buckets": (
            record_difference(
                baseline_storage["buckets"],
                result["storage"]["buckets"],
                ("id", "name", "public", "file_size_limit", "allowed_mime_types"),
                ("id",),
            )
            if result["storage"]["buckets"]
            else {
                "status": "unavailable",
                "baseline_count": len(baseline_storage["buckets"]),
                "current_count": 0,
                "reason": "Restricted authenticated read returned no bucket metadata row.",
            }
        ),
        "storage_policies": record_difference(
            baseline_storage["policies"], result["storage"]["policies"],
            ("schema", "table", "name", "command", "roles", "using", "check"),
            ("schema", "table", "name"),
        ),
        "storage_objects_security": record_difference(
            [baseline_storage["objects_security"]],
            [result["storage"]["objects_security"]],
            (
                "rls_enabled",
                "select_granted_to_authenticated",
                "insert_granted_to_authenticated",
                "update_granted_to_authenticated",
                "delete_granted_to_authenticated",
                "storage_usage_granted_to_authenticated",
            ),
            (),
        ),
    }
    result["comparison"] = comparisons
    aliases = result["runtime_aliases"]
    alias_ok = (
        aliases["default"]["connected"]["role"] == "django_app"
        and aliases["default"]["connected"]["schema"] == "django"
        and aliases["supabase"]["connected"]["role"] == "django_data"
        and aliases["supabase"]["connected"]["schema"] == "public"
    )
    result["runtime_aliases_status"] = "pass" if alias_ok else "drift"
    owners = {row["name"]: row["owner"] for row in result["public_application_objects"]}
    result["public_table_owners"] = owners
    result["public_table_ownership_status"] = (
        "pass"
        if set(owners) == set(APP_TABLES) and set(owners.values()) == {"postgres"}
        else "review"
    )
    roles = {row["name"]: row for row in result["roles"]}
    restricted_roles_ok = all(
        role in roles and not roles[role]["superuser"] and not roles[role]["bypassrls"]
        for role in ("django_app", "django_data")
    ) and bool(roles.get("authenticated")) and not roles["authenticated"]["bypassrls"]
    result["restricted_role_status"] = "pass" if restricted_roles_ok else "drift"
    result["status"] = (
        "passed"
        if alias_ok
        and result["public_table_ownership_status"] == "pass"
        and restricted_roles_ok
        and not result["unavailable_sections"]
        and all(row["status"] == "pass" for row in comparisons.values())
        else "drift_or_incomplete"
    )
    with output.open("x", encoding="utf-8") as evidence_file:
        evidence_file.write(json.dumps(result, indent=2, default=str) + "\n")
    print(json.dumps({"run_id": args.run_id, "status": result["status"], "output": str(output)}))
    return 0 if result["status"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
