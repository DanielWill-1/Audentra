
from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
import platform
import re
import signal
import socket
import subprocess
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

from seed_parity import FIXTURE_STATE, REQUIRED_COLUMNS, SafetyError, load_parity_environment, validated_target

REPO_ROOT = Path(__file__).resolve().parents[3]
MANIFEST_PATH = REPO_ROOT / "docs" / "parity" / "route-manifest.json"
APP_PATH = REPO_ROOT / "src" / "App.tsx"
REPORT_ROOT = REPO_ROOT / "docs" / "parity" / "reports"
VIEWPORTS = {"desktop": (1440, 900), "mobile": (390, 844)}
ROUTE_PATTERN = re.compile(r'<Route\s+path="([^"]+)"')


def load_manifest(path: Path = MANIFEST_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def react_routes(path: Path = APP_PATH) -> list[str]:
    source = path.read_text(encoding="utf-8")
    return list(dict.fromkeys(ROUTE_PATTERN.findall(source)))


def manifest_errors(manifest: dict[str, Any], app_path: Path = APP_PATH) -> list[str]:
    errors: list[str] = []
    routes = manifest.get("routes")
    if not isinstance(routes, list):
        return ["routes must be a list"]

    paths = [route.get("path") for route in routes if isinstance(route, dict)]
    if len(paths) != len(routes):
        errors.append("every route entry must be an object")
    if len(paths) != len(set(paths)):
        errors.append("route paths must be unique")

    actual = set(react_routes(app_path))
    recorded = set(paths)
    if recorded != actual:
        errors.append(
            "route set differs from src/App.tsx "
            f"(missing={sorted(actual - recorded)}, extra={sorted(recorded - actual)})"
        )

    allowed_categories = {"public", "authentication", "application"}
    for route in routes:
        if not isinstance(route, dict):
            continue
        path = route.get("path", "<missing>")
        if route.get("category") not in allowed_categories:
            errors.append(f"{path}: invalid category")
        heading = route.get("page_heading")
        if not isinstance(heading, dict) or not heading.get("selector") or not heading.get("contains"):
            errors.append(f"{path}: route-specific heading assertion is required")
        if not isinstance(route.get("states"), list) or not route["states"]:
            errors.append(f"{path}: at least one capture state is required")

    return errors


def slug(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "-", value.strip("/").replace("/", "-") or "home").strip("-")


def git_revision() -> str | None:
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
            timeout=5,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return None


def git_worktree_dirty() -> bool | None:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
            timeout=5,
        )
        return bool(result.stdout.strip())
    except (OSError, subprocess.SubprocessError):
        return None


