# Finish P5 fully: transaction-pooler proof and evidence closure

**Archive:** Completed P5 closure brief. Root [prompt.md](../../prompt.md) now contains the prepared P6 brief; no P6 implementation is claimed here.

**Prepared:** 2026-10-11

**Scope:** Finish P5 only. Do not start P6 or prepare its implementation brief.

**Execution status (2026-10-11): Complete.** The hosted shared transaction-pooler probe passed all 65 checks, verified A/B/A identity/claims and private-row isolation plus rollback/recovery on a reused Django client connection, and deleted all three synthetic accounts. See [P5_HOSTED_RESULTS.json](P5_HOSTED_RESULTS.json) and [P5_VERIFICATION.md](P5_VERIFICATION.md). The remaining instructions below preserve the original execution brief and its pre-run snapshot. P5 is closed; P6 has not started.

**Review snapshot:** HEAD `acba956` (`migrations begins`); working tree clean before this prompt edit. The handoff's `b66efbb`/dirty-tree snapshot is historical. Recheck Git state at execution time and preserve existing changes.

## Objective and starting point

Complete the remaining P5b gate on the existing Audentra development project's real shared transaction pooler. Strengthen the hosted probe, configure the exact restricted connection locally if available, run behavioral isolation plus existing acceptance checks, and update evidence/status.

The recorded P5 implementation is already in place:

- P5a: six application tables with RLS, 23 public policies, four Storage policies and private `template-files` configuration. Baseline, guarded empty-target remediation, idempotence, schema equivalence and native policy assertions passed.
- P5b: profiles, templates, UUID shares, participant-scoped reviews, scheduler, filled forms and private-file services implemented; six unmanaged models; separate restricted state/data aliases.
- Earlier hosted direct-connection run: 53 checks passed; three synthetic accounts created/deleted; zero emails; cleanup successful; its archived result correctly has `pooler_verified: false`.
- Local evidence: 90 pytest tests, Django checks, focused P5/app mypy and Ruff passed. Broad `mypy apps scripts` had 19 existing P4-probe findings.
- Gate completed: hosted transaction-pooler identity/role/claims isolation, user switching on a reused client connection and cleanup after commit/rollback/error all passed. P6 is unstarted; product pages are not migrated.

These are prior recorded results, not new executions. Preparing this prompt did not inspect private configuration or verify hosted state. Continue completed work; do not recreate services, reapply schema or reopen accepted Auth.

### Current continuation progress

The probe validates the project-scoped restricted login and requires behavioral A/B/A claims/private-row, transaction cleanup, forced rollback, context-guard and client-reuse checks before setting `pooler_verified`. Shared transaction mode disables Psycopg auto-prepare and session startup search-path options; health checks set search path locally inside their transaction. The previous direct-host result is preserved at `docs/data/P5_HOSTED_RESULTS_DIRECT.json`. Local checks pass (95 pytest tests, Django system check, focused mypy over 60 files and Ruff). The exact shared transaction-pooler endpoint was configured locally with the restricted `django_data` login; the hosted probe passed all 65 checks, created/deleted three synthetic accounts, sent zero emails and reported `cleanup_ok: true`. `pooler_verified` is true. P5 is complete; P6 is unstarted.

## Read first

Latest owner instructions take precedence. Read:

1. `HANDOFF_P5_P6.md`, especially sections 2, 5-8 and 11.
2. `MIGRATION_STATE.md` and the P5a/P5b architecture/scope/gates in `MIGRATION_PLAN.md`.
3. `docs/data/P5_REPORT.md`, `P5_VERIFICATION.md`, `P5_HOSTED_RESULTS.json`, `P5_TARGET_INVENTORY.json`, `P5_DECISIONS.md`, `P5_CONTRACTS.md`, `P5_RLS_MATRIX.md` and `P5_OPERATION_INVENTORY.md`.
4. `docs/schema-reconciliation.md`, `supabase/schema_dump/P5_REPLAY.md` and `migration/django/README.md`.
5. Under `migration/django/`: settings, `apps/accounts/principals.py`, `apps/db/rls.py`, `apps/db/router.py`, `scripts/check_p5_hosted_data.py`, `scripts/check_p5_rls_scratch.py` and `tests/test_p5_data_layer.py`.

Use P4 reports/contracts and other service files as needed. Later reviews/current decisions supersede older conflicting reports.

## Preserve these boundaries

