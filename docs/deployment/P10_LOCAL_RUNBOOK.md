# P10 local operation runbook

**Target:** native Windows, local Supabase, and the locked Django environment. The default **local-supabase** profile binds Django to loopback, uses DEBUG=False, and masks hosted database/Auth values from .env. The older **local-http** name now aliases this local-only profile. **demo-http** is the explicit profile for a hosted development/demo target. Production settings keep secure cookies and HTTPS redirect enabled.

## One-command launch

From Windows PowerShell at the repository root, run:

    powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1

The launcher checks for `uv` and the Supabase CLI, installs the pinned managed Python and locked Django environment when needed, starts local Supabase, applies pending Supabase migrations with `supabase migration up --local`, provisions the synthetic demo account on first setup, builds static assets, applies Django's local session migrations, runs the local checks, and starts Waitress at `http://127.0.0.1:8000/`. It does not reset local database contents. Use `-Port 8001` to select another loopback port, and stop the foreground server with Ctrl+C. Docker Desktop must be running.

## First start

Run the Django environment setup in PowerShell from migration/django:

    uv python install 3.12.10 --managed-python --install-dir .python --cache-dir .uv-cache
    $env:UV_CACHE_DIR = (Join-Path $PWD '.uv-cache')
    $env:UV_PROJECT_ENVIRONMENT = '.venv-p2'
    uv sync --locked --python .python\cpython-3.12.10-windows-x86_64-none\python.exe

Start the local Supabase stack from the repository root. From migration/django, the commands are:

    Push-Location ..\..
    supabase start
    supabase migration up --local
    Pop-Location

Back in migration/django, provision the restricted app roles and synthetic demo account:

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup_local_supabase.ps1 -Local

This reads only the local CLI status, rejects non-loopback API/database endpoints, generates the demo password and restricted database passwords, and saves them under the ignored .state directory. It seeds one synthetic account and one synthetic patient-intake template. The sign-in details are in .state\local-demo-credentials.txt. The local CLI service-role key is passed in memory to Auth setup and is never written to the generated file or printed.

Build and start Django with the local profile:

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build_static.ps1
    uv run --locked python manage.py migrate --settings=config.settings.local_supabase --database default
    uv run --locked python manage.py check --settings=config.settings.local_supabase
    uv run --locked python manage.py collectstatic --noinput --settings=config.settings.local_supabase
    uv run --locked python scripts/p10_preflight.py --profile local-supabase
    uv run --locked python scripts/serve_p10.py --profile local-supabase

Waitress binds to 127.0.0.1:8000 by default. The preflight validates the static manifest, local Auth URL/key format, restricted PostgreSQL aliases, provider configuration, and setting syntax without printing secret values. Stop the foreground server with Ctrl+C. The local app uses PostgreSQL for sessions and application data; Django migrations run only on the default alias, while Supabase migrations own the Supabase alias schema.

The server uses one process and eight request threads by default. It applies a 60-second idle-channel timeout, a 32 KiB header limit, and a 20 MiB body limit. It does not run Django's development runserver.

## Repeatable local reset

The reset requires both -Local and -Yes. It invokes supabase db reset --local --yes, reapplies repository migrations and the no-secret SQL seed, recreates the local synthetic account and template using the password stored in .state, and reapplies the Django session migration:

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup_local_supabase.ps1 -Local -Reset -Yes

This reset permanently replaces the local Supabase database contents. It never uses a linked/hosted database flag. Keep any local work you need before running it.

## Demo and performance checks

With Django running, execute the local browser smoke from the repository root. It checks database readiness, field validation, safe invalid-password feedback, sign-in, and the synthetic template while keeping credentials out of output:

    node migration/django/scripts/p10_local_demo_check.cjs

The performance harness measures five fresh-context home loads and nine warm navigations across the home, features, and documentation routes:

    node migration/django/scripts/p10_perf_check.cjs --output docs/deployment/P10_W5_PERFORMANCE_AFTER.json

Run the same command before and after a performance change, using distinct output paths. The report records machine/browser details, route timing, and slow resource hosts without capturing request bodies or credential values.

