# P5 — Supabase Schema, Storage and Django Data Access

**Prepared:** 2026-10-11

**Mode for this handoff:** P5 implementation is in place. Continue only with the remaining P5 verification gate; do not repeat completed schema/service work or expand into P6/P7.

**Detailed continuation record:** [HANDOFF_P5_P6.md](HANDOFF_P5_P6.md) covers session history, remaining P5 proof, and preparation through P6. This file remains the active P5 brief.

**Use:** Active P5 scope and handoff. The owner requested P5 implementation on 2026-10-11; actual work and the open gate are recorded in [P5_REPORT.md](docs/data/P5_REPORT.md).

**Authority:** Latest owner instructions, [MIGRATION_PLAN.md](MIGRATION_PLAN.md), [MIGRATION_STATE.md](MIGRATION_STATE.md), then this bounded implementation brief. Older conflicting directions do not override the current development scope.

## 1. Goal

Give the existing Django application a reproducible Supabase application schema and a tested data layer for profiles, templates, scheduling, sharing, reviews, filled forms and template-file Storage.

Complete schema reconciliation before implementing application queries. Enforce database RLS using the verified Supabase identity, preserve application data, and leave the original application available for comparison.

P5 produces backend services and verification evidence for later pages. The shared website shell belongs to P6; dashboard, template, scheduler and other page migrations belong to P7. Finishing P5 does not mean those pages are migrated.

## 2. Accepted starting point

| Phase | Handoff |
|---|---|
| P0 | Complete per owner report; do not claim this brief independently reverified history cleanup or every provider rotation |
| P1 | Finalized with accepted exceptions; retain the 25-route reference and accepted screenshots |
| P2 | Django foundation under migration/django; dedicated django schema; restricted django_app and django_data logins |
| P3 | Speech/extraction code corrections recorded; live provider/device evidence remains a later voice/parity gate |
| P4 | Development Supabase Auth accepted by the owner; fresh signup/login/session/refresh/password-change/logout and HTMX verification recorded |
| P5a | Baseline and guarded remediation implemented/applied; isolated baseline, empty-target replay, idempotence and RLS checks passed; linked target inventory refreshed |
| P5b | Django data services and hosted direct-connection checks pass; transaction-pooler/user-switch verification remains open, so P5 is partial |

Use [P4_REPORT.md](docs/auth/P4_REPORT.md) for actual P4 evidence and [the archived P4 brief](docs/auth/P4_IMPLEMENTATION_PROMPT.md) for its executed scope.

P4 carryovers:

- Exposed-key retirement remains approval-dependent. Replacement/local consumer cleanup does not prove revocation. Automatic approval review rejected broader revocation; do not retry or bypass it under P5 authorization.
- Development signup confirmation is disabled with authorization. Reconsider it before production.
- Email-based forgotten-password recovery remains unavailable. Disabling signup confirmation does not solve recovery.
- These are recorded followups, not instructions to reopen accepted Auth or add SMTP during P5.

The last recorded hosted catalog, dated 2026-10-10, had **zero public application tables and zero Storage buckets**. This is historical evidence, not permission to assume the target is still empty. Reinspect before drafting or applying changes.

## 3. Non-negotiable constraints

1. Development only; existing Supabase project and database remain intact.
2. Supabase remains the sole Auth provider. Use the current Python SDK Auth/session implementation; no Django Auth, OAuth expansion or React Auth compatibility work.
3. Native Windows and existing hosted Supabase tooling. No Docker, paid services, custom SMTP or new mandatory cloud subscription.
4. Keep migration application code in migration/django. Preserve src, server, new pages, backups and original design/reference folders in place.
5. Historical files in supabase/migrations, including P0 hardening, are read-only references. Append new remediation migrations; never insert a fabricated migration before an old timestamp.
6. No project/database reset, application-table truncation, dropping existing data, bulk identity import, old-account testing or migration of historical customer rows.
7. Existing database aliases remain separate: default for Django state; supabase for application data.
8. Application models use managed = False. Django migrations must never create or modify Supabase application tables.
9. No service_role, secret API key, postgres, supabase_admin, table-owner or BYPASSRLS connection in ordinary request data paths.
10. Minimal JavaScript. No new frontend framework, browser token storage or frontend data migration.
11. Use fresh generated test accounts and synthetic records. Clean up only exact resources created by the current verification run.
12. Preserve unrelated working-tree changes. No commit, push, deployment, Git history rewrite or automatic key retirement is part of P5.

