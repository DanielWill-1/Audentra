# Audentra Django application

This is the active application. The former React/Vite and Express source is archived under [`../../legacy/`](../../legacy/) and is not part of the Django build or runtime. The locked Waitress/WhiteNoise runtime, settings, service boundary, and runbooks are maintained here; production deployment remains deferred. See [P10 readiness](../../docs/deployment/P10_READINESS.md).

See the [P10 preparation handoff](../../HANDOFF_2026-10-15_P10_PREPARATION.md), [P7 finding closeout](../../docs/pages/P7_SR_CLOSEOUT_2026-10-13.md), [P7/P8 matrix](../../docs/pages/P7_P8_CLOSURE_MATRIX.md), and [P9 task](../../docs/parity/P9_IMPLEMENTATION_PROMPT.md), [acceptance matrix](../../docs/parity/P9_ACCEPTANCE_MATRIX.md), and [report](../../docs/parity/P9_REPORT.md). The older P7 session review remains a dated historical record.

P4 development Auth and P5 hosted data/RLS/Storage/pooler acceptance pass; see [P4 report](../../docs/auth/P4_REPORT.md) and [P5 verification](../../docs/data/P5_VERIFICATION.md). P7 routes resolve directly to Django pages and application views; the React proxy and route rollback bridge have been retired.

## Local operation

The supported local launch is the repository-root [`start-local.ps1`](../../start-local.ps1) command described in the [root README](../../README.md). It starts the `local-supabase` profile with loopback Supabase services, applies pending Supabase forward migrations without a reset, builds and collects static files, applies Django migrations to the local default database, and runs the Waitress server. It does not reset the local database.

The [P10 local runbook](../../docs/deployment/P10_LOCAL_RUNBOOK.md) contains the underlying manual setup, guarded local reset, demo-account recovery, health checks, and troubleshooting steps. `demo-http` remains a separate explicit profile for a hosted development/demo target. Do not use it for normal local launches or local reset operations.

`/livez` reports process status; `/readyz` checks both database aliases; `/healthz` retains the earlier database-readiness behavior. The local profile uses HTTP on loopback, sets `DEBUG=False`, and disables secure-cookie and HTTPS-redirect flags only for local HTTP. Production settings retain secure cookies and HTTPS redirect. The [deployment runbook](../../docs/deployment/P10_DEPLOYMENT_RUNBOOK.md) describes the deferred same-host TLS proxy contract, and the [rollback runbook](../../docs/deployment/P10_ROLLBACK_RUNBOOK.md) separates code/traffic rollback from targeted data repair.

The active runtime, P9/P10 local acceptance, and P11 local retirement are recorded in the [migration state](../../MIGRATION_STATE.md), [P10 release-candidate review](../../docs/deployment/P10_W5_RELEASE_CANDIDATE_REVIEW.md), and [P11 closeout](../../HANDOFF_2026-10-17_P11_LEGACY_RETIREMENT.md). Deployment and production soak remain deferred. Physical mobile testing and physical recording edge cases/audibility remain excluded or reserved for owner review.

## Test isolation and current handoff

The normal pytest configuration uses config.settings.test. Both aliases are in-memory SQLite databases, overriding the hosted URLs loaded by base settings. Never point pytest at the hosted Supabase project or use it to create, drop or flush that database. Live read-only foundation checks run separately under development settings. The [P2 review](../../docs/foundation/P2_REVIEW.md) records 9 passing tests and the repeated foundation checks.

P3 service endpoints are disabled by default. For deterministic local service checks, set P3_SERVICES_ENABLED=true with SPEECH_BACKEND=mock, TTS_BACKEND=mock and USE_MOCK_AI=true. Real modes require their private provider configuration; provider failures are surfaced instead of being replaced with successful mock data. P4 makes verified identity mandatory and requires CSRF for cookie-authorized writes. The React-to-Django authentication handoff was removed from the revised scope; use the Django site for development Auth. See the P3 contracts/report and P4_REPORT.md for evidence.

## P5 application data

P5 adds unmanaged Django models and services for profiles, templates, UUID-based sharing, reviews, scheduling, filled forms and private template files. Supabase remains the data store; all application queries use a verified principal and a transaction-local `authenticated` RLS context on the `supabase` alias. Django sessions/migration state remain on the separate `default`/`django` alias.

## Recent Forms and Activity Log

Recent Forms is based on `filled_templates`, not browser storage. The dashboard queries only five saved-form summaries; the full list pages through 25 summaries at a time. Opening a row uses its exact UUID, checks owner access, and shows the stored answers with JSON values preserved. Download returns a no-store JSON attachment. Saving a voice form carries a submission UUID through the form steps; the owner/key unique index and immutable-key guard prevent retry duplicates. A same-key, same-payload retry returns the original record, while changed payload under a used key returns an error and keeps the entered values on the page.

Activity Log uses the unmanaged `ActivityEvent` model and an allowlisted presentation registry. PostgreSQL triggers record successful form, template, share, review, and schedule changes inside the business transaction. The feed is owner-scoped by RLS and never accepts direct authenticated insert or update. Only the owner can remove a feed row; removal does not affect the linked saved form or other business data. The database events are personal history, not recipient notifications or a tamper-proof audit trail.

The local Supabase migrations `20261017120000_activity_recent_forms.sql` and `20261017123000_activity_capture_completeness.sql` add the schema and capture rules. New local runs apply pending files with `supabase migration up --local`; the root launcher runs this after `supabase start`. The local acceptance SQL uses synthetic UUID accounts inside a transaction and finishes with rollback. See the [feature plan](../../docs/features/ACTIVITY_RECENT_FORMS_IMPLEMENTATION_PLAN.md), [closeout](../../docs/features/ACTIVITY_RECENT_FORMS_CLOSEOUT_2026-10-17.md), and [local runbook](../../docs/deployment/P10_LOCAL_RUNBOOK.md).

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
