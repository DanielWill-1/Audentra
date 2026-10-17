# Audentra / VoiceForm

Audentra (VoiceForm) is a web application for working with reusable forms and templates, including voice-assisted form filling. The active application is the Django project in [`migration/django/`](migration/django/). The former React and Express application is archived under [`legacy/`](legacy/) for reference; it is not part of the active build or runtime.

## Project status

P9 parity, all five P10 local-first implementation waves, and local P11 legacy retirement are complete within the approved local scope. Django is the repository's sole active application runtime. P11 moved the old app and its build/runtime configuration into `legacy/`, removed the Django-to-React fallback, and retired the old API authentication and transcription paths.

The owner accepted the local release candidate. Production deployment, hosted changes, traffic switching, production migrations, and production soak remain deferred. Some device checks are excluded, and the recorded credential follow-ups remain pre-deployment work. See the [P10 release-candidate review](docs/deployment/P10_W5_RELEASE_CANDIDATE_REVIEW.md), [P11 closeout](HANDOFF_2026-10-17_P11_LEGACY_RETIREMENT.md), and [migration state](MIGRATION_STATE.md).

The Recent Forms and Activity Log feature is now implemented against the local Supabase database. Recent Forms contains saved records only; the personal activity feed captures forms, templates, sharing, reviews, and schedules. The schema was applied locally without resetting existing data. The implementation record and limits are in the [feature plan](docs/features/ACTIVITY_RECENT_FORMS_IMPLEMENTATION_PLAN.md) and [local closeout](docs/features/ACTIVITY_RECENT_FORMS_CLOSEOUT_2026-10-17.md); hosted migrations and deployment remain deferred.

## Active technology stack

| Area | Technology | Use |
| --- | --- | --- |
| Language and runtime | Python 3.12.10 managed with `uv`; dependencies locked in `uv.lock` | Active server application and dependency environment |
| Web framework | Django 5.2.18 | Routes, server-rendered pages, sessions, CSRF, and application services |
| Page interface | Django templates, HTMX 2.0.8, JavaScript, Tailwind CSS 3 | HTML-first interface and interactions; Tailwind CSS is compiled with the pinned standalone CLI |
| HTTP server and static files | Waitress 3.0.2, WhiteNoise 6.12.0 | Single-process WSGI serving and collected static assets |
| Identity | Supabase Auth through the official Python SDK | Identity is verified server-side; Django owns the browser session and CSRF boundary |
| Application data | Supabase PostgreSQL, `psycopg` 3, and row-level security | Application records use the restricted `django_data` role; Django session state uses the separate `django_app` role/schema |
| Local services | Supabase CLI and Docker Desktop | Loopback-only PostgreSQL and Auth for local development |
| Optional speech and AI | Groq and Google Cloud Speech/Text-to-Speech adapters | Provider use depends on private configuration and user consent; mock modes are the defaults when real providers are not configured |
| Development checks | pytest, Ruff, mypy | Regression tests, linting, and static type checks |

The current UI is served by Django. React, Vite, Express, npm manifests, and their former workflow are retained only in `legacy/` and are not used to start the active application.

## Start the app locally

### Requirements

- Windows with PowerShell
- `uv` installed and available on `PATH`
- Supabase CLI installed and available as `supabase.cmd`
- Docker Desktop running

From the repository root, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