## 4. Read and inventory before coding

Read these sources in focused sections; check actual files and imports rather than assuming historical paths still exist.

### Current authority and evidence

- MIGRATION_PLAN.md: P5a/P5b, architecture constraints, decision register, folder preservation.
- MIGRATION_STATE.md: current evidence and carryovers.
- docs/foundation/django-owned-state.md, P2_REPORT.md and P2_REVIEW.md.
- docs/auth/P4_REPORT.md, P4_CONTRACTS.md, P4_DEVELOPMENT_CONFIG.json and P4_HOSTED_FLOW_RESULTS.json.
- docs/services/P3_REVIEW.md and P3_REPORT.md.
- docs/parity/P1_ACCEPTANCE.md, route-manifest.json and testing-schema-summary.json.
- docs/python-migration-plan.md: data-access design, P5a/P5b and call-site appendix. Current owner scope overrides its Docker, legacy Auth, activity and service-role fallback directions.
- docs/tables.md: historical audit only. Inferred columns, public-bucket advice and the instruction to insert an old migration are not verified schema authority.

### Actual implementation and references

- migration/django/apps/db/router.py and apps/core/health.py.
- config/settings, apps/accounts/principals.py, middleware.py, sessions.py and services/tokens.py.
- Current API identity/CSRF boundary and regression tests.
- supabase/bootstrap, supabase/config.toml, all existing migrations and Supabase SQL tests.
- src/lib/templates.ts, scheduler.ts and both Supabase client modules.
- Mounted template builder/card flows, src/pages/FilledTemplates.tsx and the filled-form save in src/pages/AIVoiceAutoFill.tsx.
- Sharing/review callers, nested relation reads and actual profile operations.
- Team components, dashboard/scheduler preferences and src/lib/activity.ts to identify mocks and deferred decisions.
- Existing schema backup DDL only when needed, handled locally without displaying personal rows, identities or credentials.

Produce **docs/data/P5_OPERATION_INVENTORY.md** with one row per actual operation:

| Required field | Meaning |
|---|---|
| Source/caller | Exact current file/function and whether reachable, unused or demo |
| Operation | Read/write/search/aggregate/bulk/Storage action |
| Object/shape | Tables, columns, joins, JSON shape, expected result and ordering |
| Actor | Owner, recipient, reviewer, member or anonymous |
| Authorization | Required access and ownership fields |
| Python target | Planned selector/service/model module |
| Disposition | Core P5, pending decision, later phase or unused |
| Evidence | Schema reference and planned verification |

Reconcile the old “38 call sites” claim against the current source. Do not force an obsolete count or add 38 HTTP endpoints merely to match it.

## 5. Decisions and bounded defaults

Record facts, owner decisions and implementation defaults separately in **docs/data/P5_DECISIONS.md**.

| Topic | P5 treatment |
|---|---|
| Current target | Existing owner-approved development project only; verify CLI link and private runtime configuration agree |
| Q3: schema provenance | Establish a dated schema reference. For absent objects, specify a new development contract explicitly; do not present an inferred table as recovered historical DDL |
| Historical identities/data | No import, preservation test or old-account acceptance requirement; existing application data still must not be deleted |
| Profile data | Own-profile read/update and fresh-user initialization are core; exact columns come from reconciliation; no global email directory |
| Q5: preferences | Browser state versus per-user persistence remains undecided; do not add preference schema until resolved |
| Q6/Q7: team/demo flows | Inventory separately; no invented organization system, invitation email service or demo-to-real conversion without a bounded decision |
| Existing share/review operations | Core under the accepted UUID account-sharing contract; viewer reads, editor edits content, admin manages shares, owner controls visibility/deletion; reviews are visible to author and template owner |
| Q13: scheduling/timezone | Preserve verified date/time semantics; document ambiguity and defer product timezone correction to its decision gate |
| Q16: generated share link | Record the currently unrouted link; no new anonymous/public share route in P5 |
| Q21: activity | Retain the future feature and route reference; do not add an activity backend or seed fake activity in P5 |
| Storage visibility | Owner accepted private file access scoped to owners and authorized share recipients. The private bucket and policies are implemented; visible-template discovery does not make a file public |

Do not ask the owner again about already accepted development Auth, no Docker, original-folder preservation or retaining activity.

