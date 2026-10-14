"""Verify anonymous redirects for every protected application route."""

# ruff: noqa: E402 -- Configure Django before importing project-aware test classes.

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.test")
django_root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(django_root))

import django

django.setup()

from django.test import Client

PROTECTED_ROUTES = (
    "/dashboard",
    "/templates",
    "/scheduler",
    "/manage-schedules",
    "/scheduler-settings",
    "/AIVoiceAutoFill",
    "/filledtemplates",
    "/activitylog",
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", required=True)
    args = parser.parse_args()
    if not args.run_id.replace("-", "").replace("_", "").isalnum():
        parser.error("run-id may contain only letters, digits, underscores, and hyphens")

    root = Path(__file__).resolve().parents[3]
    output = (
        root
        / "docs"
        / "parity"
        / "evidence"
        / "p9"
        / args.run_id
        / "P9_ANONYMOUS_ROUTE_RESULTS.json"
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite evidence: {output}")
    results: dict[str, object] = {
        "run_id": args.run_id,
        "status": "running",
        "boundary": (
            "Django test client with config.settings.test; no fixture-auth middleware, "
            "database row, hosted request, or provider call."
        ),
        "routes": [],
    }
    routes: list[dict[str, object]] = []
    for route in PROTECTED_ROUTES:
        response = Client().get(route, HTTP_HOST="localhost")
        location = response.headers.get("Location", "")
        parsed = urlsplit(location)
        next_values = parse_qs(parsed.query).get("next", [])
        result = {
            "route": route,
            "status_code": response.status_code,
            "redirect_path": parsed.path,
            "next": next_values[0] if next_values else None,
            "cache_control": response.headers.get("Cache-Control"),
            "referrer_policy": response.headers.get("Referrer-Policy"),
        }
        routes.append(result)
        if not (
            response.status_code == 302
            and parsed.path in {"/login", "/login/"}
            and next_values == [route]
            and result["cache_control"] == "no-store"
            and result["referrer_policy"] == "same-origin"
        ):
            results["status"] = "failed"
            results["routes"] = routes
            with output.open("x", encoding="utf-8") as evidence:
                json.dump(results, evidence, indent=2)
                evidence.write("\n")
            return 1

    results["routes"] = routes
    results["status"] = "passed"
    with output.open("x", encoding="utf-8") as evidence:
        json.dump(results, evidence, indent=2)
        evidence.write("\n")
    summary = {"status": results["status"], "route_count": len(routes), "output": str(output)}
    print(json.dumps(summary))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
