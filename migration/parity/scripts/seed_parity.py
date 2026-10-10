
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_STATE = REPO_ROOT / "migration" / "parity" / ".state" / "fixture-ids.json"

REQUIRED_COLUMNS = {
    "templates": {"id", "name", "category", "form_data", "created_by"},
    "template_shares": {
        "id", "template_id", "user_email", "user_name", "role", "shared_by", "shared_at"
    },
    "template_reviews": {
        "id", "template_id", "reviewer_id", "reviewer_name", "reviewer_email", "rating", "status"
    },
    "scheduled_events": {"id", "title", "date", "time", "created_by"},
    "filled_templates": {"id", "user_id", "template_name", "form_data"},
}
OWNER_COLUMNS = {
    "templates": "created_by",
    "template_shares": "shared_by",
    "template_reviews": "reviewer_id",
    "scheduled_events": "created_by",
    "filled_templates": "user_id",
}


class SafetyError(ValueError):
    pass


def load_parity_environment(path: Path | None = None, env: dict[str, str] | None = None) -> None:
    """Load literal PARITY_ settings privately; explicit process values take priority."""
    target = os.environ if env is None else env
    path = path or REPO_ROOT / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        name, separator, value = line.strip().partition("=")
        name = name.strip()
        if separator and name.startswith("PARITY_") and name.replace("_", "").isalnum():
            target.setdefault(name, value.strip().strip('"').strip("'"))


def validated_target(env: dict[str, str]) -> tuple[str, str]:
    raw_url = env.get("PARITY_SUPABASE_URL", "").strip()
    kind = env.get("PARITY_TARGET_KIND", "").strip().lower()
    if kind not in {"local", "staging"}:
        raise SafetyError("Set PARITY_TARGET_KIND to local or staging.")

    try:
        parsed = urllib.parse.urlsplit(raw_url)
    except ValueError:
        raise SafetyError("PARITY_SUPABASE_URL is invalid.") from None
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise SafetyError("PARITY_SUPABASE_URL must be an HTTP(S) origin without embedded credentials.")
    try:
        parsed.port
    except ValueError:
        raise SafetyError("PARITY_SUPABASE_URL must use a valid port.") from None
    if parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
        raise SafetyError("PARITY_SUPABASE_URL must be an origin without a path, query or fragment.")

    host = parsed.hostname.lower()
    if kind == "local" and host not in {"localhost", "127.0.0.1", "::1", "host.docker.internal"}:
        raise SafetyError("Local fixture writes are restricted to loopback or host.docker.internal.")
    if kind == "staging":
        allowed = {value.strip().lower() for value in env.get("PARITY_ALLOWED_SUPABASE_HOSTS", "").split(",") if value.strip()}
        if not host.endswith(".supabase.co") or host not in allowed:
            raise SafetyError("Staging host must exactly match PARITY_ALLOWED_SUPABASE_HOSTS.")

    return raw_url.rstrip("/"), host


def probe_schema(url: str, service_key: str, timeout: float = 12) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{url}/rest/v1/",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/openapi+json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise SafetyError(f"Schema probe failed ({type(exc).__name__}); response content was suppressed.") from None

    schemas = payload.get("definitions", {})
    if not schemas:
        schemas = payload.get("components", {}).get("schemas", {})
    discovered: dict[str, set[str]] = {}
    for table, definition in schemas.items():
        properties = definition.get("properties", {}) if isinstance(definition, dict) else {}
        if isinstance(properties, dict):
            discovered[table.split(".")[-1]] = set(properties)
    return {name: discovered.get(name, set()) for name in REQUIRED_COLUMNS}


def request_json(
    url: str,
    service_key: str,
    *,
    method: str = "GET",
    payload: Any = None,
    content_type: str = "application/json",
    timeout: float = 15,
) -> Any:
    data = payload if isinstance(payload, bytes) else (
        json.dumps(payload, separators=(",", ":")).encode("utf-8") if payload is not None else None
    )
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": content_type,
            "Accept": "application/json",
            "Prefer": "return=representation",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
            if not raw:
                return None
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return raw
    except urllib.error.HTTPError as exc:
        raise SafetyError(f"Supabase request failed with HTTP {exc.code}; response content was suppressed.") from None
    except (urllib.error.URLError, TimeoutError) as exc:
        raise SafetyError(f"Supabase request failed ({type(exc).__name__}); response content was suppressed.") from None


def verify_storage_bucket(url: str, service_key: str) -> None:
    buckets = request_json(f"{url}/storage/v1/bucket", service_key)
    if not isinstance(buckets, list) or not any(
        isinstance(bucket, dict) and bucket.get("id") == "template-files" for bucket in buckets
    ):
        raise SafetyError("The template-files Storage bucket is not verified on this isolated target.")


