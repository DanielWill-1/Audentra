# P2: Django foundation beside the legacy application

> Archived from root prompt.md after the P2 review on 2026-10-10. This is the executed P2 scope, not an instruction to rerun setup. The active future-phase brief is [root prompt.md](../../prompt.md). See [P2_REVIEW.md](P2_REVIEW.md) for the subsequent review and test isolation fix. Repository paths in the body are relative to the repository root.

## Handoff and authorization

P1 is finalized with owner-accepted exceptions on 2026-10-10. Read docs/parity/P1_ACCEPTANCE.md for exact evidence and deferred checks. The owner accepted the existing screenshots, retained /activitylog, confirmed the current hosted Supabase project is testing only with no production deployment, and authorized P2. P0 remains accepted per owner report.

**P2 execution status (2026-10-10): complete.** This file records the bounded implementation scope and evidence requirements that were executed. See [P2_REPORT.md](P2_REPORT.md) and [Django-owned state](django-owned-state.md) for results. Do not rerun the hosted role bootstrap or database migrations as a new phase. P3 requires a separate user request. P1's archived original gates remain superseded by the accepted handoff.

The hosted testing project in the private root .env is approved for bounded development setup. Its CLI link now matches .env, and CLI Management API catalog queries work without Docker. The project currently has zero public app tables and zero Storage buckets. Do not ask again whether this known target is production or whether Docker should be installed.

## Result and folder policy

Stand up a Django project under migration/django/ that runs beside React/Vite and Express. Prove native Python startup, settings, restricted database connectivity, Django-owned migrations, static collection and a compatible Tailwind build before moving any user-facing page.

Keep src/, server/, scripts/, public/, new pages/, page-screenshots/, package.json, lockfiles and existing Vite/TypeScript/Tailwind configuration in their original locations and runnable. Keep migration/parity/ and docs/parity/ evidence. Do not relocate, rename or retire originals during P2; retain them through P9 and the P10 soak. Cleanup remains a P11 task.

Use native Windows/Python commands. Docker and local Supabase containers are not prerequisites. Hosted GitHub environments/secrets are deferred and do not gate native P2 work.

## Read first

Read MIGRATION_STATE.md, MIGRATION_PLAN.md, docs/parity/P1_ACCEPTANCE.md, docs/parity/route-manifest.json, the P2 and database/session sections of docs/python-migration-plan.md, README.md, package.json, tailwind.config.js, vite.config.ts and src/App.tsx. Inspect existing working-tree changes and applicable AGENTS.md instructions; preserve user work.

Read the private root .env only as needed to identify the approved Supabase target and legacy configuration. Never display credential values. Confirm the CLI link and any pooler metadata match that same project; do not trust an old tracked .temp connection string without checking it.

Historical P2 instructions that require root-level Python files, rewriting the legacy .env.example, Docker builds or four preexisting application tables are superseded by this brief.

## Bounded implementation choices

1. Use Python 3.12 and a supported Django LTS release, verified against official documentation at implementation time. Use the available uv tool and lock compatible dependencies under migration/django/. If Python 3.12 is absent, acquire it locally through uv without replacing the user's system Python.
2. Use a dedicated django Postgres schema for django_migrations and django_session. The default alias authenticates as a dedicated django_app login role with Django-state privileges only, no public CREATE privilege and no public application-table privileges. Preserve existing project-wide PUBLIC ACLs; if PUBLIC currently grants schema USAGE, record that inherited metadata-level access and verify it confers no app-table access.
3. Configure a separate supabase alias with search_path=public and a dedicated django_data connector role. During P2 this role has database connectivity and metadata-query capability only: no application-table privileges, no django-schema access and no authenticated-role membership. P5b owns granting the narrowly reviewed role/context capability for user-scoped queries.
4. Both roles must be NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT and NOBYPASSRLS. Ordinary runtime connections never use postgres, supabase_admin or service_role. Privileged CLI access is limited to the explicit role/schema bootstrap and catalog checks.
5. Enable Django sessions without Django account models, admin or AuthenticationMiddleware. Do not implement sign-in, SupabaseUser hydration, token storage/refresh or OAuth in P2; these belong to P4.
6. Build CSS with the standalone Tailwind CLI using the existing major-version/token contract. Preserve current colors, type, spacing and responsive tokens, including primary #004ac6 and Hanken Grotesk. Do not introduce a Tailwind major-version redesign. Legacy Node tooling remains available.
7. Existing desktop images are accepted manual references; numeric pixel tolerances and mobile/authenticated matrix captures are still deferred. They do not require a page port during P2.

These were bounded P2 choices, not retrospective owner answers to every historical product question. The completed P2 report records the implementation evidence.

## Implementation sequence

### 1. Create the isolated Python project

Create migration/django/manage.py, pyproject.toml, uv.lock and config/settings/base.py, dev.py and prod.py, plus URLconf, WSGI/ASGI modules and minimal apps/core and apps/db packages.

Install only dependencies required for this foundation: Django, the psycopg driver, appropriate static serving/configuration helpers if used, and focused development checks such as ruff, mypy with Django typing support, pytest and pytest-django. Do not install the entire future speech/AI/service dependency list.

Provide a migration/django/.env.example with placeholders and a private ignored migration/django/.env for actual development values. Keep legacy environment settings in place. Generate needed local secrets privately; do not print them or place passwords in committed SQL, commands, reports or browser code.

Provide native setup/run/build commands in migration/django/README.md. Bind development startup to loopback on a port distinct from the legacy stack, normally 8000.

### 2. Bootstrap only Django roles and state

Prepare supabase/bootstrap/django_app_role.sql and the necessary private bootstrap invocation. It must be idempotent, check existing role attributes and ownership, and create/grant only the two restricted connector roles and the django schema. Do not alter public app tables, Auth, Storage, project-wide PUBLIC grants or existing migration history.

