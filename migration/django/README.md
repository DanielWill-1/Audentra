# Audentra Django application

This is the active application. The former React/Vite and Express source is archived under [`../../legacy/`](../../legacy/) and is not part of the Django build or runtime. The locked Waitress/WhiteNoise runtime, settings, service boundary, and runbooks are maintained here; production deployment remains deferred. See [P10 readiness](../../docs/deployment/P10_READINESS.md).

See the [P10 preparation handoff](../../HANDOFF_2026-10-15_P10_PREPARATION.md), [P7 finding closeout](../../docs/pages/P7_SR_CLOSEOUT_2026-10-13.md), [P7/P8 matrix](../../docs/pages/P7_P8_CLOSURE_MATRIX.md), and [P9 task](../../docs/parity/P9_IMPLEMENTATION_PROMPT.md), [acceptance matrix](../../docs/parity/P9_ACCEPTANCE_MATRIX.md), and [report](../../docs/parity/P9_REPORT.md). The older P7 session review remains a dated historical record.

P4 development Auth and P5 hosted data/RLS/Storage/pooler acceptance pass; see [P4 report](../../docs/auth/P4_REPORT.md) and [P5 verification](../../docs/data/P5_VERIFICATION.md). P7 routes resolve directly to Django pages and application views; the React proxy and route rollback bridge have been retired.

## Local operation and P10 reference

P9 closeout and P10 local preparation are complete. The local schema alignment and the runtime implementation are recorded in the [P5 local results](../../docs/data/P5_LOCAL_ALIGNMENT_RESULTS.json) and [P10 evidence](../../docs/deployment/evidence/p10/p10-20261015-runtime-01/commands.md). Django continues to use the existing hosted development connections. Follow the [P10 local runbook](../../docs/deployment/P10_LOCAL_RUNBOOK.md) for reproducible setup. Recording/provider and physical-device checks remain deferred or excluded as recorded there. Deployment remains a later decision.

## Setup

Run commands from this directory in PowerShell.

1. Install the managed Python 3.12 runtime locally, then point uv at this project's ignored cache and virtualenv:

       uv python install 3.12.10 --managed-python --install-dir .python --cache-dir .uv-cache
       $env:UV_CACHE_DIR = (Join-Path $PWD ".uv-cache")
       $env:UV_PROJECT_ENVIRONMENT = ".venv-p2"

2. Configure the local profile values described in the [P10 local runbook](../../docs/deployment/P10_LOCAL_RUNBOOK.md). The archived `legacy/.env.example` belongs to the retired browser app and is not a Django settings template. Keep the Django `.env` private and use only the dedicated django_app and django_data database roles.
3. Install and lock dependencies with the locally managed interpreter:

       uv sync --locked --python .python\cpython-3.12.10-windows-x86_64-none\python.exe

4. Download and SHA-256 verify the pinned Tailwind standalone executable into ignored .state/, then build the Tailwind 3 CSS:

       powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build_static.ps1

5. Run checks, focused lint/type/tests and collect static files:

       uv run --locked python manage.py check --settings=config.settings.local_http
       powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_ruff.ps1 check .
       uv run --locked python -m mypy config apps tests
       uv run --locked python -m pytest -q
       uv run --locked python manage.py collectstatic --noinput --settings=config.settings.local_http
       uv run --locked python scripts/p10_preflight.py --profile local-http

6. Apply only Django-owned migrations to default after the restricted database URL is configured:

       uv run python manage.py migrate --database=default

7. Start the production-style local HTTP server on loopback:

       uv run --locked python scripts/serve_p10.py --profile local-http

The foreground server stops with Ctrl+C. `/livez` reports process status, `/readyz` checks both PostgreSQL aliases, and `/healthz` preserves the earlier database-readiness behavior. The local profile is explicitly HTTP and loopback-only; it sets `DEBUG=False`, disables secure-cookie and HTTPS-redirect flags only for this profile, and serves the collected manifest through WhiteNoise. Production settings retain secure cookies and HTTPS redirect.

The [deployment runbook](../../docs/deployment/P10_DEPLOYMENT_RUNBOOK.md) describes the same-host TLS proxy contract. The [rollback runbook](../../docs/deployment/P10_ROLLBACK_RUNBOOK.md) separates code/traffic rollback from targeted data repair. The selected production host, domain, proxy, Auth policy, provider accounts, external secrets, and deployment remain owner decisions.

The Tailwind and Ruff helpers stage their locked Windows executables in the OS temporary directory as a workaround for launch failures observed in this Windows runner. OneDrive was not established as the cause. Native Python DLL loading also failed inside the Codex Windows sandbox; the same checks passed with approved execution outside it.

## Test isolation and current handoff

