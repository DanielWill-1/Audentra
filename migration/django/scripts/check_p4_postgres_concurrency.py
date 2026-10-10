"""Bounded live-PostgreSQL check for P4 session refresh/logout serialization.

This script inserts uniquely generated rows only in django.django_session,
uses a loopback fake GoTrue server, and deletes only those rows in finally.
It refuses SQLite and any role/schema other than the P2 django_app boundary.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from time import sleep, time
from types import SimpleNamespace
from typing import Any
from urllib.parse import urlsplit
from uuid import UUID

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _bootstrap_django() -> tuple[str, type[Any], type[Any], type[Any], Any]:
    import django

    django.setup()

    from apps.accounts.services.tokens import AUTH_SESSION_KEY
    from apps.accounts.sessions import SessionStore
    from django.contrib.sessions.backends.base import UpdateError
    from django.contrib.sessions.models import Session
    from django.db import connections

    return AUTH_SESSION_KEY, SessionStore, UpdateError, Session, connections


AUTH_SESSION_KEY, SessionStore, UpdateError, Session, connections = _bootstrap_django()

SUBJECT = "00000000-0000-4000-8000-000000000001"
EMAIL = "p4-postgres-probe@example.test"
USER_PAYLOAD = {
    "id": SUBJECT,
    "email": EMAIL,
    "user_metadata": {},
    "app_metadata": {},
    "aud": "authenticated",
    "created_at": "2026-10-10T00:00:00Z",
}
SCRIPT = Path(__file__).resolve()


@dataclass
class FakeAuthState:
    condition: threading.Condition = field(default_factory=threading.Condition)
    arrivals: dict[str, int] = field(default_factory=dict)
    refreshes: int = 0
    logouts: int = 0


class FakeAuthHandler(BaseHTTPRequestHandler):
    server_version = "P4PostgresProbe/1"
    sys_version = ""

    def log_message(self, _format: str, *_args: object) -> None:
        return

    @property
    def state(self) -> FakeAuthState:
        return self.server.state  # type: ignore[attr-defined,no-any-return]

    def _send(self, status: int, payload: object | None = None) -> None:
        body = b"" if payload is None else json.dumps(payload).encode("utf-8")
        self.send_response(status)
        if body:
            self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlsplit(self.path)
        if parsed.path == "/barrier":
            label = parsed.query
            state = self.state
            with state.condition:
                state.arrivals[label] = state.arrivals.get(label, 0) + 1
                state.condition.notify_all()
                released = state.condition.wait_for(
                    lambda: state.arrivals.get(label, 0) >= 2, timeout=12
                )
            self._send(200 if released else 503, {"ready": released})
            return
        if parsed.path == "/auth/v1/user":
            self._send(200, USER_PAYLOAD)
            return
        self._send(404, {"message": "not found"})

    def do_POST(self) -> None:
        parsed = urlsplit(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        if length > 16_000:
            self._send(413, {"message": "too large"})
            return
        self.rfile.read(length)
        if parsed.path == "/auth/v1/token" and "grant_type=refresh_token" in parsed.query:
            state = self.state
            with state.condition:
                state.refreshes += 1
                sequence = state.refreshes
            sleep(0.35)
            self._send(
                200,
                {
                    "access_token": f"p4-postgres-access-{sequence}",
                    "refresh_token": f"p4-postgres-refresh-{sequence}",
                    "expires_in": 3600,
                    "token_type": "bearer",
                    "user": USER_PAYLOAD,
                },
            )
            return
        if parsed.path == "/auth/v1/logout":
            with self.state.condition:
                self.state.logouts += 1
            self._send(204)
            return
        self._send(404, {"message": "not found"})


def _verify_database_boundary() -> None:
    connection = connections["default"]
    if connection.vendor != "postgresql":
        raise RuntimeError("Refusing the PostgreSQL probe: default database is not PostgreSQL.")
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT current_user, current_schema(), current_setting('search_path'), "
            "to_regclass('django.django_session') IS NOT NULL"
        )
        role, schema, search_path, session_table = cursor.fetchone()
    if role != "django_app" or schema != "django" or not session_table:
        raise RuntimeError("Refusing the probe: database role/schema/session-table check failed.")
    if "django" not in search_path.split(",") and "django" not in search_path:
        raise RuntimeError("Refusing the probe: django is not in the session database search path.")


def _new_session(*, expires_soon: bool) -> str:
    now = int(time())
    store = SessionStore()
    store[AUTH_SESSION_KEY] = {
        "version": 1,
        "subject": SUBJECT,
        "email": EMAIL,
        "user_metadata": {},
        "access_token": "p4-postgres-initial-access",
        "refresh_token": "p4-postgres-initial-refresh",
        "access_expires_at": now - 10 if expires_soon else now + 3600,
        "absolute_expires_at": now + 3600,
        "remember_me": False,
        "generation": 1,
    }
    store.set_expiry(3600)
    store.create()
    if not store.session_key:
        raise RuntimeError("Could not create a unique synthetic session row.")
    return store.session_key


def _run_workers(label: str, session_key: str, url: str, modes: tuple[str, str]) -> None:
    env = os.environ.copy()
    env["P4_PROBE_URL"] = url
    children = [
        subprocess.Popen(
            [sys.executable, str(SCRIPT), "--worker", mode, session_key, label],
            cwd=SCRIPT.parents[1],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        for mode in modes
    ]
    failed = False
    for child in children:
        try:
            output, _ = child.communicate(timeout=20)
        except subprocess.TimeoutExpired:
            child.kill()
            child.communicate()
            failed = True
            continue
        if child.returncode != 0 or "P4_WORKER_OK" not in output:
            failed = True
    if failed:
        raise RuntimeError(
            f"Independent-process P4 {label} probe failed; worker output suppressed."
        )


def _worker(mode: str, session_key: str, label: str) -> int:
    from urllib.request import urlopen as open_url

    from apps.accounts.services.gotrue import GoTrueClient
    from apps.accounts.services.tokens import authenticate_session, logout_session
    from django.test import override_settings as override

    base_url = os.environ["P4_PROBE_URL"]
    store = SessionStore(session_key=session_key)
    loaded = store.load()
    if not isinstance(loaded.get(AUTH_SESSION_KEY), dict):
        return 2
    with open_url(f"{base_url}/barrier?{label}", timeout=14) as response:
        if response.status != 200:
            return 3
    request = SimpleNamespace(session=store)
    with override(
        SUPABASE_URL=base_url,
        SUPABASE_PUBLISHABLE_KEY="sb_publishable_p4_local_probe",
        AUTH_TIMEOUT_SECONDS=5,
    ):
        if mode == "auth":
            principal = authenticate_session(request, client=GoTrueClient())
            if principal is not None and principal.id != UUID(SUBJECT):
                return 4
        elif mode == "logout":
            if logout_session(request, client=GoTrueClient()):
                return 5
        else:
            return 6
    print("P4_WORKER_OK")
    return 0


def _main() -> None:
    if len(sys.argv) == 5 and sys.argv[1] == "--worker":
        raise SystemExit(_worker(sys.argv[2], sys.argv[3], sys.argv[4]))

    _verify_database_boundary()
    state = FakeAuthState()
    server = ThreadingHTTPServer(("127.0.0.1", 0), FakeAuthHandler)
    server.state = state  # type: ignore[attr-defined]
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base_url = f"http://127.0.0.1:{server.server_port}"
    created: list[str] = []
    try:
        refresh_key = _new_session(expires_soon=True)
        created.append(refresh_key)
        original = SessionStore(session_key=refresh_key).load()[AUTH_SESSION_KEY]
        original_expiry = original["absolute_expires_at"]
        _run_workers("refresh", refresh_key, base_url, ("auth", "auth"))
        refreshed = SessionStore(session_key=refresh_key).load()[AUTH_SESSION_KEY]
        if state.refreshes != 1:
            raise RuntimeError("Concurrent PostgreSQL refresh was not serialized to one rotation.")
        if (
            refreshed.get("generation") != 2
            or refreshed.get("absolute_expires_at") != original_expiry
        ):
            raise RuntimeError("Refresh did not persist one generation within the original expiry.")
        if refreshed.get("refresh_token") != "p4-postgres-refresh-1":
            raise RuntimeError("Refresh did not persist the canonical replacement token pair.")

        race_key = _new_session(expires_soon=True)
        created.append(race_key)
        stale_store = SessionStore(session_key=race_key)
        stale_store.load()
        _run_workers("logout-race", race_key, base_url, ("auth", "logout"))
        if Session.objects.filter(session_key=race_key).exists():
            raise RuntimeError("Refresh/logout race left a server-side session row behind.")
        try:
            stale_store.save()
        except UpdateError:
            pass
        else:
            raise RuntimeError("Stale session save resurrected a logged-out session.")

        print(
            "PostgreSQL P4 concurrency probe passed: two-process refresh serialized once; "
            "logout race removed the row; stale save could not recreate it."
        )
    finally:
        for key in created:
            SessionStore(session_key=key).delete(key)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


if __name__ == "__main__":
    _main()