The owner has authorized this bounded setup on the current testing project; execute it when implementing P2 if CLI access works. Supabase db query --linked can use the authenticated Management API without Docker. Keep generated role passwords in ignored local files and pass SQL through a private file rather than exposing passwords in command arguments.

A Management API query does not prove psycopg runtime connectivity. Derive/verify the correct direct or pooler endpoint for the same project and establish separate runtime connection strings with the generated restricted-role credentials. Supabase API anon/service-role keys are not Postgres passwords.

Do not create a role with broader privileges to get past a connection failure. Continue the scaffold and offline checks if runtime access is unavailable, record the exact missing connection requirement, and leave dependent P2 gates incomplete.

### 3. Enforce database alias boundaries

Implement apps/db/router.py and the minimal connection/probe helpers. Django bookkeeping routes and migrates only through default in the django schema. The supabase alias is metadata-only in P2; it must not accept migrations or Django session access.

Run Django migrations only with --database=default. Ensure the migration recorder itself lands in django. Compare the public table catalog before and after bootstrap/migration: it must remain unchanged.

The test project is empty. Do not invent public-table DDL or hardcode an inspectdb requirement for absent tables. Any future verified public models must be managed=False and route through supabase; no application models are required in this phase.

Do not implement request claims, SET LOCAL ROLE authenticated, a user-query guard or full pooler/RLS semantics yet. P5b owns that proof and data-access layer.

### 4. Add a real foundation health endpoint

Expose /healthz only. Use bounded metadata probes on both aliases: SELECT 1 plus connection-role/current-schema checks and role privilege checks appropriate to the alias.

Return 200 only when configured connectivity and role/schema boundaries pass; return a sanitized 503 otherwise. Do not expose connection strings, role passwords, raw SQL errors or credential values in HTTP output.

Check that default uses django_app in django, supabase uses django_data in public, neither bypasses RLS, and the data connector cannot access Django bookkeeping. Do not query application rows, Supabase Auth or paid providers.

Do not mount any of the 25 legacy page routes, a proxy, Auth/API endpoints or admin. Route-manifest equality with Django URLs becomes a later page-wave check; P2 must not create 25 placeholder pages to satisfy it.

### 5. Prove static and token tooling

Create a minimal templates/base.html, static source directory and generated static output within migration/django/. Base-template scaffolding is allowed; full public/application shells and page content belong to P6/P7.

Copy only required design-token definitions and reference assets into the new folder, recording their original paths. Do not edit the legacy Tailwind config. Obtain and pin a compatible platform-specific standalone Tailwind binary; keep downloaded executables/generated CSS gitignored.

Build a small template fixture that exercises real legacy token classes, then run collectstatic. Verify the compiled CSS contains the expected primary color and required font/spacing token output. Document commands that work from a fresh native setup.

### 6. Validate and write the handoff

Run meaningful checks for settings/startup, URL scope, routing/migration boundaries, native static output and safe health failures. Run live metadata/privilege checks on the approved hosted test target when available.

Use temporary local databases for offline framework/router tests where appropriate. Label them as unit checks; they do not prove hosted Supabase behavior. Never let pytest automatically create/drop a database, flush a schema or run an unbounded migration against the hosted testing project. Live checks inspect metadata or use narrowly scoped transactions without deleting state.

Run uv-based dependency consistency checks, Django check, default-only migrate, collectstatic, ruff, mypy and the focused pytest suite. Check prod settings with deployment checks and record relevant findings without deploying anything.

Update docs/foundation/P2_REPORT.md and docs/foundation/django-owned-state.md with commands, actual versions, role/schema results, test evidence, source paths, environment and outstanding gates. Synchronize the migration state/plan and migration-status paragraphs.

## File boundaries

New application/tooling files belong under migration/django/, including:

- manage.py, pyproject.toml, uv.lock, .env.example and README.md
- config/, apps/core/, apps/db/, templates/, static source/build inputs and focused tests
- small native setup/build helpers when needed

Shared additions:

- supabase/bootstrap/django_app_role.sql for the restricted roles/schema bootstrap
- docs/foundation/django-owned-state.md and docs/foundation/P2_REPORT.md

Existing-file changes are limited to additive .gitignore rules, MIGRATION_STATE.md, MIGRATION_PLAN.md, prompt.md for handoff status, the README migration paragraph, and short current-status corrections in docs/python-migration-plan.md and docs/security-remediation.md. Preserve existing changes.

Do not change legacy application/service code, package manifests, original screenshots, historical SQL migrations or public application objects. P3 services, P4 Auth, P5a schema reconstruction, P5b application/Storage RLS, P6 shells/proxy and P7 page ports remain outside P2.

No commits, pushes, publication, deployment, shared Git-history changes, destructive resets or legacy cleanup are part of this prompt.

## P2 completion gates

P2 is complete only when:

- The locked Python project starts natively beside the legacy stack and Django checks pass.
- The approved hosted project is reached by both restricted runtime aliases; no elevated ordinary runtime connection is used.
- Role flags, schema privileges, alias identity and session isolation pass live metadata checks.
- Django bookkeeping exists only in django and the public app-table catalog remains unchanged.
- Only the foundation health endpoint is exposed; health correctly reports failures without leaking private values.
- Standalone Tailwind and collectstatic succeed with the preserved token contract.
- Focused tests, ruff and mypy pass; environment-dependent checks are explicitly reported.
- The report provides reproducible setup/run/check commands, preserves P1 carryovers, and records source references.
- All original folders remain in place and the legacy configuration is preserved.

Report incomplete gates accurately. Owner acceptance of P1 exceptions does not authorize inventing passing P2 evidence. Prepare a P3 prompt only after P2 acceptance and a user request.
