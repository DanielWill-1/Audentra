# P1 parity baseline

This directory contains new comparison evidence. It does not replace page-screenshots/ or the original HTML designs in new pages/; keep those sources in place and runnable as the comparison reference.

## Current status

- P1 is finalized with [accepted exceptions](P1_ACCEPTANCE.md). P7 SR-1 through SR-4 are closed in the [finding closeout](../pages/P7_SR_CLOSEOUT_2026-10-13.md), and P8 deterministic acceptance is complete; physical-device and live-provider checks remain P9 work. P9 has started; its [25-route acceptance matrix](P9_ACCEPTANCE_MATRIX.md) preceded a passing local read-only inventory. Browser and hosted acceptance remain open.
- The accepted route contract enumerates all 25 routes from src/App.tsx. /activitylog remains a future feature.
- All 24 historical desktop PNGs in page-screenshots/ were inventoried and visually reviewed; see [reference-inventory.json](reference-inventory.json). /open and mobile references are absent. Some app images show login/loading/error and cannot stand in for successful authenticated views.
- Existing images are accepted manual design references. baseline/ still has no full reviewed golden matrix; numeric thresholds and masks remain deferred.
- The owner confirmed the private .env target is hosted development/testing with no production. CLI linking and read-only catalog inspection work without Docker. [testing-schema-summary.json](testing-schema-summary.json) records zero public app tables and zero Storage buckets.
- Private PARITY_ URL, exact host allowlist and anon configuration match legacy Vite. CLI entry points load only literal PARITY_ entries, with process values taking precedence. Test identity, elevated key and write acknowledgement are unset; no fixture/database/Auth/Storage writes occurred.
- Schema/Storage provisioning is P5a, Auth is P4 and RLS/populated fixture verification is P5b. P7/P8 wave evidence is retained; P9 full parity/release acceptance remains required.
- GitHub's protected parity-test environment remains optional until hosted capture execution is desired. No hosted workflow run is claimed.

## Setup and commands

The current .env hosted testing target is explicitly approved; Docker is not required. The commands below describe future full-fixture/capture work after P4/P5a/P5b prerequisites. An empty schema and absent identity currently prevent full capture. Offline harness checks can run now.

    python -m pip install -r migration/parity/requirements.txt
    python -m playwright install chromium
    python -m pytest migration/parity/tests/e2e -q
    python migration/parity/scripts/seed_parity.py --check
    python migration/parity/scripts/seed_parity.py --apply
    python migration/parity/scripts/capture_baseline.py --run-id local-review-001
    python migration/parity/scripts/compare_screenshots.py docs/parity/baseline docs/parity/reports/local-review-001/screenshots --diff docs/parity/reports/local-review-001/diffs
    python migration/parity/scripts/seed_parity.py --cleanup

Fixture setup requires an explicit target class, an allowlisted Supabase host, a synthetic test user, a service-role key provided privately, and the fixture-write acknowledgement. The seeder verifies the actual PostgREST schema before its first write, writes only its synthetic rows and one test storage object, and records their IDs for scoped cleanup. It never prints credential values.

For a local stack, set `PARITY_TARGET_KIND=local`, `PARITY_SUPABASE_URL` to that stack's loopback API origin, `PARITY_TEST_USER_ID` and an `@example.test` identity with `PARITY_TEST_EMAIL`/`PARITY_TEST_PASSWORD`. Supply the local anon/service-role keys through the process environment and set `PARITY_ALLOW_FIXTURE_WRITES=I_CONFIRM_ISOLATED_TEST_DATA` only for the isolated target. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the same target and anon key for browser capture; this overrides the legacy `.env` without editing it. Hosted testing requires the exact host in PARITY_ALLOWED_SUPABASE_HOSTS. A protected GitHub environment is needed only for hosted workflow execution. Do not use production credentials or identities.

For GitHub's manual capture job, configure a protected environment named `parity-test`. Its variables are `PARITY_TARGET_KIND`, `PARITY_ALLOWED_SUPABASE_HOSTS` and `PARITY_SUPABASE_URL`; its secrets are `PARITY_SUPABASE_ANON_KEY`, `PARITY_SUPABASE_SERVICE_ROLE_KEY`, `PARITY_TEST_USER_ID`, `PARITY_TEST_EMAIL` and `PARITY_TEST_PASSWORD`. These hosted settings are an operator prerequisite and are not created or changed by this repository workflow.

The capture command starts Vite at the local base URL only when no server is listening, and stops only a process it started. Use a fresh run ID each time. It records an explicit blocked state and exits nonzero if authentication, fixture schema or baseline inputs are missing. It writes run artifacts only under docs/parity/reports/; it never overwrites historical screenshots or reviewed goldens. Run fixture cleanup with the same target variables and service-role key even when capture/comparison fails.

Q18 records manual acceptance of historical references. Numeric visual settings in route-manifest.json remain proposals for later automated evidence; the full capture gate still requires their explicit review and a complete golden matrix. Directory comparison requires the baseline and run capture trees to have matching relative PNG paths; an absent or extra capture fails the comparison.

## Reports and retention

Routine run output is gitignored. Copy only a reviewed, sanitized release candidate into docs/parity/reports/release-candidates/. Never publish auth storage state, reset links, real personal data, raw response bodies, request query strings, database rows or secret values. Captures use synthetic `example.test` identities only.
