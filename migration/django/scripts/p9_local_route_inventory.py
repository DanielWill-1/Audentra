"""Compare the route manifest and owner records with Django's local resolver."""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
DJANGO_ROOT = ROOT / "migration" / "django"
MANIFEST_PATH = ROOT / "docs" / "parity" / "route-manifest.json"
P6_OWNERSHIP_PATH = DJANGO_ROOT / "config" / "p6_route_ownership.json"
P7_OWNERSHIP_PATH = ROOT / "docs" / "pages" / "P7_ROUTE_OWNERSHIP.json"
OUTPUT_PATH = ROOT / "docs" / "parity" / "P9_ROUTE_OWNERSHIP.json"
RUN_ID = "p9-initial-readonly-20261013"


def read_json(path: Path) -> tuple[dict[str, Any], bytes]:
    payload = path.read_bytes()
    value = json.loads(payload)
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    return value, payload


def view_path(view: Any) -> str:
    return f"{view.__module__}.{view.__name__}"


def main() -> None:
    sys.path.insert(0, str(DJANGO_ROOT))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")

    import django

    django.setup()

    from django.urls import resolve

    manifest, manifest_bytes = read_json(MANIFEST_PATH)
    p6_inventory, _ = read_json(P6_OWNERSHIP_PATH)
    p7_inventory, _ = read_json(P7_OWNERSHIP_PATH)

    manifest_routes = manifest.get("routes", [])
    p6_routes = p6_inventory.get("routes", [])
    p7_routes = p7_inventory.get("routes", [])
    if not all(isinstance(rows, list) for rows in (manifest_routes, p6_routes, p7_routes)):
        raise ValueError("A route inventory is missing its routes list")

    manifest_by_path = {row["path"]: row for row in manifest_routes}
    p6_by_path = {row["path"]: row for row in p6_routes}
    p7_by_path = {row["path"]: row for row in p7_routes}
    expected_paths = set(manifest_by_path)
    if len(expected_paths) != 25:
        raise AssertionError(f"Expected 25 manifest paths, found {len(expected_paths)}")
    if set(p6_by_path) != expected_paths or set(p7_by_path) != expected_paths:
        raise AssertionError(
            "Manifest, P6 owner registry, and P7 route report have different paths"
        )

    manifest_digest = hashlib.sha256(manifest_bytes).hexdigest()
    if p6_inventory.get("source_manifest_sha256") != manifest_digest:
        raise AssertionError("P6 owner registry does not identify the current manifest digest")
    if p7_inventory.get("source_manifest_sha256") != manifest_digest:
        raise AssertionError("P7 route report does not identify the current manifest digest")

    routes: list[dict[str, str]] = []
    for path in manifest_by_path:
        manifest_row = manifest_by_path[path]
        p6_row = p6_by_path[path]
        p7_row = p7_by_path[path]
        if (
            manifest_row["category"] != p6_row["category"]
            or p6_row["category"] != p7_row["category"]
        ):
            raise AssertionError(f"Route category differs for {path}")
        if p6_row["owner"] != p7_row["owner"]:
            raise AssertionError(f"Route owner differs for {path}")

        match = resolve(path)
        resolved = view_path(match.func)
        if resolved != p7_row["django_view"]:
            raise AssertionError(
                f"Resolver view differs for {path}: {resolved} != {p7_row['django_view']}"
            )
        if match.url_name != p7_row["url_name"]:
            raise AssertionError(
                f"Resolver name differs for {path}: {match.url_name} != {p7_row['url_name']}"
            )

        routes.append(
            {
                "path": path,
                "category": manifest_row["category"],
                "owner": p6_row["owner"],
                "url_name": match.url_name or "",
                "django_view": resolved,
                "route_state": p7_row["route_state"],
            }
        )

    owner_counts: dict[str, int] = {}
    for route in routes:
        owner_counts[route["owner"]] = owner_counts.get(route["owner"], 0) + 1
    if owner_counts.get("legacy-fallback", 0) != 0:
        raise AssertionError("A manifest route is still assigned to a legacy fallback")

    result = {
        "run_id": RUN_ID,
        "status": "PASS — read-only manifest/registry/resolver reconciliation",
        "boundary": (
            "Local Django URL resolver under config.settings.test; "
            "no HTTP requests or hosted reads/writes."
        ),
        "source_manifest": "docs/parity/route-manifest.json",
        "source_manifest_sha256": manifest_digest,
        "p6_owner_registry": "migration/django/config/p6_route_ownership.json",
        "p7_route_report": "docs/pages/P7_ROUTE_OWNERSHIP.json",
        "route_count": len(routes),
        "owner_counts": owner_counts,
        "effective_fallback_count": owner_counts.get("legacy-fallback", 0),
        "routes": routes,
    }
    OUTPUT_PATH.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    evidence_path = (
        ROOT
        / "docs"
        / "parity"
        / "evidence"
        / "p9"
        / RUN_ID
        / "P9_ROUTE_OWNERSHIP.json"
    )
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(
        json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    summary = {"status": result["status"], "route_count": len(routes), "owner_counts": owner_counts}
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