If Q3 cannot be established from a trustworthy schema reference, prepare the proposed development schema from historical DDL plus observed caller contracts, label every inference, and obtain a focused decision on that concrete proposal before applying it. This is a schema-design decision, not permission to erase data. Continue independent inventory and verification preparation while it is pending.

## 6. P5a — Reconcile and provision safely

### A1. Read-only target and privilege preflight

1. Inspect environment variable names and configuration without printing secret values.
2. Verify CLI/project/runtime target consistency and record the selected development project, date, database/CLI versions and pooler mode.
3. Read catalog metadata for public tables, columns, constraints, indexes, functions, triggers, views, RLS flags, policies, grants and role memberships.
4. Inspect the existing django schema/session placement and both connector roles without reading session tokens.
5. Inventory bucket configuration and Storage policies; do not list or download unrelated objects.
6. Record application row counts and targeted aggregate integrity checks only where relevant objects exist. Avoid personal-row exports and Auth-user inventories.
7. Separate application-owned objects from provider-owned auth/storage machinery. Do not dump provider credentials or replace provider schema.

Outputs: **docs/data/P5_TARGET_INVENTORY.json** and sanitized **supabase/schema_dump/** references.

### A2. Establish reference and classify every delta

Compare current catalog, historical migrations, trustworthy backup schema DDL if necessary, and the operation inventory.

Pay particular attention to:

- templates, scheduled_events and public users profiles.
- template_shares, template_reviews and filled_templates: repository history does not provide complete creation DDL.
- teams, team_members, team_invites and team_activity: historical objects do not automatically authorize implementing their demo UI.
- Duplicate/broad policies, missing foreign keys and incomplete write policies.
- P0 self-scoped profile hardening and any security-definer functions.
- template-files bucket, object paths and actual Storage read/write requirements.
- Scheduler date/time types, defaults, enums and JSON fields.
- Sharing by email versus user_id, pending recipients, duplicate shares and review rating/status behavior.

Classify each difference:

1. Live-only objects.
2. History-only objects.
3. Divergent definitions.
4. Configuration outside application DDL.
5. Data-shape/integrity findings.
6. Proposed new development contracts for genuinely absent objects; label these distinctly from recovered definitions.

Each entry needs provenance, intended disposition, affected data/access, corresponding artifact and verification status. Missing repository DDL does not establish that a live table is absent. IF NOT EXISTS does not establish that an existing definition is correct.

### A3. Draft two separate SQL paths

**Fresh-install baseline:** supabase/baseline/00000000000000_baseline.sql.

- Application schema, constraints, indexes, triggers, grants and reviewed RLS definitions.
- Required platform prerequisites documented separately; do not recreate Supabase Auth or Storage internals.
- Baseline runs only on a verified fresh verification/new environment, never as a blind replacement of the linked project.
- Include explicit Storage provisioning/configuration instructions where they cannot be represented safely in baseline SQL.

**Existing-target remediation:** new timestamped supabase/migrations/*_p5_reconcile_*.sql.

- Only verified missing objects and explicitly reviewed corrections.
- Check actual definitions and fail clearly on unexpected drift.
- Guard constraints, policies, indexes and table existence; validate preconditions for existing rows.
- Do not silently skip incompatible types/constraints or overwrite existing policies.
- No destructive schema/data changes. Any necessary replacement of an unsafe policy must be individually documented and authorized, retaining tested participant access.
- Avoid broad PUBLIC grants, permissive true policies and elevated function ownership used as shortcuts.
- Use transactional application where supported and document any nontransactional operation.
- Do not blindly run supabase db push against the historical migration directory.

Storage provisioning must name the exact bucket, visibility, limits, object-path contract and policies. Do not overwrite hosted Auth settings through a broad config push.

### A4. Verify in isolation, without Docker

Choose an available free verification environment before executing SQL.

- Prefer an already available isolated Supabase development environment or native PostgreSQL scratch database with the necessary roles/extensions/helpers documented.
- Native PostgreSQL can verify application SQL and reconciliation; it does not replace real hosted Supabase Auth, API, Storage or pooler verification.
- If the preflight proves the target has no application schema or data to restore, build the isolated remediation fixture from that verified empty application state plus minimal documented provider stubs. Record that this is an empty-target equivalent, not a full Supabase restore.
- Never run db reset, manage.py flush, Django test-database creation or a fresh baseline against the linked application database.
- Replay historical migrations only in isolation. Capture the first actual failure and its cause; do not edit history to make the replay appear successful.
- Apply the baseline to a clean verification database and compare its catalog to the documented intended state.
- Apply remediation to an isolated restored schema copy of the target, using synthetic data to exercise relevant constraints. Preserve constraints/policies/functions needed for a meaningful comparison; document any omitted platform objects.
- Apply remediation again and prove no unexpected catalog change.
- Normalize harmless dump noise without discarding semantic differences in grants, policies, constraints, function security or defaults.

If no safe isolated environment is available, complete the artifacts and report the exact verification dependency. Do not substitute SQLite for RLS/SQL proof or silently waive the restored-copy gate.

### A5. Apply only the reviewed development changes

After isolated proof and applicable authorization:

1. Recheck target identity and catalog immediately before application.
2. Retain a private scoped schema/config snapshot; use data backup only if a proposed operation actually needs it, without committing personal data.
3. Apply the explicit reviewed remediation/provisioning artifacts through an administrative path separate from runtime.
4. Compare post-application catalog, row-count preservation and RLS/grants against the intended state.
5. Verify an unchanged second application.
6. Record which exact statements/configuration were applied and which remain pending.

An implementation request authorizes preparing and executing its safe, scoped development work. Still resolve missing schema/product decisions and obey tool approval rules before dependent writes. If automatic approval review rejects an action, report that rejection, continue unaffected work, and do not retry through another tool to bypass it.

**P5a exit:** trustworthy reference/disposition, classified deltas, verified baseline and restored-copy remediation (or an empty-target equivalent where the verified target has no app schema/data), idempotence, preserved data, and exact target provisioning results. A written SQL file or successful SQL exit alone is insufficient.

## 7. P5b — Implement the Django data layer

### B1. Prove the RLS boundary before feature services

Implement under migration/django/apps/db:

- rls_context and require_rls_context.
- A query-time guard rejecting unscoped application queries on the supabase alias.
- Reviewed role/grant setup in separate administrative SQL.
- Models routed to the correct alias; migrations on supabase remain denied.

Required behavior:

1. Accept only a server-verified Supabase identity from the existing Auth boundary. A UUID or client-submitted user_id is not authentication.
2. Open transaction.atomic on supabase. Set parameterized request.jwt.claims and SET LOCAL ROLE authenticated on the **same connection within that transaction**.
3. Pin the supported role/search path; never accept a role or arbitrary claim dictionary from the browser.
4. Construct only policy-required trusted claims. Email-based policies require a verified identity email; editable user metadata cannot grant permissions.
5. Keep tokens in the existing server token service. Do not add JWTs to SupabaseUser, templates, responses or logs.
6. Queries outside the context fail at execution time, including raw cursors and ORM queries.
7. Reject nested contexts for different users; define and test same-user nesting and rollback behavior.
8. Materialize selectors, aggregates and related data before leaving the context. Lazy queryset/template evaluation must not issue later unscoped queries.
9. Reset transaction-local role/claims after success and failure. Prove user switching on reused connections and under the actual hosted pooler.
10. Keep both logins restricted: no superuser, database/role creation, inherited broad privileges or BYPASSRLS. Only django_data receives the narrowly reviewed authenticated-role capability.
11. Default keeps only Django-owned state access. Supabase cannot read django_session or Django bookkeeping.
12. Do not fall back to service-role SQL plus application filters if this proof fails.

**Existing foundation integration:** apps/core/health.py currently requires no role memberships. Update its expectations narrowly for the reviewed P5 django_data membership, while retaining restrictions on django_app and unexpected memberships/grants. Provide a fixed metadata-only health inspection path that cannot become an arbitrary query bypass. Preserve /healthz and session behavior. Health must run outside a user's RLS context.

The query guard must permit its own fixed transaction/connection setup safely, then enforce application access; do not add a publicly accessible skip_guard flag or heuristic SQL whitelist that allows application queries.

### B2. Models, selectors and write services

Suggested modules, adjusted to verified contracts:

    migration/django/apps/db/rls.py
    migration/django/apps/templates_app/{models,schemas,selectors,services}.py
    migration/django/apps/scheduler/{models,schemas,selectors,services}.py
    migration/django/apps/storage/services.py
    migration/django/apps/accounts/{profile_selectors,profile_services}.py
    migration/django/tests/unit/
    migration/django/tests/rls/
    migration/django/scripts/

Use small modules, explicit inputs/outputs and existing dependencies. Avoid a generic repository framework or parallel Auth implementation.

- Unmanaged models map verified table names, UUIDs, nullable columns, JSON fields, constraints and relationships.
- Reads use selectors; mutations use services with explicit field allowlists and server actor ownership.
- Ownership, reviewer/author identity and audit timestamps are server-controlled. Reject foreign-owner injection and permission escalation.
- Return stable typed results or documented errors; do not expose SQL, keys, tokens or unrelated record existence.
- Not-found and permission failures must remain consistent with the chosen access contract.
- Parameterize search, dates, identifiers and limits; bound pagination/bulk sizes.
- Preserve verified result ordering and relation behavior; avoid accidental N+1 queries or whole-table reads.
- Validation applies to new writes without rewriting unrelated existing records.

### B3. Required operation families

| Family | Required backend work |
|---|---|
| Profiles | Fresh-account own-profile initialization, own read/update and safe metadata mapping; prove repeat initialization is safe and cannot edit another user |
| Templates | Create/read/list/update/delete, category filtering, visibility changes, search and verified relation reads |
| Sharing | Create/remove/list sent/list received, visibility and role changes where the contract permits; enforce owner/recipient separation and duplicate behavior |
| Reviews | Queue/list/create/update/list per template; preserve verified pending rating/status semantics and reviewer/owner access |
| Scheduler | Create/detail/list/update/delete, date ranges, upcoming, status/type filters, completion/cancellation, stats/search and verified bulk operations |
| Filled forms | Save/list/delete and supported detail reads; server-owned user_id and verified JSON structure; no voice recorder migration |
| Template files | Bounded upload, authorized read/download and supported cleanup/replacement using acting-user Storage credentials |

Implement every **core** inventory operation or report it pending explicitly. Pending product decisions must not be hidden as “implemented,” mocked successful writes or empty lists.

For fresh profile initialization, choose one reconciled mechanism: reviewed Auth trigger or idempotent user-scoped service. Do not add two competing provisioning paths. A broken profile trigger must not break signup silently; exercise the P4 signup regression after provisioning. Do not backfill every historical account.

### B4. Sharing/review policy contracts

Before implementing mutations, write an operation-by-role table in **docs/data/P5_RLS_MATRIX.md**.

At minimum distinguish owner, intended recipient/reviewer, unrelated authenticated user and anonymous user. Where applicable distinguish viewer/editor/admin and pending/active membership.

- A share must not permit sharing somebody else's template.
- A recipient must not grant themselves higher privileges, transfer ownership or remove other recipients' shares.
- Owner/recipient reads of referenced templates must agree with share permissions; having access to a share row alone is insufficient.
- Review creation/update must verify eligibility and actor identity. Do not expose all users' reviews because a historical SELECT policy was broad.
- Email-based access must define normalization, verified-email source and pending-recipient behavior.
- Prevent recursive team policies and privilege escalation through mutable membership fields where teams are in approved scope.

Necessary policy corrections belong to the P5a reconciliation artifacts and verification. Return to that gate for a discovered deficiency; do not alter policies ad hoc while writing feature services.

### B5. Storage adapter

Use the official Supabase Python SDK or its supported Storage client with the **acting user's access JWT** and configured publishable key. Isolate client auth state per operation and use finite timeouts. Reuse P4's token/refresh boundary rather than introducing browser sessions or a second token cache.

- Store bucket/object identifiers as the authoritative reference, not an arbitrary caller-provided external URL.
- Validate supported file type/size and path input; use server-generated identifiers.
- Establish an ownership-safe path contract in P5a. The old templates/{templateId}.{ext} path is a reference, not proof of safe ownership.
- Prove owner writes and intended recipient reads; reject traversal, foreign paths and unauthorized overwrite/delete.
- Private reads use authenticated download or bounded signed URLs. A public bucket intentionally exposes public reads and must be documented and tested as such.
- Never claim private RLS read protection for public asset URLs.
- Keep database/Storage operations consistent: handle upload failures, rejected record writes and deletion failures with bounded compensation/retry behavior. Do not delete an unrelated object as compensation.
- Do not mutate storage.objects directly as a substitute for Storage APIs or RLS verification.

## 8. Verification required during implementation

This brief explicitly requires focused tests and relevant regression checks when implementation is authorized. Documentation preparation alone does not authorize hosted writes.

### Offline/unit checks

- Input validation, JSON/date conversions, search parameterization, result/error contracts.
- Server-controlled actor fields and rejected permission escalation.
- Schema-diff normalization and drift detection, plus remediation guards.
- Context state, nesting, rollback and lazy evaluation behavior.
- Storage failure compensation with exact synthetic object references.
- Model routing and migration denial for unmanaged/application tables.
- Static review for runtime elevated credentials, logs, browser tokens and unsafe SQL.
- Relevant existing regression suite, lint/type/framework/lock/static checks using the current project commands.

SQLite or mock checks are useful unit evidence; they do not satisfy PostgreSQL RLS, pooler, Supabase Storage or hosted acceptance.

### Real PostgreSQL/Supabase checks

Use at least two fresh generated accounts plus anonymous access; add a third if unrelated-user and recipient cases cannot be separated with two. No emails, legacy accounts or paid speech calls are needed.

1. Baseline/catalog equivalence, restored-copy remediation and repeat-application proof.
2. Authenticated role/claims on the actual configured pooler; auth.uid resolves to the acting account.
3. Out-of-context raw/ORM queries rejected and no app access through the raw connector role.
4. Correct allow/deny matrix for SELECT/INSERT/UPDATE/DELETE on each in-scope table.
5. Own-profile protection, fresh signup provisioning and no global profile/email enumeration.
6. Ownership spoofing, share/review role escalation and foreign-reference attacks rejected.
7. User A → user B → no context on reused connections; include rollback/failure paths and concurrent requests.
8. Default/supabase alias separation and unchanged session/refresh/logout behavior.
9. CRUD/search/filter/stat/relation results compared with verified contracts using synthetic fixtures.
10. Storage upload/download/deletion and owner/non-owner/anonymous behavior under the approved visibility model.
11. Permission failures produce no unauthorized partial write or destructive compensation.
12. Real P4 signup/login/protected-session/password-change/logout regression after schema/grant changes.

Differential comparison may use the preserved helper behavior and a small user-scoped reference client against synthetic records. No React Auth handoff or full old-page login harness is required. Where old behavior is insecure, broken or mock-only, document the intended contract and explicit discrepancy instead of reproducing it.

Hosted probes must opt in, verify the exact development target, track created account/row/object IDs and clean only those resources in finally blocks. Use administrative credentials solely for separate provisioning or exact probe cleanup. Ordinary assertions must run as the user, not as admin.

Record test command, date, environment, result, sanitized artifact and limitations. A skipped check remains pending. Do not delete generated Auth accounts before cleaning their owned Storage objects and required fixtures.

## 9. Deliverables and completion gates

### Required artifacts

| Artifact | Contents |
|---|---|
| docs/data/P5_OPERATION_INVENTORY.md | Audited current call sites and disposition |
| docs/data/P5_DECISIONS.md | Provenance, owner choices, bounded defaults, unresolved scope |
| docs/data/P5_TARGET_INVENTORY.json | Sanitized dated target/catalog/config metadata |
| supabase/schema_dump/ | Sanitized schema references, replay result and classified diffs |
| supabase/baseline/00000000000000_baseline.sql | Verified fresh-install application baseline |
| New supabase/migrations/*_p5_reconcile_*.sql | Guarded reviewed existing-target remediation |
| docs/schema-reconciliation.md | Reference provenance, per-delta disposition, application/verification procedure |
| docs/data/P5_CONTRACTS.md | Python operation inputs/outputs, actor/access rules and Storage contract |
| docs/data/P5_RLS_MATRIX.md | Expected and actual per-role access, including denial cases |
| docs/data/P5_VERIFICATION.md | Commands/results, environments, baseline/idempotence/RLS/Storage proof |
| docs/data/P5_REPORT.md | P5a/P5b status, implemented operations, applied changes, limitations and next gate |
| MIGRATION_STATE.md / MIGRATION_PLAN.md | Actual completion state and carryovers |
| migration/django/README.md | Native run/test setup, config variable names and data-layer usage |

No secret values, personal rows, raw JWTs, database passwords or complete Auth exports in these artifacts. Schema-only exports still need review for sensitive defaults/function bodies.

### Current execution status (2026-10-11)

- The fresh baseline + Storage policy artifact and both P5 migrations have passed isolated native PostgreSQL checks. Their normalized public/Storage schema-only dumps match exactly; empty-target remediation was also applied twice and did not change the normalized dump on the second application. The linked development project now has six application tables with RLS, 23 public policies and four Storage policies.
- Django profile, template, share, review, scheduler, filled-form and private-file services are implemented. The hosted direct-connection synthetic probe passed and cleaned its three accounts.
- P5 remains partial because the required hosted shared-transaction-pooler user-switch proof has not run. The current local `DJANGO_SUPABASE_DATABASE_URL` is direct.
- To close the gate, use the exact `django_data` shared transaction-pooler connection string shown by Supabase Dashboard → Connect in the ignored `migration/django/.env`, then rerun `scripts/check_p5_hosted_data.py`. Keep credentials local. Do not invent/compose the pooler host, widen the runtime role for `pg_dump`, or mark the direct-host result as pooler proof.
- [P5_VERIFICATION.md](docs/data/P5_VERIFICATION.md) records the commands and exact evidence. [P5_REPORT.md](docs/data/P5_REPORT.md) is the as-built status.

Supabase CLI's linked dump unexpectedly attempted Docker and was stopped. A native schema-only dump using the restricted `django_data` login was denied table locks, as expected for that least-privilege role. No database grants were widened; the dated catalog JSON plus reviewed SQL are the current hosted schema references.

### P5a complete only when

- Reference/rebuild disposition and dependent schema decisions are recorded.
- Every relevant delta is classified; no inferred DDL is falsely labeled authoritative.
- Fresh baseline matches the intended catalog. Remediation matches a restored-copy catalog; when the verified target has no application schema/data to restore, use an isolated equivalent empty application schema with minimal platform stubs and state that this is not a full Supabase restore.
- A second remediation application is unchanged.
- Exact development-target changes and data preservation are verified.
- Storage configuration is established for the approved contract.
- Original migration history remains unchanged.

### P5b complete only when

- P5a is complete for every implemented operation.
- Hosted role/claims/pooler/query-guard/alias proof passes.
- All core operation families are implemented and verified under real user RLS.
- Sharing/reviews permit intended participants while denying unrelated access and escalation.
- Real Storage round trips and failure handling pass.
- Fresh profile provisioning and P4 Auth regressions pass.
- Relevant regression checks pass, with pre-existing failures distinguished from introduced failures.
- Remaining feature decisions and later production/security followups are explicit.

If a required core service or mandatory verification is blocked, report **P5 partial**, identify the precise dependency, and leave the affected gate open. Optional/later features must have an explicit disposition; do not expand scope to finish them.

## 10. Rollback, handoff and execution behavior

Preserve the old source as reference throughout implementation. It is not a data rollback mechanism.

- Code/runtime rollback uses the previous code/config with compatible schema.
- Newly created empty synthetic verification resources can be cleaned by exact ID.
- Existing application data is never restored from stale personal dumps, deleted or replaced as a convenience.
- Correct schema/policy issues through reviewed forward changes. Do not claim additive DDL has no authorization or integrity risk.
- If a write fails, inspect the real partial state before retrying.

Work in small reviewable steps: inventory → schema decision/reference → isolated schema proof → scoped provisioning → RLS proof → feature services → hosted/regression checks → report.

Provide concise progress updates and continue independent work while a narrow decision is pending. Explain concrete blockers, including unavailable native verification tooling or automatic approval rejection. Avoid repeatedly diagnosing accepted P4 or asking for broad “go ahead” confirmation.

Finish with the implemented operation list, exact schema/config changes, verification results, remaining limitations and the next phase. P6 is the next shared rendering phase after this backend work; P7 page waves retain their dependency gates.

Do not overwrite this prompt with a P6 implementation brief or begin P6/P7 unless the owner requests that next handoff.

## Official references to verify during execution

- [Supabase RLS and trusted claims](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Supabase user/profile management](https://supabase.com/docs/guides/auth/managing-user-data).
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
- [Supabase bucket visibility](https://supabase.com/docs/guides/storage/buckets/fundamentals).
- [PostgreSQL role membership](https://www.postgresql.org/docs/current/role-membership.html); use documentation matching the actual hosted PostgreSQL version.

Verify current SDK and platform behavior against official documentation when implementing. The local role, pooler and access matrix must be demonstrated on this project's configuration.