The normal pytest configuration uses config.settings.test. Both aliases are in-memory SQLite databases, overriding the hosted URLs loaded by base settings. Never point pytest at the hosted Supabase project or use it to create, drop or flush that database. Live read-only foundation checks run separately under development settings. The [P2 review](../../docs/foundation/P2_REVIEW.md) records 9 passing tests and the repeated foundation checks.

P3 service endpoints are disabled by default. For deterministic local service checks, set P3_SERVICES_ENABLED=true with SPEECH_BACKEND=mock, TTS_BACKEND=mock and USE_MOCK_AI=true. Real modes require their private provider configuration; provider failures are surfaced instead of being replaced with successful mock data. P4 makes verified identity mandatory and requires CSRF for cookie-authorized writes. The React-to-Django authentication handoff was removed from the revised scope; use the Django site for development Auth. See the P3 contracts/report and P4_REPORT.md for evidence.

## P5 application data

P5 adds unmanaged Django models and services for profiles, templates, UUID-based sharing, reviews, scheduling, filled forms and private template files. Supabase remains the data store; all application queries use a verified principal and a transaction-local `authenticated` RLS context on the `supabase` alias. Django sessions/migration state remain on the separate `default`/`django` alias.

P5 direct-host and local PostgreSQL checks pass. The final hosted probe also passed through the shared transaction pooler with the restricted project-scoped `django_data` login: 65 checks, A/B/A identity and private-row isolation, transaction cleanup, forced rollback/recovery, reused Django client connection and exact cleanup. Transaction mode uses transaction-local search paths and disables Psycopg prepared statements. See [P5 contracts](../../docs/data/P5_CONTRACTS.md), [RLS matrix](../../docs/data/P5_RLS_MATRIX.md), [verification](../../docs/data/P5_VERIFICATION.md) and [report](../../docs/data/P5_REPORT.md). P6 verification is in [P6_VERIFICATION.md](../../docs/rendering/P6_VERIFICATION.md).

## P4 development authentication

Supabase Auth is the sole identity provider through the official Python SDK. Django Auth is not installed. Configure the ignored environment's SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY; the owner-supplied publishable key is already set locally. Never put a secret/service-role key in a public setting.

The owner authorized disabling mandatory signup email confirmation in the development project. Open /signup/ or /login/, then /auth/session/ for the protected account page and /change-password/ for an authenticated password change. POST logout revokes the local refresh token and clears the Django session. HTMX 2.0.8 is vendored locally; normal forms work without JavaScript. Email-based forgotten-password recovery is explicitly unavailable. No SMTP or legacy account test is required. Before production, reconsider verification/recovery delivery and finish exposed-key retirement.

See [P4_REPORT.md](../../docs/auth/P4_REPORT.md) for actual hosted/HTMX and regression evidence. Do not enable the legacy React-to-Django transport as an Auth acceptance path; P4 no longer provides React session handoff.

The website does not read SUPABASE_TEST_ADMIN_KEY. Only scripts/check_p4_hosted_auth.py uses that ignored server credential to delete its own freshly generated test account. The regular test suite remains isolated from hosted databases.

## Database boundaries

The default alias must connect as django_app with search_path=django. It stores Django sessions and the migration recorder. The supabase alias connects as django_data with search_path=public. That login has no inherited application privileges; its sole reviewed membership is `authenticated` with `INHERIT FALSE, SET TRUE`, used only through transaction-local RLS context. Neither role may create roles or databases, become a superuser, or bypass RLS.

The SQL in supabase/bootstrap/django_app_role.sql has no embedded passwords. It creates the django schema under the Supabase management role because that role does not grant SET ROLE to django_app. It grants django_app only USAGE and CREATE in that schema; Django owns the tables it creates, while the runtime role cannot drop or transfer the schema. Generated random role passwords are stored in this directory's ignored .env. The transient SQL file used to set them is removed after bootstrap. Never place database URLs or generated passwords in committed SQL, command arguments, reports, output or browser code.

P2 did not create public application tables or change Auth/Storage. P5 added the application schema and reviewed RLS/Storage policies. The later local-start repair guarded a historical missing-table reference, and forward migration `20261015170000_p5_legacy_schema_alignment.sql` aligns the resulting local application catalog with canonical P5. Hosted settings were not changed by that local follow-up. See [P5 verification](../../docs/data/P5_VERIFICATION.md) and [schema reconciliation](../../docs/schema-reconciliation.md).

## Source tokens

The shared P6 shells use color, font-family and spacing tokens from the repository Tailwind config. The source CSS stays under assets/ and the downloaded binary under .state/, outside the collected static directory; only the built CSS is collected. P7 extended the Django theme for the migrated pages; its pinned Tailwind build and token check passed in the final verification.