def write_ledger(ledger: dict[str, Any]) -> None:
    FIXTURE_STATE.parent.mkdir(parents=True, exist_ok=True)
    temporary = FIXTURE_STATE.with_suffix(".tmp")
    temporary.write_text(json.dumps(ledger, indent=2, sort_keys=True), encoding="utf-8")
    temporary.replace(FIXTURE_STATE)


def schema_gaps(discovered: dict[str, set[str]]) -> dict[str, list[str]]:
    gaps: dict[str, list[str]] = {}
    for table, required in REQUIRED_COLUMNS.items():
        missing = sorted(required - discovered.get(table, set()))
        if missing:
            gaps[table] = missing
    return gaps


def main() -> int:
    load_parity_environment()
    parser = argparse.ArgumentParser(description="Safely check P1 fixture target/schema.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="read-only target/schema preflight")
    mode.add_argument("--apply", action="store_true", help="seed synthetic fixtures in an approved target")
    mode.add_argument("--cleanup", action="store_true", help="delete only fixture IDs recorded by this seeder")
    args = parser.parse_args()

    try:
        url, host = validated_target(dict(os.environ))
        service_key = os.environ.get("PARITY_SUPABASE_SERVICE_ROLE_KEY", "")
        if not service_key:
            raise SafetyError("PARITY_SUPABASE_SERVICE_ROLE_KEY is missing.")
        if args.apply or args.cleanup:
            required = {
                "PARITY_ALLOW_FIXTURE_WRITES": "I_CONFIRM_ISOLATED_TEST_DATA",
                "PARITY_TEST_USER_ID": None,
                "PARITY_TEST_EMAIL": None,
            }
            for name, expected in required.items():
                value = os.environ.get(name, "")
                if not value or (expected and value != expected):
                    raise SafetyError(f"Fixture write gate is not satisfied: {name}.")
            if not os.environ["PARITY_TEST_EMAIL"].lower().endswith("@example.test"):
                raise SafetyError("Fixture account email must use the reserved example.test domain.")

        if args.cleanup:
            return cleanup(url, host, service_key)

        discovered = probe_schema(url, service_key)
        gaps = schema_gaps(discovered)
        summary = {table: sorted(columns) for table, columns in discovered.items()}
        print(json.dumps({"target_kind": os.environ["PARITY_TARGET_KIND"], "host": host, "schema": summary}, sort_keys=True))
        if gaps:
            print(json.dumps({"status": "blocked_schema_unverified", "missing": gaps}, sort_keys=True))
            return 2
        if args.check:
            verify_storage_bucket(url, service_key)
            print("Schema preflight passed. No rows or storage objects were written.")
            return 0
        verify_storage_bucket(url, service_key)
        return apply_fixtures(url, host, service_key, discovered)
    except SafetyError as exc:
        print(f"fixture setup blocked: {exc}")
        return 2


def apply_fixtures(url: str, host: str, service_key: str, discovered: dict[str, set[str]]) -> int:
    user_id = os.environ["PARITY_TEST_USER_ID"]
    email = os.environ["PARITY_TEST_EMAIL"]
    try:
        uuid.UUID(user_id)
    except ValueError:
        print("fixture setup blocked: PARITY_TEST_USER_ID must be a UUID.")
        return 2
    if FIXTURE_STATE.exists():
        print("fixture setup blocked: clean the prior fixture run with --cleanup first.")
        return 2

    run_id = uuid.uuid4().hex
    user_name = "P1 Synthetic User"
    template_name = f"P1 Fixture {run_id}"
    today = date.today().isoformat()
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    field_data = {
        "title": template_name,
        "description": "Synthetic parity fixture.",
        "fields": [{"name": "organization", "label": "Organization", "type": "text"}],
    }
    payloads = [
        ("templates", {
            "name": template_name,
            "category": "healthcare",
            "description": "Synthetic parity fixture.",
            "form_data": field_data,
            "visibility": "visible",
            "created_by": user_id,
        }),
        ("template_shares", {
            "template_id": None,
            "user_id": user_id,
            "user_email": email,
            "user_name": user_name,
            "role": "viewer",
            "shared_by": user_id,
            "shared_at": now,
            "message": "Synthetic P1 fixture.",
        }),
        ("template_reviews", {
            "template_id": None,
            "reviewer_id": user_id,
            "reviewer_name": user_name,
            "reviewer_email": email,
            "rating": 5,
            "comment": "Synthetic P1 fixture.",
            "status": "pending",
            "created_at": now,
            "updated_at": now,
        }),
        ("scheduled_events", {
            "title": template_name,
            "description": "Synthetic P1 fixture.",
            "date": today,
            "time": "12:00:00",
            "duration": 30,
            "type": "training",
            "priority": "low",
            "attendees": [],
            "location": "Synthetic fixture",
            "reminder_minutes": 0,
            "status": "scheduled",
            "created_by": user_id,
        }),
        ("filled_templates", {
            "user_id": user_id,
            "template_name": template_name,
            "form_data": {"organization": "Synthetic Example Clinic"},
        }),
    ]
    ledger: dict[str, Any] = {
        "run_id": run_id,
        "target_kind": os.environ["PARITY_TARGET_KIND"].strip().lower(),
        "host": host,
        "target_url": url,
        "user_id": user_id,
        "schema_preflight_passed": True,
        "created": [],
        "storage_objects": [],
    }
    write_ledger(ledger)
    try:
        template_id = None
        for table, original in payloads:
            payload = dict(original)
            if table in {"template_shares", "template_reviews"}:
                payload["template_id"] = template_id
            available = discovered[table]
            row = {key: value for key, value in payload.items() if key in available}
            endpoint = f"{url}/rest/v1/{urllib.parse.quote(table)}"
            result = request_json(endpoint, service_key, method="POST", payload=[row])
            if not isinstance(result, list) or len(result) != 1 or not isinstance(result[0], dict):
                raise SafetyError(f"Fixture insert for {table} returned no row ID.")
            record_id = result[0].get("id")
            if not record_id:
                raise SafetyError(f"Fixture insert for {table} returned no row ID.")
            ledger["created"].append({
                "table": table,
                "id": str(record_id),
                "owner_column": OWNER_COLUMNS[table],
                "owner_value": user_id,
            })
            write_ledger(ledger)
            if table == "templates":
                template_id = record_id

        object_path = f"parity/{run_id}/fixture.txt"
        object_endpoint = (
            f"{url}/storage/v1/object/template-files/"
            + urllib.parse.quote(object_path, safe="/")
        )
        request_json(
            object_endpoint,
            service_key,
            method="POST",
            payload=b"Synthetic P1 storage fixture. No personal data.",
            content_type="text/plain",
        )
        ledger["storage_objects"].append({
            "bucket": "template-files",
            "path": object_path,
        })
        write_ledger(ledger)
    except SafetyError as exc:
        print(f"fixture insert failed: {exc}")
        print("Removing only rows and objects recorded in the fixture ID ledger.")
        cleanup(url, host, service_key)
        return 2

    print(json.dumps({
        "status": "seeded",
        "run_id": run_id,
        "table_rows": len(ledger["created"]),
        "storage_objects": len(ledger["storage_objects"]),
        "ledger": str(FIXTURE_STATE.relative_to(REPO_ROOT)).replace("\\", "/"),
    }, sort_keys=True))
    return 0


def cleanup(url: str, host: str, service_key: str) -> int:
    if not FIXTURE_STATE.is_file():
        print("No fixture ID ledger exists; nothing was deleted.")
        return 0
    try:
        ledger = json.loads(FIXTURE_STATE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        print("Cleanup blocked: the fixture ID ledger is unreadable; no deletions were attempted.")
        return 2
    if (
        ledger.get("target_kind") != os.environ.get("PARITY_TARGET_KIND", "").strip().lower()
        or ledger.get("host") != host
        or ledger.get("target_url") != url
    ):
        print("Cleanup blocked: the fixture ledger belongs to a different target; no deletions were attempted.")
        return 2
    if ledger.get("user_id") != os.environ.get("PARITY_TEST_USER_ID"):
        print("Cleanup blocked: the ledger does not match PARITY_TEST_USER_ID; no deletions were attempted.")
        return 2
    run_id = ledger.get("run_id")
    try:
        uuid.UUID(str(run_id))
    except (ValueError, TypeError):
        print("Cleanup blocked: the fixture run ID is invalid; no deletions were attempted.")
        return 2
    try:
        for item in ledger.get("storage_objects", []):
            if item.get("bucket") != "template-files" or not item.get("path", "").startswith(f"parity/{run_id}/"):
                raise SafetyError("fixture storage path is outside the recorded run")
            path = urllib.parse.quote(item["path"], safe="/")
            request_json(
                f"{url}/storage/v1/object/{urllib.parse.quote(item['bucket'])}/{path}",
                service_key,
                method="DELETE",
            )
        for item in reversed(ledger.get("created", [])):
            table = item.get("table")
            if table not in OWNER_COLUMNS or item.get("owner_column") != OWNER_COLUMNS[table]:
                raise SafetyError("fixture row is outside the supported table/owner scope")
            if item.get("owner_value") != ledger.get("user_id") or not item.get("id"):
                raise SafetyError("fixture row is outside the recorded synthetic user scope")
            query = urllib.parse.urlencode({
                "id": f"eq.{item['id']}",
                item["owner_column"]: f"eq.{item['owner_value']}",
            })
            request_json(
                f"{url}/rest/v1/{urllib.parse.quote(item['table'])}?{query}",
                service_key,
                method="DELETE",
            )
        FIXTURE_STATE.unlink()
    except (SafetyError, AttributeError, KeyError, TypeError) as exc:
        print(f"Cleanup incomplete ({type(exc).__name__}); the fixture ID ledger is retained.")
        return 2
    print("Removed only this run's recorded fixture IDs and storage objects.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