def runtime_versions() -> dict[str, str | None]:
    try:
        node_version = subprocess.run(
            ["node", "--version"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
            timeout=5,
        ).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        node_version = None
    return {
        "python": platform.python_version(),
        "playwright": importlib.metadata.version("playwright"),
        "pillow": importlib.metadata.version("Pillow"),
        "node": node_version,
    }


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def effective_vite_value(name: str) -> str:
    value = ""
    for filename in (".env", ".env.local", ".env.development", ".env.development.local"):
        path = REPO_ROOT / filename
        if not path.is_file():
            continue
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            match = re.match(r"^\s*" + re.escape(name) + r"\s*=\s*(.*?)\s*$", line)
            if match:
                value = match.group(1).strip().strip('"').strip("'")
    return os.environ.get(name, value)


def verify_browser_target() -> str:
    url, host = validated_target(dict(os.environ))
    try:
        vite_url = urllib.parse.urlsplit(effective_vite_value("VITE_SUPABASE_URL"))
    except ValueError:
        raise SafetyError("Vite's configured Supabase URL is invalid.") from None
    vite_anon = effective_vite_value("VITE_SUPABASE_ANON_KEY")
    parity_anon = os.environ.get("PARITY_SUPABASE_ANON_KEY", "")
    target_url = urllib.parse.urlsplit(url)

    def origin(parsed: urllib.parse.SplitResult) -> tuple[str, str, int] | None:
        if not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            return None
        if parsed.path not in {"", "/"}:
            return None
        try:
            port = parsed.port
        except ValueError:
            return None
        port = port or (443 if parsed.scheme.lower() == "https" else 80)
        return parsed.scheme.lower(), parsed.hostname.lower(), port

    if origin(vite_url) != origin(target_url) or target_url.hostname.lower() != host:
        raise SafetyError("Vite's configured Supabase origin does not match the approved parity target.")
    if not vite_anon or not parity_anon or vite_anon != parity_anon:
        raise SafetyError("Vite's anon key must match PARITY_SUPABASE_ANON_KEY; values are never printed.")
    return host


def fixture_ready() -> tuple[bool, str]:
    if not FIXTURE_STATE.is_file():
        return False, "Synthetic Supabase fixtures are not seeded."
    try:
        ledger = json.loads(FIXTURE_STATE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return False, "The fixture ID ledger is unreadable."
    try:
        target_url, target_host = validated_target(dict(os.environ))
    except SafetyError:
        return False, "The approved parity Supabase target is not configured."
    if (
        ledger.get("target_kind") != os.environ.get("PARITY_TARGET_KIND", "").strip().lower()
        or ledger.get("host") != target_host
        or ledger.get("target_url") != target_url
    ):
        return False, "The fixture ID ledger belongs to a different parity target."
    if ledger.get("user_id") != os.environ.get("PARITY_TEST_USER_ID"):
        return False, "The fixture ID ledger does not match the selected synthetic test account."
    created = ledger.get("created", [])
    run_id = ledger.get("run_id")
    storage_objects = ledger.get("storage_objects", [])
    if not isinstance(created, list) or not isinstance(storage_objects, list) or not isinstance(run_id, str):
        return False, "The fixture ID ledger does not record verified schema and seeded rows."
    created_tables = {
        item.get("table") for item in created
        if isinstance(item, dict) and isinstance(item.get("table"), str)
    }
    has_storage_fixture = any(
        isinstance(item, dict)
        and item.get("bucket") == "template-files"
        and isinstance(item.get("path"), str)
        and item.get("path", "").startswith(f"parity/{run_id}/")
        for item in storage_objects
    )
    if (
        not ledger.get("schema_preflight_passed")
        or created_tables != set(REQUIRED_COLUMNS)
        or len(created) != len(REQUIRED_COLUMNS)
        or not has_storage_fixture
    ):
        return False, "The fixture ID ledger does not record verified schema and seeded rows."
    return True, ""


def is_reachable(base_url: str, timeout: float = 1.0) -> bool:
    parsed = urllib.parse.urlsplit(base_url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        raise SafetyError("PARITY_BASE_URL must point to the local legacy development server.")
    try:
        with socket.create_connection((parsed.hostname, parsed.port or 80), timeout=timeout):
            return True
    except OSError:
        return False


def start_vite(base_url: str) -> subprocess.Popen[Any] | None:
    if is_reachable(base_url):
        return None

    if os.name == "nt":
        command: Any = "npm.cmd run dev -- --host 127.0.0.1 --strictPort"
        process = subprocess.Popen(
            command,
            cwd=REPO_ROOT,
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
        )
    else:
        process = subprocess.Popen(
            ["npm", "run", "dev", "--", "--host", "127.0.0.1", "--strictPort"],
            cwd=REPO_ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )

    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("Vite exited before the local app became reachable.")
        if is_reachable(base_url):
            return process
        time.sleep(0.5)
    stop_vite(process)
    raise RuntimeError("Vite did not become reachable within 45 seconds.")


def stop_vite(process: subprocess.Popen[Any] | None) -> None:
    if process is None or process.poll() is not None:
        return
    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(process.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
            timeout=10,
        )
    else:
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=8)
        except (OSError, subprocess.TimeoutExpired):
            process.kill()
            process.wait(timeout=5)


def local_storage_setup(capture_time: str | None = None) -> str:
    fixture_path = REPO_ROOT / "migration" / "parity" / "fixtures" / "scenarios.json"
    fixtures = json.loads(fixture_path.read_text(encoding="utf-8"))
    storage = fixtures.get("local_storage", {})
    if capture_time and storage.get("recentActivity"):
        anchor = datetime.fromisoformat(capture_time)
        for index, item in enumerate(storage["recentActivity"], start=2):
            item["time"] = (anchor - timedelta(hours=index)).isoformat()
    encoded = json.dumps(storage, separators=(",", ":"))
    return (
        "const entries = " + encoded + ";"
        "for (const [key, value] of Object.entries(entries)) {"
        "window.localStorage.setItem(key, JSON.stringify(value));"
        "}"
    )


def sign_in(page: Page, base_url: str) -> None:
    email = os.environ.get("PARITY_TEST_EMAIL", "")
    password = os.environ.get("PARITY_TEST_PASSWORD", "")
    if not email or not password:
        raise SafetyError("Synthetic PARITY_TEST_EMAIL/PARITY_TEST_PASSWORD are missing.")
    page.goto(base_url + "/login", wait_until="domcontentloaded", timeout=25000)
    page.locator('input[type="email"]').fill(email)
    page.locator('input[type="password"]').fill(password)
    page.locator("form button[type=submit]").click()
    page.wait_for_url(re.compile(r".*/dashboard/?$"), timeout=20000)


def wait_for_render(page: Page) -> None:
    try:
        page.wait_for_load_state("networkidle", timeout=5000)
    except Exception:
        pass
    try:
        page.evaluate("() => document.fonts.ready")
        page.wait_for_function(
            "() => Array.from(document.images).every(image => image.complete)",
            timeout=7000,
        )
    except Exception:
        pass


def assert_heading(page: Page, route: dict[str, Any]) -> None:
    assertion = route["page_heading"]
    name = re.compile(re.escape(assertion["contains"]), re.IGNORECASE)
    page.get_by_role("heading", name=name, level=1).wait_for(state="visible", timeout=18000)


def capture_state(
    browser: Browser,
    *,
    state: str,
    routes: list[dict[str, Any]],
    viewport_name: str,
    run_time: str,
    base_url: str,
    output_dir: Path,
    report: dict[str, Any],
) -> None:
    width, height = VIEWPORTS[viewport_name]
    context: BrowserContext = browser.new_context(
        viewport={"width": width, "height": height},
        locale="en-US",
        timezone_id="UTC",
        color_scheme="light",
        reduced_motion="reduce",
    )
    context.set_default_timeout(10000)
    context.add_init_script(local_storage_setup(run_time))
    try:
        page = context.new_page()
        page.clock.install(time=datetime.fromisoformat(run_time))
        browser_events: list[dict[str, str]] = []
        page.on("pageerror", lambda error: browser_events.append({"kind": "page_error", "class": type(error).__name__}))
        page.on("console", lambda message: browser_events.append({"kind": "console_error", "class": "ConsoleMessage"}) if message.type == "error" else None)
        page.on("requestfailed", lambda request: browser_events.append({"kind": "request_failed", "class": "RequestFailure", "resource_type": request.resource_type}))
        if state == "authenticated-application":
            sign_in(page, base_url)

        for route in routes:
            path = route["path"]
            result: dict[str, Any] = {
                "route": path,
                "state": state,
                "viewport": viewport_name,
                "status": "captured",
            }
            for attempt in range(1, 4):
                event_start = len(browser_events)
                try:
                    response = page.goto(base_url + path, wait_until="domcontentloaded", timeout=25000)
                    if response is None or response.status >= 400:
                        raise RuntimeError("navigation response unavailable or unsuccessful")
                    wait_for_render(page)
                    if state in {"anonymous-public", "anonymous-authentication", "authenticated-application"}:
                        assert_heading(page, route)
                    result["visible_h1"] = (
                        page.locator("h1").first.inner_text(timeout=1000).strip()[:160]
                        if page.locator("h1").count() else None
                    )
                    filename = output_dir / "screenshots" / state / viewport_name / (slug(path) + ".png")
                    filename.parent.mkdir(parents=True, exist_ok=True)
                    page.screenshot(path=str(filename), full_page=True, animations="disabled")
                    result["screenshot"] = filename.relative_to(REPO_ROOT).as_posix()
                    break
                except SafetyError:
                    raise
                except Exception as exc:
                    if attempt == 3:
                        result.update(status="failed", reason=type(exc).__name__)
                    else:
                        time.sleep(0.5 * attempt)
            if len(browser_events) > event_start:
                result["browser_events"] = browser_events[event_start:]
            report["captures"].append(result)
    finally:
        context.close()


def main() -> int:
    load_parity_environment()
    parser = argparse.ArgumentParser(description="Capture the P1 legacy route/state matrix.")
    parser.add_argument("--base-url", default=os.environ.get("PARITY_BASE_URL", "http://127.0.0.1:5173"))
    parser.add_argument("--run-id", default=os.environ.get("PARITY_RUN_ID"))
    parser.add_argument("--viewports", nargs="+", choices=sorted(VIEWPORTS), default=list(VIEWPORTS))
    parser.add_argument("--states", nargs="+", choices=[
        "anonymous-public", "anonymous-authentication", "anonymous-application",
        "authenticated-application",
    ], default=[
        "anonymous-public", "anonymous-authentication", "anonymous-application",
        "authenticated-application",
    ])
    args = parser.parse_args()

    manifest = load_manifest()
    errors = manifest_errors(manifest)
    if errors:
        print(json.dumps({"status": "invalid_manifest", "errors": errors}, sort_keys=True))
        return 1

    run_time = os.environ.get("PARITY_CAPTURE_TIME", now_iso())
    run_id = args.run_id or datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", run_id):
        print("capture blocked: run ID contains unsupported characters.")
        return 2
    output_dir = REPORT_ROOT / run_id
    output_dir.mkdir(parents=True, exist_ok=False)
    report: dict[str, Any] = {
        "run_id": run_id,
        "started_at": run_time,
        "source_revision": git_revision(),
        "source_worktree_dirty": git_worktree_dirty(),
        "manifest_status": manifest.get("status"),
        "q18_visual_threshold_status": manifest.get("decisions", {}).get("Q18", {}).get("status"),
        "q21_status": manifest.get("decisions", {}).get("Q21", {}).get("status"),
        "environment_class": os.environ.get("PARITY_TARGET_KIND", "unconfigured"),
        "runtime_versions": runtime_versions(),
        "viewport_sizes": {name: list(VIEWPORTS[name]) for name in args.viewports},
        "captures": [],
        "blocked": [],
    }
    required_states = {state for route in manifest["routes"] for state in route["states"]}
    if set(args.states) != required_states:
        report["blocked"].append("A partial state selection cannot satisfy the full P1 capture matrix.")
    if set(args.viewports) != set(VIEWPORTS):
        report["blocked"].append("A partial viewport selection cannot satisfy the full P1 capture matrix.")
    if FIXTURE_STATE.is_file():
        try:
            report["fixture_revision"] = json.loads(FIXTURE_STATE.read_text(encoding="utf-8")).get("run_id")
        except (OSError, json.JSONDecodeError):
            report["blocked"].append("Fixture revision could not be read from the local fixture ledger.")

    base_url = args.base_url.rstrip("/")
    auth_requested = "authenticated-application" in args.states
    try:
        if auth_requested:
            verify_browser_target()
            is_seeded, reason = fixture_ready()
            if not is_seeded:
                report["blocked"].append(reason)
    except SafetyError as exc:
        report["blocked"].append(str(exc))

    selected = {
        state: [route for route in manifest["routes"] if state in route["states"]]
        for state in args.states
    }
    process: subprocess.Popen[Any] | None = None
    try:
        process = start_vite(base_url)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            report["browser_version"] = browser.version
            try:
                for viewport_name in args.viewports:
                    for state in args.states:
                        routes = selected[state]
                        if state == "authenticated-application" and report["blocked"]:
                            report["blocked"].append(
                                f"{len(routes)} authenticated routes x {viewport_name} blocked by missing P1 inputs."
                            )
                            continue
                        if not routes:
                            continue
                        try:
                            capture_state(
                                browser,
                                state=state,
                                routes=routes,
                                viewport_name=viewport_name,
                                run_time=run_time,
                                base_url=base_url,
                                output_dir=output_dir,
                                report=report,
                            )
                        except SafetyError as exc:
                            report["blocked"].append(str(exc))
                        except Exception as exc:
                            report["blocked"].append(
                                f"{state} at {viewport_name} could not be prepared ({type(exc).__name__})."
                            )
            finally:
                browser.close()
    except Exception as exc:
        report["blocked"].append(f"Local browser/app capture could not start ({type(exc).__name__}).")
    finally:
        stop_vite(process)

    if manifest.get("status") != "accepted":
        report["blocked"].append("The route manifest is provisional.")
    if report["q18_visual_threshold_status"] != "accepted":
        report["blocked"].append("Q18 visual thresholds and masks are not approved.")
    if report["q21_status"] != "accepted":
        report["blocked"].append("Q21 must be recorded before the route manifest is frozen.")

    failures = sum(item.get("status") == "failed" for item in report["captures"])
    expected_matrix = {
        (route["path"], state, viewport)
        for route in manifest["routes"]
        for state in route["states"]
        for viewport in VIEWPORTS
    }
    attempted_matrix = {
        (item["route"], item["state"], item["viewport"])
        for item in report["captures"]
    }
    unattempted_matrix = sorted(expected_matrix - attempted_matrix)
    report["matrix_coverage"] = {
        "expected": len(expected_matrix),
        "attempted": len(attempted_matrix & expected_matrix),
        "captured": sum(item.get("status") == "captured" for item in report["captures"]),
        "failed": failures,
        "unattempted": [list(item) for item in unattempted_matrix],
    }
    if unattempted_matrix:
        report["blocked"].append("The full route/state/viewport capture matrix was not attempted.")
    report["status"] = "blocked" if report["blocked"] else ("failed" if failures else "captured")
    report["failed_captures"] = failures
    report["completed_at"] = now_iso()
    report_path = output_dir / "report.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "report": report_path.relative_to(REPO_ROOT).as_posix(),
        "captured": sum(item.get("status") == "captured" for item in report["captures"]),
        "failed": failures,
        "matrix_coverage": report["matrix_coverage"],
        "blocked_reasons": report["blocked"],
    }, sort_keys=True))
    return 0 if report["status"] == "captured" else (1 if failures else 2)


if __name__ == "__main__":
    raise SystemExit(main())