The launcher prepares the pinned Python environment and locked dependencies when needed, starts local Supabase, applies pending Supabase migrations without a reset, provisions the synthetic demo account on first setup, builds Tailwind CSS, applies Django migrations to the local default database, collects static files, checks local configuration, and starts Waitress.

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) after the server starts. The generated local demo login is stored in the ignored file `migration/django/.state/local-demo-credentials.txt`. Stop the foreground server with **Ctrl+C**. If port 8000 is busy, choose another loopback port:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1 -Port 8001
```

The launcher uses the `local-supabase` settings profile and targets the local loopback database/Auth services. It does not reset local database contents or modify hosted services. First-time setup may download the managed Python, Python dependencies, and pinned Tailwind executable. For recovery, database reset instructions, provider setup, and troubleshooting, see the [P10 local runbook](docs/deployment/P10_LOCAL_RUNBOOK.md).

The local server exposes `/livez` for process health and `/readyz` for database readiness. The status and readiness checks do not indicate production deployment or hosted-service status.

## Recent Forms and Activity Log

Dashboard Recent Forms links to the five latest saved records for the signed-in account. The saved-forms page supports bounded paging, exact-record viewing, JSON download, and confirmed deletion. Values such as `false`, `0`, empty strings, and nested JSON remain intact.

Activity Log renders database events for forms, templates, sharing, reviews, and schedules. Search, category, and UTC date filters run on the server; history removal deletes only the activity row. The feed is private to the account that performed the action. Activity metadata carries only safe labels and bounded change/status/role facts; it does not include form answers, review comments, schedule descriptions, attendee values, or voice transcripts.

The first release does not save unfinished drafts or resume forms. See the [implementation plan](docs/features/ACTIVITY_RECENT_FORMS_IMPLEMENTATION_PLAN.md), [local PostgreSQL and application acceptance record](docs/features/ACTIVITY_RECENT_FORMS_CLOSEOUT_2026-10-17.md), and the [local runbook](docs/deployment/P10_LOCAL_RUNBOOK.md) for behavior, schema migrations, checks, and remaining deployment boundary.

## Legacy application and retained evidence

The `legacy/` directory preserves the former React/TypeScript/Vite client, Express API, npm manifests and lockfile, frontend build configuration, draft static pages, old Node scripts, former CI workflow, and original README. It is an archive for source inspection and historical comparisons; the Django application does not proxy to it or load it at runtime.

Historical screenshots, design references, route-parity evidence, database migration history, and phase reports remain in their existing folders. The root `node_modules/` directory may remain as an ignored local dependency cache; it is not tracked or used by Django.

## Repository map

| Path | Contents |
| --- | --- |
| [`start-local.ps1`](start-local.ps1) | One-command Windows launcher for the local application |
| [`migration/django/`](migration/django/) | Active Django project, templates, static assets, services, and tests |
| [`legacy/`](legacy/) | Archived React/Vite/Express application and former build/runtime files |
| [`supabase/`](supabase/) | Supabase configuration, migrations, bootstrap SQL, seed data, and RLS checks |
| [`docs/deployment/`](docs/deployment/) | Local operation, release-candidate, rollback, and deployment runbooks |
| [`docs/features/`](docs/features/) | Feature plans and implementation closeouts |
| [`docs/parity/`](docs/parity/) | Route parity reports, acceptance records, and comparison evidence |
| [`page-screenshots/`](page-screenshots/) | Retained design and historical route screenshots |
| [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md), [`MIGRATION_STATE.md`](MIGRATION_STATE.md) | Phase scope, decisions, and current migration status |

## Configuration and data safety

- Keep private provider settings in the ignored `migration/django/.env`; never commit API keys, database URLs, or service-role keys.
- The local launch profile uses generated, ignored files under `migration/django/.state/` and validates loopback Supabase endpoints before setup.
- The demo account and patient-intake template contain synthetic data. Use fictional information for local reviews.
- Cloud AI requests are optional and require the app's consent flow. Provider retention and configuration limits are documented in the [P10 review](docs/deployment/P10_W3_PRIVACY_SECURITY_REVIEW.md) and local runbook.
- Do not treat a successful local launch as authorization or readiness to deploy. Production host, external secrets, hosted changes, and soak require a later owner decision.

## Development references

The [Django project README](migration/django/README.md) documents the application internals and development checks. The [local runbook](docs/deployment/P10_LOCAL_RUNBOOK.md) has manual setup steps and recovery instructions. The [deployment runbook](docs/deployment/P10_DEPLOYMENT_RUNBOOK.md) records the deferred production architecture and its controls.