- Existing development project/data intact; known project reference `pgtttjmqibxufvwehkyj`. Verify CLI/runtime project consistency before hosted work.
- Native Windows, existing environments/tools; no Docker, paid services, SMTP or Gmail.
- Supabase Python SDK is the sole Auth provider. Preserve accepted development confirmation bypass, Django/HTMX, CSRF and server-verified principals.
- Separate `DJANGO_DATABASE_URL` (state / `django_app`) and `DJANGO_SUPABASE_DATABASE_URL` (application data / `django_data`). Do not change the state connection to solve this gate.
- Runtime assertions use verified user RLS, never privileged/BYPASSRLS accounts. Existing admin test credentials are solely for separate exact generated-resource cleanup.
- Preserve query guards, unmanaged models, denied app migrations, trusted transaction-local claims/role, unverified-principal rejection, nested-user-switch rejection and same-user nesting.
- Preserve share role bounds, review visibility, private-file/cache-nonce revocation behavior, profile provisioning and scheduler semantics.
- Keep original source/config/reference folders in place, including `src/`, `server/`, `scripts/`, `public/`, `new pages/` and `page-screenshots/`. New Python code belongs in `migration/django/`.
- No reset/flush, hosted test-database creation, blind `db push`, baseline replay on the existing target, historical migration edits, data purge, widened grants, unrelated cleanup, commit, push or deployment.
- Do not retry rejected credential retirement or reopen P0/P3/P4. No activity backend, teams/preferences, anonymous sharing, timezone redesign or page migration.
- Do not print/commit credentials, URLs containing passwords, JWTs, synthetic emails/UUIDs or unrelated row/object data. Record actors as A/B/C.

## Execution

### 1. Review and improve the probe

Inspect current configuration privately, including shell overrides. Settings use `load_dotenv(..., override=False)`, so exported URLs can mask ignored `.env`. Establish the effective source without exposing values.

The review findings below are addressed in the current working tree. Recheck them before the hosted run:

- Pooler mode parsing validates shared transaction port, exact `django_data.<project-ref>` username, database and TLS settings. The probe sets `pooler_verified` true only after behavioral checks and cleanup pass.
- The probe exercises explicit A/B/A identity/claims and private-row isolation, observes transaction-entry state, forces a SQL rollback, checks context guards and records client/backend reuse.
- Shared transaction mode disables Psycopg auto-prepare and session startup search-path state. The RLS context and fixed health probe set search paths inside their transactions.

Confirm these code paths match the configured endpoint and driver behavior. The previous direct-host result is preserved at `docs/data/P5_HOSTED_RESULTS_DIRECT.json`. Failure output redacts credentials, connection strings, account identifiers and UUIDs. Keep changes limited to probe/helpers, meaningful regressions and demonstrated P5 defects.

### 2. Obtain the exact local connection

Use the exact existing-project shared transaction-pooler endpoint and restricted-role login from Supabase Dashboard > Connect. Store it only as `DJANGO_SUPABASE_DATABASE_URL` in ignored `migration/django/.env`. Verify project, transaction mode, TLS and restricted identity.

Do not guess a regional hostname, restore the deleted old-project `.temp/pooler-url`, use privileged credentials, or label direct/session/scratch connections as transaction-pooler acceptance.

If configuration is absent and unavailable through authorized access, finish independent code review/improvements and isolated checks. Report the one operator action: configure the exact restricted `django_data` transaction-pooler URL locally. Never request its password/full URL in chat. Keep P5 partial until hosted verification is possible.

### 3. Prove behavior explicitly

Use fresh accounts authenticated through the existing server verification flow, not fabricated hosted identities. Extend the probe or add a small hosted helper with the same target/cleanup safeguards.

Required proof:

1. Verify connector/session identity, restricted role attributes/membership and alias separation. Within scoped transactions, assert `current_user = authenticated`, `auth.uid()`, subject setting and parsed claims match the verified actor/trusted role.
2. Execute A -> B -> A in explicit transactions on a demonstrably reused Django/driver client connection, without reconnecting between actors. Record sanitized reuse and boundary observations.
3. Check each user's private synthetic rows and denial of the other's through actual runtime ORM/raw queries, not identity SQL alone.
4. After commit, observe transaction-entry role/claims before installing the next user's context. Prior role/subject/claims must not survive; handle absent/empty settings consistently.
5. Force a bounded exception/SQL error in A's context, prove a synthetic write rolled back, observe restored role/claims, then run B and A successfully with correct isolation on the reused client.
6. Verify unscoped ORM/raw access, unverified principal, wrong alias and nested different principal remain denied; same-user nesting works; Python context restores after success/error.
7. Record observed backend identifiers/reuse/reassignment where useful. Client reuse is distinct from backend reuse. Use bounded repeat/second-client checks if needed; never infer backend assignment from a URL or claim exhaustive pool coverage. Report any unresolved mandatory evidence gap.

