
from __future__ import annotations

import json
from pathlib import Path

import pytest

import capture_baseline
import seed_parity
from capture_baseline import load_manifest, manifest_errors, react_routes
from seed_parity import REQUIRED_COLUMNS, SafetyError, schema_gaps, validated_target


def test_manifest_matches_all_react_routes():
    manifest = load_manifest()
    assert manifest_errors(manifest) == []


def test_recorded_activity_retention_matches_the_current_route_inventory():
    manifest = load_manifest()
    assert manifest["decisions"]["Q21"]["status"] == "accepted"
    assert "/activitylog" in {route["path"] for route in manifest["routes"]}
    assert len(react_routes()) == manifest["source"]["route_count_at_creation"]


def test_each_route_has_a_render_assertion_and_capture_state():
    manifest = load_manifest()
    for route in manifest["routes"]:
        assert route["page_heading"]["selector"] == "h1"
        assert route["page_heading"]["contains"]
        assert route["states"]


def test_local_target_requires_loopback():
    url, host = validated_target({
        "PARITY_TARGET_KIND": "local",
        "PARITY_SUPABASE_URL": "http://127.0.0.1:54321",
    })
    assert host == "127.0.0.1"
    assert url == "http://127.0.0.1:54321"


def test_local_target_rejects_non_local_host():
    with pytest.raises(SafetyError, match="restricted"):
        validated_target({
            "PARITY_TARGET_KIND": "local",
            "PARITY_SUPABASE_URL": "https://project.supabase.co",
        })


def test_staging_requires_exact_host_allowlist():
    with pytest.raises(SafetyError, match="exactly match"):
        validated_target({
            "PARITY_TARGET_KIND": "staging",
            "PARITY_SUPABASE_URL": "https://project.supabase.co",
            "PARITY_ALLOWED_SUPABASE_HOSTS": "another-project.supabase.co",
        })


def test_staging_accepts_only_allowlisted_supabase_host():
    _, host = validated_target({
        "PARITY_TARGET_KIND": "staging",
        "PARITY_SUPABASE_URL": "https://project.supabase.co/",
        "PARITY_ALLOWED_SUPABASE_HOSTS": "project.supabase.co",
    })
    assert host == "project.supabase.co"


@pytest.mark.parametrize("url", [
    "https://user:password@project.supabase.co",
    "https://project.supabase.co/?apikey=secret",
    "https://project.supabase.co/path",
])
def test_target_rejects_embedded_credentials_query_or_path(url):
    with pytest.raises(SafetyError):
        validated_target({
            "PARITY_TARGET_KIND": "staging",
            "PARITY_SUPABASE_URL": url,
            "PARITY_ALLOWED_SUPABASE_HOSTS": "project.supabase.co",
        })


def test_required_fixture_schema_does_not_silently_assume_missing_tables():
    discovered = {name: set(columns) for name, columns in REQUIRED_COLUMNS.items()}
    del discovered["template_reviews"]
    gaps = schema_gaps(discovered)
    assert gaps["template_reviews"] == sorted(REQUIRED_COLUMNS["template_reviews"])


@pytest.mark.parametrize("table", REQUIRED_COLUMNS)
def test_fixture_preflight_requires_ids_for_scoped_cleanup(table):
    discovered = {name: set(columns) for name, columns in REQUIRED_COLUMNS.items()}
    discovered[table].remove("id")
    assert schema_gaps(discovered)[table] == ["id"]


def test_only_parity_settings_load_and_process_environment_wins(tmp_path):
    path = tmp_path / ".env"
    path.write_text(
        'PARITY_TARGET_KIND=staging\nPARITY_SUPABASE_URL="https://test.supabase.co"\n'
        'VITE_SUPABASE_ANON_KEY=not-loaded\nUNRELATED_SECRET=not-loaded\n',
        encoding="utf-8",
    )
    env = {"PARITY_TARGET_KIND": "local"}
    seed_parity.load_parity_environment(path, env)
    assert env == {
        "PARITY_TARGET_KIND": "local",
        "PARITY_SUPABASE_URL": "https://test.supabase.co",
    }


def test_scenario_fixture_contains_only_synthetic_local_storage():
    fixture_path = Path(__file__).resolve().parents[2] / "fixtures" / "scenarios.json"
    fixtures = json.loads(fixture_path.read_text(encoding="utf-8"))
    assert fixtures["synthetic_only"] is True
    assert fixtures["local_storage"]["recentActivity"]
    assert all(item["user"] == "P1 Synthetic User" for item in fixtures["local_storage"]["recentActivity"])
    assert "No personal data" in fixtures["storage_objects"][0]["content"]


def test_legacy_env_values_are_read_without_overwriting_them(tmp_path, monkeypatch):
    (tmp_path / ".env").write_text("  VITE_SUPABASE_URL = http://127.0.0.1:54321  \n", encoding="utf-8")
    monkeypatch.setattr(capture_baseline, "REPO_ROOT", tmp_path)
    monkeypatch.delenv("VITE_SUPABASE_URL", raising=False)

    assert capture_baseline.effective_vite_value("VITE_SUPABASE_URL") == "http://127.0.0.1:54321"


def test_browser_capture_rejects_a_different_supabase_port(monkeypatch):
    monkeypatch.setenv("PARITY_TARGET_KIND", "local")
    monkeypatch.setenv("PARITY_SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("PARITY_SUPABASE_ANON_KEY", "synthetic-anon-key")
    monkeypatch.setenv("VITE_SUPABASE_URL", "http://localhost:54322")
    monkeypatch.setenv("VITE_SUPABASE_ANON_KEY", "synthetic-anon-key")

    with pytest.raises(SafetyError, match="origin"):
        capture_baseline.verify_browser_target()


def test_cleanup_refuses_a_different_local_target(tmp_path, monkeypatch):
    ledger_path = tmp_path / "fixture-ids.json"
    ledger_path.write_text(json.dumps({
        "target_kind": "local",
        "host": "localhost",
        "target_url": "http://localhost:54322",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "run_id": "00000000000000000000000000000001",
        "created": [],
        "storage_objects": [],
    }), encoding="utf-8")
    monkeypatch.setattr(seed_parity, "FIXTURE_STATE", ledger_path)
    monkeypatch.setenv("PARITY_TARGET_KIND", "local")
    monkeypatch.setenv("PARITY_TEST_USER_ID", "00000000-0000-0000-0000-000000000001")

    assert seed_parity.cleanup("http://localhost:54321", "localhost", "unused-key") == 2
    assert ledger_path.is_file()


def test_capture_requires_every_synthetic_fixture_table_and_storage_object(tmp_path, monkeypatch):
    ledger_path = tmp_path / "fixture-ids.json"
    ledger_path.write_text(json.dumps({
        "run_id": "00000000000000000000000000000001",
        "target_kind": "local",
        "host": "localhost",
        "target_url": "http://localhost:54321",
        "user_id": "synthetic-user-id",
        "schema_preflight_passed": True,
        "created": [{"table": "templates"}],
        "storage_objects": [],
    }), encoding="utf-8")
    monkeypatch.setattr(capture_baseline, "FIXTURE_STATE", ledger_path)
    monkeypatch.setenv("PARITY_TARGET_KIND", "local")
    monkeypatch.setenv("PARITY_SUPABASE_URL", "http://localhost:54321")
    monkeypatch.setenv("PARITY_TEST_USER_ID", "synthetic-user-id")

    ready, reason = capture_baseline.fixture_ready()
    assert ready is False
    assert "verified schema" in reason
