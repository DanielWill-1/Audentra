# Django foundation

This is a native Windows Django project that runs beside the existing React/Vite and Express application. It provides the P2 foundation, P3 speech/extraction services, P4 development authentication and P5 Supabase application data services. Product pages have not yet migrated; P6/P7 own that work.

The bounded P3 code findings are corrected; live speech-provider evidence remains pending. P4 development authentication was verified with fresh hosted accounts and PostgreSQL concurrency; see [P4_REPORT.md](../../docs/auth/P4_REPORT.md). P5 schema, RLS, Storage and Django data services are implemented and the direct-host probe passes. P5 remains partial until the hosted transaction-pooler/user-switch check passes; see [P5_REPORT.md](../../docs/data/P5_REPORT.md).

## Setup

Run commands from this directory in PowerShell.

1. Install the managed Python 3.12 runtime locally, then point uv at this project's ignored cache and virtualenv:

       uv python install 3.12.10 --managed-python --install-dir .python --cache-dir .uv-cache
       $env:UV_CACHE_DIR = (Join-Path $PWD ".uv-cache")
       $env:UV_PROJECT_ENVIRONMENT = ".venv-p2"

2. Copy .env.example to .env. Keep the project-local .env private and use only the dedicated django_app and django_data database roles.
3. Install and lock dependencies with the locally managed interpreter:

       uv sync --python .python\cpython-3.12.10-windows-x86_64-none\python.exe

4. Download and SHA-256 verify the pinned Tailwind standalone executable into ignored .state/, then build the Tailwind 3 CSS:

       powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build_static.ps1

5. Run checks, focused lint/type/tests and collect static files:

       uv run python manage.py check
       powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_ruff.ps1 check .
       uv run python -m mypy config apps tests
       uv run python -m pytest -q
       uv run python manage.py collectstatic --noinput

6. Apply only Django-owned migrations to default after the restricted database URL is configured:

       uv run python manage.py migrate --database=default

7. Start the local development server on loopback:

       uv run python manage.py runserver 127.0.0.1:8000

The health endpoint is at http://127.0.0.1:8000/healthz. It returns 200 only when both PostgreSQL connections pass role and schema checks. If database URLs are absent, offline framework checks use SQLite and the health endpoint returns a sanitized 503.

The Tailwind and Ruff helpers stage their locked Windows executables in the OS temporary directory as a workaround for launch failures observed in this Windows runner. OneDrive was not established as the cause. Native Python DLL loading also failed inside the Codex Windows sandbox; the same checks passed with approved execution outside it.

## Test isolation and current handoff

The normal pytest configuration uses config.settings.test. Both aliases are in-memory SQLite databases, overriding the hosted URLs loaded by base settings. Never point pytest at the hosted Supabase project or use it to create, drop or flush that database. Live read-only foundation checks run separately under development settings. The [P2 review](../../docs/foundation/P2_REVIEW.md) records 9 passing tests and the repeated foundation checks.

P3 service endpoints are disabled by default and use deterministic mocks when enabled. For Django service work, set P3_SERVICES_ENABLED=true, SPEECH_BACKEND=mock, TTS_BACKEND=mock and USE_MOCK_AI=true. P4 makes verified identity mandatory and requires CSRF for cookie-authorized writes. The React-to-Django authentication handoff was removed from the revised scope; use the Django site for development Auth. See the P3 contracts/report and P4_REPORT.md for evidence.

## P5 application data

P5 adds unmanaged Django models and services for profiles, templates, UUID-based sharing, reviews, scheduling, filled forms and private template files. Supabase remains the data store; all application queries use a verified principal and a transaction-local `authenticated` RLS context on the `supabase` alias. Django sessions/migration state remain on the separate `default`/`django` alias.

P5 direct-host and local PostgreSQL checks pass. To complete the phase, configure `DJANGO_SUPABASE_DATABASE_URL` in the ignored local `.env` with the exact shared transaction-pooler URL for `django_data` from Supabase Dashboard → Connect, keeping its password local, then run `scripts/check_p5_hosted_data.py`. Do not compose the host or widen the request role. See [P5 contracts](../../docs/data/P5_CONTRACTS.md), [RLS matrix](../../docs/data/P5_RLS_MATRIX.md), [verification](../../docs/data/P5_VERIFICATION.md) and [report](../../docs/data/P5_REPORT.md).

## P4 development authentication

Supabase Auth is the sole identity provider through the official Python SDK. Django Auth is not installed. Configure the ignored environment's SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY; the owner-supplied publishable key is already set locally. Never put a secret/service-role key in a public setting.

The owner authorized disabling mandatory signup email confirmation in the development project. Open /signup/ or /login/, then /auth/session/ for the protected account page and /change-password/ for an authenticated password change. POST logout revokes the local refresh token and clears the Django session. HTMX 2.0.8 is vendored locally; normal forms work without JavaScript. Email-based forgotten-password recovery is explicitly unavailable. No SMTP or legacy account test is required. Before production, reconsider verification/recovery delivery and finish exposed-key retirement.

See [P4_REPORT.md](../../docs/auth/P4_REPORT.md) for actual hosted/HTMX and regression evidence. Do not enable the legacy React-to-Django transport as an Auth acceptance path; P4 no longer provides React session handoff.

For the Windows Store interpreter workaround used in this runner, from migration/django/:

```powershell
$env:PYTHONPATH = (Resolve-Path .venv-p2/Lib/site-packages).Path
& "$env:LOCALAPPDATA\Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe" manage.py runserver 127.0.0.1:8000
```

The website does not read SUPABASE_TEST_ADMIN_KEY. Only scripts/check_p4_hosted_auth.py uses that ignored server credential to delete its own freshly generated test account. The regular test suite remains isolated from hosted databases.

## Database boundaries

The default alias must connect as django_app with search_path=django. It stores Django sessions and the migration recorder. The supabase alias connects as django_data with search_path=public. That login has no inherited application privileges; its sole reviewed membership is `authenticated` with `INHERIT FALSE, SET TRUE`, used only through transaction-local RLS context. Neither role may create roles or databases, become a superuser, or bypass RLS.

The SQL in supabase/bootstrap/django_app_role.sql has no embedded passwords. It creates the django schema under the Supabase management role because that role does not grant SET ROLE to django_app. It grants django_app only USAGE and CREATE in that schema; Django owns the tables it creates, while the runtime role cannot drop or transfer the schema. Generated random role passwords are stored in this directory's ignored .env. The transient SQL file used to set them is removed after bootstrap. Never place database URLs or generated passwords in committed SQL, command arguments, reports, output or browser code.

P2 did not create public application tables or change Auth, Storage, existing Supabase migrations, project-wide grants or application policies. P5 added the application schema and reviewed RLS/Storage policies through forward-only migrations; historical migration files remain unchanged. The baseline and exact results are documented in [schema reconciliation](../../docs/schema-reconciliation.md).

## Source tokens

The minimal fixture in templates/base.html and config/tailwind.config.cjs copies only the classes and token values needed to prove the standalone build. Colors, font families and spacing are sourced from the unchanged repository tailwind.config.js. The source CSS stays under assets/ and the downloaded binary under .state/, outside the collected static directory; only the built CSS is collected. Full shells and page styling remain for P6/P7.