The guard blocks unscoped SQL. Confine post-transaction diagnostics to fixed read-only identity/settings observations in verification code, before context setup overwrites evidence. Do not disable the runtime guard, broaden metadata exceptions to application reads, or install session-wide claims/role. Multi-statement observations needing the same backend require an explicit transaction.

Keep `check_p5_rls_scratch.py` restricted to its exact native scratch URL. Never remove its safeguard or send fabricated scratch identities to hosted Supabase.

### 4. Run hosted acceptance and cleanup

Run the full existing P5 fresh-account probe over the verified real transaction pooler, including added isolation proof. Retain all previously passing profile/Auth, template/search, sharing/role, review, scheduler, filled-form and private Storage checks.

Track exact generated account/row/session/object IDs privately. Cleanup in `finally` on success/failure; remove generated Storage objects before owning accounts. Verify generated resources are gone, accounting for deletions already completed during checks. A zero final Storage cleanup counter alone is not absence proof or a failure. No broad deletion or personal-data export.

Fix newly exposed P5 defects narrowly and add meaningful regressions. Failed connections do not justify privileged fallback or wider grants. Follow tool/network escalation rules; never bypass approval rejection.

### 5. Verify locally

Use existing native tooling. The prior runner used Windows Store Python 3.12 with `.venv-p2` packages due to managed-interpreter runtime problems. Recheck availability; avoid unnecessary environment recreation.

From `migration/django/`:

```powershell
$storePython = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe'
$env:PYTHONPATH = (Resolve-Path .\.venv-p2\Lib\site-packages).Path
$env:DJANGO_SETTINGS_MODULE = 'config.settings.test'
& $storePython -m pytest -q -p no:cacheprovider
& $storePython manage.py check
& $storePython -m mypy apps scripts/check_p5_hosted_data.py
.\scripts\run_ruff.ps1 check apps scripts/check_p5_hosted_data.py
git diff --check
```

Include new helpers in focused lint/type checks. Keep pytest isolated from hosted databases. Record current counts/results; old 90-pass evidence is not a new run. Separate unrelated existing P4 typing findings.

For hosted execution after inspecting configuration sources:

```powershell
# Clear only an unintended/stale override so ignored .env supplies the URL.
Remove-Item Env:DJANGO_SUPABASE_DATABASE_URL -ErrorAction SilentlyContinue
$env:DJANGO_SETTINGS_MODULE = 'config.settings.dev'
& $storePython scripts/check_p5_hosted_data.py
```

Do not clear intentional valid environment configuration or print the URL. These commands are continuation instructions, not execution evidence from preparing this prompt.

### 6. Update evidence and close the gate

Update actual outcomes consistently in:

- `docs/data/P5_HOSTED_RESULTS.json`: behavioral flag, named checks, sanitized transaction/reuse evidence, mode/date/cleanup; retain prior direct-host evidence separately.
- `P5_VERIFICATION.md`, `P5_REPORT.md`, `P5_DECISIONS.md`, `P5_RLS_MATRIX.md` and `P5_CONTRACTS.md` under `docs/data/`.
- Appropriate read-only runtime/catalog fields in `docs/data/P5_TARGET_INVENTORY.json`; do not replace verified catalog facts with assumptions.
- `MIGRATION_STATE.md`, `MIGRATION_PLAN.md`, root `prompt.md` and relevant README/index pointers. Update current handoff continuation/status notes while retaining dated session history.

Do not invent a full hosted SQL dump or widen privileges/retry Docker to obtain one. Restricted dump and native stub limitations remain explicit; unrelated P3/P4/product/page carryovers remain separate.

## Acceptance

P5 is complete only when exact existing-project transaction-pooler configuration/restricted role, verified A/B/A isolation/client reuse, observed commit/error/rollback cleanup, guard/principal/alias rules, existing full hosted P5 checks, exact synthetic cleanup and relevant isolated checks pass, with consistent evidence and no unresolved mandatory isolation gap.

Otherwise record **P5 partial**, the exact failing dependency/check, completed independent work and concrete next action. A skipped check or hostname-derived flag cannot close P5.

Finish with changed files, hosted behavioral proof, test results, cleanup, P5 status and limitations. P6 remains unstarted and requires a separate owner request.
