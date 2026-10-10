
from __future__ import annotations

import os
import pytest
from playwright.sync_api import sync_playwright

from capture_baseline import (
    assert_heading,
    fixture_ready,
    load_manifest,
    local_storage_setup,
    sign_in,
    start_vite,
    stop_vite,
)


RUN_BROWSER = os.environ.get("PARITY_RUN_BROWSER_SMOKE") == "1"
BASE_URL = os.environ.get("PARITY_BASE_URL", "http://127.0.0.1:5173")
MANIFEST = load_manifest()
HOME = next(route for route in MANIFEST["routes"] if route["path"] == "/")
DASHBOARD = next(route for route in MANIFEST["routes"] if route["path"] == "/dashboard")


def test_legacy_app_boots_and_renders_home():
    if not RUN_BROWSER:
        pytest.skip("Set PARITY_RUN_BROWSER_SMOKE=1 to run the local browser smoke.")
    server = start_vite(BASE_URL)
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                context = browser.new_context(
                    viewport={"width": 1440, "height": 900},
                    locale="en-US",
                    timezone_id="UTC",
                    reduced_motion="reduce",
                )
                context.add_init_script(local_storage_setup())
                page = context.new_page()
                page.goto(BASE_URL + "/", wait_until="domcontentloaded", timeout=25000)
                assert_heading(page, HOME)
                context.close()
            finally:
                browser.close()
    finally:
        stop_vite(server)


def test_synthetic_account_can_sign_in_and_open_dashboard():
    if not RUN_BROWSER:
        pytest.skip("Set PARITY_RUN_BROWSER_SMOKE=1 to run the local browser smoke.")
    if not (os.environ.get("PARITY_TEST_EMAIL") and os.environ.get("PARITY_TEST_PASSWORD")):
        pytest.skip("No synthetic parity account is configured.")
    ready, reason = fixture_ready()
    if not ready:
        pytest.skip(reason)
    server = start_vite(BASE_URL)
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            try:
                context = browser.new_context(
                    viewport={"width": 1440, "height": 900},
                    locale="en-US",
                    timezone_id="UTC",
                    reduced_motion="reduce",
                )
                context.add_init_script(local_storage_setup())
                page = context.new_page()
                sign_in(page, BASE_URL)
                page.goto(BASE_URL + "/dashboard", wait_until="domcontentloaded", timeout=25000)
                assert_heading(page, DASHBOARD)
                context.close()
            finally:
                browser.close()
    finally:
        stop_vite(server)