## Recent Forms and Activity Log

Recent Forms lists saved form records only. It does not keep drafts or offer resume. Each row opens its exact saved record; that record can be downloaded as JSON. Deleting the saved form removes it from Recent Forms and creates a deletion event.

Activity Log shows the signed-in account's own saved-form, template, sharing, review, and schedule actions. It supports category/search/date filters and lets the account owner remove a history entry. Removing an activity entry leaves the underlying business record unchanged. Event capture is transaction-bound to the saved action. Review comments, schedule descriptions, attendee values, form answers, and voice content are not copied into event metadata.

The current local PostgreSQL acceptance check creates synthetic Auth/application rows inside one transaction and rolls them all back:

    psql "postgresql://postgres:<local-db-password>@127.0.0.1:54322/postgres?sslmode=disable" -v ON_ERROR_STOP=1 -f supabase/tests/p11_activity_acceptance.sql

Focused application regression checks use the isolated SQLite test settings:

    uv run --locked pytest tests/test_p7_application.py tests/test_p5_data_layer.py -q

Implementation details and what each check proves are recorded in [the feature plan](../features/ACTIVITY_RECENT_FORMS_IMPLEMENTATION_PLAN.md) and [the local closeout](../features/ACTIVITY_RECENT_FORMS_CLOSEOUT_2026-10-17.md).

## Local and hosted-demo configuration

- .state\local-supabase.env contains machine-generated loopback connection settings and is ignored by Git. Do not copy it into .env.
- The local profiles ignore DJANGO_DATABASE_URL, DJANGO_SUPABASE_DATABASE_URL, SUPABASE_URL, and SUPABASE_PUBLISHABLE_KEY from .env; their connection values come only from P10_LOCAL_*.
- Groq and other provider settings continue to come from the private Django .env. Cloud AI calls require the app's one-time consent and should use synthetic information during local review.
- demo-http is a separate, explicit profile using the existing hosted-development .env values. Use it only for synthetic demo data and only when the hosted development target is intentionally selected. Never use it for production or local reset operations.

## Health, errors, and logs

- /livez reports that the Django process is responding. It does not touch the database.
- /readyz checks both database aliases and returns a sanitized 503 if either is unavailable.
- /healthz keeps the earlier database-readiness behavior for existing monitors.
- Validation errors identify the field or expected format. Auth, provider, storage, and server failures use safe recovery messages; logs omit request paths, bodies, IP headers, tokens, and exception text.

Operational logs go to .state\logs\voiceform.log by default and to the console. Rotation is capped at 1 MB plus three backups. Set DJANGO_LOG_FILE to a private writable path to change the file location.

## Troubleshooting

- If setup --local says Supabase is not ready, start Docker Desktop and run supabase start from the repository root.
- If the local preflight reports a local endpoint or restricted-role failure, rerun setup --local; do not paste hosted connection URLs into the local profile.
- If preflight reports DJANGO_STATIC_ROOT/run_collectstatic_first, rebuild Tailwind if needed and run collectstatic with config.settings.local_supabase.
- If /livez responds but /readyz returns 503, the server is running while a local database alias is unavailable. Check local Supabase status and the generated .state\local-supabase.env; do not replace either alias with a management role.
- If a bind fails, choose a free loopback port with --port. Public interface binds are rejected.
- If real provider mode is selected with incomplete settings, preflight reports setting names only. Configure credentials privately or return to mock/demo mode.
- The local profile sets SESSION_COOKIE_SECURE=False and disables SSL redirect for HTTP loopback use. Use demo-http only for an intentionally selected hosted development target; use production only behind the private TLS proxy described in the deployment runbook.

## Safe schema operations

Apply pending local Supabase migrations explicitly after the stack starts, using `supabase migration up --local`. The launcher performs this forward-only step automatically; it does not reset local data. The explicit local reset also reapplies repository migrations. Django-owned session migrations run on default:

    uv run --locked python manage.py migrate --plan --settings=config.settings.local_supabase --database default

Never run Django migration commands against the Supabase alias, hosted application schema, or production during this local workflow.
