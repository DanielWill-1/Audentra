# Session handoff: finish P5, then prepare P6

**Recorded:** 2026-10-11  
**Repository:** VoiceForm / Audentra  
**Workspace:** `C:\Users\danie\OneDrive\Documents\GitHub\voiceform\VoiceForm`  
**HEAD at handoff:** `b66efbb`  
**Current status:** P5 implementation and direct-host verification passed; P5 remains partial. P6 has not started.  
**Scope of this document:** Session history and continuation through P6 only.

## 1. Read this first

The next session should finish the remaining P5 transaction-pooler evidence. It should not rebuild the schema, repeat the completed service migration, reopen accepted development authentication, or silently start P6. Once P5 closes, prepare a bounded P6 implementation brief and implement it when the owner requests that work.

This handoff records earlier work from the session and its reports. Creating this file did not rerun tests, make hosted changes, or implement P6. The results below are dated execution evidence, not newly repeated checks.

Read these in order:

1. Latest owner instructions, then this handoff.
2. [MIGRATION_STATE.md](MIGRATION_STATE.md) for current status and [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for authoritative scope/gates.
3. [prompt.md](prompt.md), which remains the active P5 brief.
4. [P5_REPORT.md](docs/data/P5_REPORT.md), [P5_VERIFICATION.md](docs/data/P5_VERIFICATION.md), and [P5_HOSTED_RESULTS.json](docs/data/P5_HOSTED_RESULTS.json).
5. [P5_CONTRACTS.md](docs/data/P5_CONTRACTS.md), [P5_RLS_MATRIX.md](docs/data/P5_RLS_MATRIX.md), and [schema reconciliation](docs/schema-reconciliation.md).
6. For P6 preparation, [P1 acceptance](docs/parity/P1_ACCEPTANCE.md), [route manifest](docs/parity/route-manifest.json), [flow inventory](docs/parity/flows.md), and [Django README](migration/django/README.md).

Older reports describe the situation when written. For example, P3's initial report retained unresolved code findings that its later review closed, and early schema inventories correctly described the pre-P5 empty target. Use the newer review/current inventory when interpreting those records.

## 2. Owner decisions that remain in force

- This is a development/testing project, with no production users or obligation to migrate legacy test identities.
- Keep the existing Supabase project and application database intact. Do not delete application data or recreate the project.
- Use native Windows. No Docker, paid services, custom SMTP, or Gmail integration.
- Supabase Auth is the sole authentication provider, through the Supabase Python SDK. Django + HTMX, minimal JavaScript; no Django Auth or React authentication compatibility requirement.
- Signup confirmation is disabled with authorization for development. That does not provide forgotten-password recovery; reconsider confirmation before production.
- Keep original `src/`, `server/`, `scripts/`, `public/`, `new pages/`, `page-screenshots/`, and legacy configuration in their original locations until the migration is fully finished and verified. New Python work belongs in `migration/django/`.
- Use private template files. Share with existing Supabase accounts by UUID, without email invitations.
- Viewer reads; editor edits template content; admin manages shares; owner retains ownership, visibility changes, and deletion. Admin does not acquire editor rights.
- Reviews are visible to their author and the reviewed template's owner.
- Retain activity as a future feature/reference; do not invent its backend in P5/P6.
- Preserve existing design tokens and references. Accepted screenshots do not establish successful authenticated page parity.

## 3. Phase status through P6

| Phase | Current state | Completed work / remaining limit |
|---|---|---|
| P0 | Complete per owner report | Carry acceptance forward. This handoff does not independently establish every history/provider-security action. Do not reopen the phase solely from older audit text. |
| P1 | Finalized with owner-accepted exceptions | 25-route contract, source/flow inventories, parity tooling, and 24 accepted desktop references. Missing mobile and `/open` references and successful authenticated states remain comparison carryovers. |
| P2 | Complete and reviewed | Django foundation, separate state schema/roles, native Windows tooling, health checks, static fixture, and isolated test setup. |
| P3 | Code corrections closed; live evidence outstanding | Speech/extraction service contracts and reviewed mock regressions pass. Live provider/device/browser speech parity has not been established. Owner selected Groq GPT OSS 120B. |
| P4 | Development Auth accepted | Fresh signup/login/session/refresh/password change/logout, HTMX, CSRF/protected routes, and PostgreSQL race checks passed. Credential retirement and email recovery remain separate limitations. |
| P5a | Implemented and applied | New development schema, private Storage configuration/policies, fresh baseline, guarded remediation, catalog and native reconciliation evidence. No complete current hosted SQL dump. |
| P5b | Implemented; partial acceptance | Profiles/templates/shares/reviews/schedules/filled forms/Storage services and direct-host verification pass. Hosted transaction-pooler isolation proof remains open. |
| P6 | Not started | Shared Django rendering shell, fragments/static pipeline, and explicit legacy fallback. No product page migration is claimed. |

The roadmap's architectural entry to P6 is P2 plus P1 manifest/design references. The active session handoff nevertheless requires closing P5 first; architectural independence does not authorize expanding the current P5 task.

## 4. Earlier session work to preserve

### P1 and P2 foundation

P1 recorded all 25 routes and inspected 24 historical 1440-pixel-wide PNGs. Several authenticated-route captures are login/loading/error screens; do not use them as evidence that the real page works. `/open` has no historical screenshot, and there is no mobile reference set. Numeric pixel thresholds and repeatable successful state coverage have not been accepted as completed parity.

P2 placed Django under `migration/django/`. The `default` database alias holds Django-owned sessions and migration bookkeeping in a dedicated `django` schema with restricted `django_app`. Application data uses a separate `supabase` alias and `django_data`. Django Auth/admin are not installed. Native Windows Tailwind builds independently of the original frontend. The root has no `manage.py`; run Django from its project directory.

Evidence: [P2_REPORT.md](docs/foundation/P2_REPORT.md), [P2_REVIEW.md](docs/foundation/P2_REVIEW.md), and [P1_ACCEPTANCE.md](docs/parity/P1_ACCEPTANCE.md).

### P3 service work

Speech/transcription/TTS and Groq extraction were ported behind documented contracts. Later review corrected retry/status/UTF-16 boundary issues; use [P3_REVIEW.md](docs/services/P3_REVIEW.md) with [P3_CONTRACTS.md](docs/services/P3_CONTRACTS.md), rather than treating the initial [P3_REPORT.md](docs/services/P3_REPORT.md) as final status.

Mock checks do not prove real microphone/device behavior or live Google/Groq results. Missing server-only provider setup and live comparisons remain recorded limitations; P5/P6 do not require paid speech calls or reopening those services.

### P4 development authentication

The owner replaced the earlier compatibility/SMTP approach with clean Supabase email/password Auth. The supplied publishable key is configured. Supabase Python SDK forms/HTMX, verified server-side identity, session rotation, locked refresh, stale-save protection, protected routes, CSRF, POST logout, and authenticated password change are implemented.

Mandatory signup confirmation was disabled for development. Fresh hosted signup/login/refresh/password-change/logout, real HTMX behavior, and PostgreSQL concurrency passed, using generated accounts and no email delivery. Password changes clear the local session and require a fresh login. Forgotten-password email recovery remains unavailable under the accepted sender limitations; disabling signup confirmation did not resolve it.

Local exposed frontend artifacts were cleaned and replacement credential configuration prepared. Broad credential revocation was rejected by automatic approval review because unknown consumers, including CI, could be affected. Retirement remains separately approval-dependent. Do not retry it under P5/P6 or describe replacement preparation as completed revocation.

Evidence: [P4_REPORT.md](docs/auth/P4_REPORT.md) and [credential rotation record](docs/auth/P4_CREDENTIAL_ROTATION.json). Older SMTP/legacy-account gates are superseded.

## 5. P5 implementation completed this session

### Database and verified identity boundary

- `migration/django/apps/db/rls.py` accepts a server-verified `SupabaseUser`, opens an atomic transaction, installs transaction-local subject/claims and `SET LOCAL ROLE authenticated`, and restores context on exit/error.
- The context rejects unverified principals and a different principal inside an active context; same-principal nesting is allowed.
- An application query guard rejects unscoped queries on the `supabase` alias. Health has a narrowly fixed metadata path.
- Six application models are unmanaged (`managed=False`). The router denies application migrations on the `supabase` alias; Django-owned state stays separate.
- `django_data` may set `authenticated`, using `INHERIT FALSE, SET TRUE`; it does not inherit table privileges or use `service_role`/BYPASSRLS in runtime requests. `django_app` retains no memberships.

### Services and access behavior

| Area | Implemented behavior | Main location |
|---|---|---|
| Profiles | Idempotent profile provisioning for fresh verified accounts, own-profile read/update; provisioning failure returns 503 without establishing an Auth session | `apps/accounts/profile_services.py`, `profile_selectors.py`, `models.py` |
| Templates | Create/list/detail/search/category/sort/pagination/content update/owner visibility/delete | `apps/templates_app/services.py`, `selectors.py`, `models.py` |
| Shares | Existing-account UUID validation, sent/received lists, create/remove/role management, recipient-local hidden state, role escalation denial | `apps/templates_app/` |
| Reviews | Request/create/queue/list/update; author edits content, owner moderates decision status, participant-only visibility | `apps/templates_app/` |
| Scheduler | Create/list/detail/date range/upcoming/type/status/search/update/delete/cancel/complete/aggregate | `apps/scheduler/` |
| Filled forms | Save/list/detail/delete; owner derived from verified identity; supplied template must be readable | `apps/voice/filled_services.py`, `selectors.py`, `models.py` |
| Private files | Validated upload/download/delete/replacement, exact object cleanup, current verified bearer per request | `apps/storage/services.py` |

All paths in the table are relative to `migration/django/`. Service inputs/outputs are specified in [P5_CONTRACTS.md](docs/data/P5_CONTRACTS.md). No dashboard, template, scheduler, filled-form, or recorder page was migrated by implementing these services.

Scheduler behavior preserves entered date/time values and the legacy helper's UTC-derived date boundaries. A product timezone correction is deferred rather than silently changing the contract.

### Private Storage and fixes discovered during verification

- `template-files` is private, limited to 20 MiB and JSON/CSV/PDF/XLS/XLSX.
- Generated paths are `templates/<template UUID>/<object UUID>.<validated extension>`; callers do not choose arbitrary object paths.
- Owner uploads/replaces/deletes. Owner and valid share recipients read. Authenticated template discovery does not grant file access.
- A hosted revocation check initially found that the same user's CDN response remained cached after the share was revoked, while database/Storage authorization correctly denied access. Each download now adds a fresh `cacheNonce`; hosted rechecks and a regression cover the fix.
- RLS-denied update/delete operations return actual `None`/`False` rather than reporting success.
- Template deletion and replacement clean only the exact referenced object; failures are surfaced. No bucket-wide cleanup was introduced.
- The Storage helper closes its owned HTTP client directly. Focused typing fixes were made to the hosted probe's casts/request/null handling and cleanup annotations.

### Schema work applied to the existing development target

The linked project is Audentra, reference `pgtttjmqibxufvwehkyj`. The target was PostgreSQL 17.6 and had zero public application tables and zero Storage buckets before P5. There was no `supabase_migrations.schema_migrations` relation. These are new development contracts based on reachable operations and accepted decisions, not recovered legacy DDL.

P5 created `users`, `templates`, `template_shares`, `template_reviews`, `scheduled_events`, and `filled_templates`: all six have RLS enabled. Current catalog evidence records 23 public application policies and four Storage policies. Existing provider `ensure_rls` / `public.rls_auto_enable()` behavior was preserved.

| Artifact | Intended use |
|---|---|
| [Fresh baseline](supabase/baseline/00000000000000_baseline.sql) | Fresh target only; do not replay wholesale over the existing target |
| [Guarded reconciliation](supabase/migrations/20261011100000_p5_reconcile.sql) | Additive existing-target path, applied to development |
| [Share role correction](supabase/migrations/20261011150000_p5_share_role_bounds.sql) | Owner/editor/admin bounds and owner visibility correction, applied to development |
| [Storage policies](supabase/storage/template_files_policies.sql) | Guarded fresh-install Storage policy artifact |
| [Supabase config](supabase/config.toml) | Private bucket/size/MIME configuration |
| [Target inventory](docs/data/P5_TARGET_INVENTORY.json) | Sanitized current hosted catalog/role/config evidence |

Historical migrations remain unchanged. No blind `db push`, database reset, unrelated dump import, historical-user backfill, or application data purge was performed.

### Inventory and documentation work

[P5_OPERATION_INVENTORY.md](docs/data/P5_OPERATION_INVENTORY.md) records 41 `.from` expressions: 39 PostgREST, one Storage upload, and one local `getPublicUrl` expression; 40 involve network operations. Older counts of 38 are obsolete. Expressions are not a count of distinct HTTP endpoints.

The session produced or refreshed P5 contracts, decisions, RLS matrix, target inventory, read-only preflight SQL, hosted results, verification/report, schema reconciliation and native replay records. Status/pointers were aligned in root `prompt.md`, `MIGRATION_STATE.md`, `MIGRATION_PLAN.md`, README files, `docs/prompt.md`, the older Python plan's current note, and historical table documentation. The full older plan remains historical reference where it conflicts with the consolidated scope.

## 6. Actual verification evidence

| Verification | Recorded result | Qualification |
|---|---|---|
| Isolated Django pytest | **90 passed** | Native Windows Python 3.12; no hosted test database creation/flush |
| `manage.py check` | Passed | Test settings, no issues |
| Focused mypy | Passed, 59 source files | `apps scripts/check_p5_hosted_data.py` |
| Focused Ruff | Passed | Same P5/app selection |
| `git diff --check` | Passed | CRLF warnings were informational |
| Broad `mypy apps scripts` | Not clean | 19 existing type findings in `check_p4_postgres_concurrency.py` and `check_p4_hosted_auth.py`; do not claim full broad typing success |
| Native fresh baseline + Storage policies | Passed | PostgreSQL 18.4 with minimal Auth/Storage stubs |
| Native empty-target guarded remediation | Passed twice | Normalized public/Storage schema unchanged on reapplication |
| Baseline/remediation equivalence | Passed | Normalized schema-only dumps from separate scratch databases matched |
| Native RLS matrix | Passed on both schema paths | Owner/viewer/editor/admin/unrelated/review/object assertions; synthetic DML rolled back |
| Django RLS scratch | Passed | Verified identity, query guard, same-user nesting, rejected nested user switch, rollback |
| Hosted P5 probe | **53 checks passed** | Existing development target, **direct PostgreSQL connection** |
| Hosted transaction pooler | **Not verified** | Exact pooler URL absent; remains the P5 gate |

Latest hosted result: three generated accounts created and deleted, zero emails, `cleanup_ok: true`, `database_host_mode: "direct host"`, `pooler_verified: false`. The final cleanup counter for Storage is zero because replacement/deletion checks had already removed the test objects; it does not mean Storage was untested.

The sandbox initially denied a connection before any generated accounts were created. The same authorized synthetic probe passed with approved network access. If this repeats, distinguish environment connection denial from an application regression. Do not bypass an automatic-review rejection.

`SUPABASE_TEST_ADMIN_KEY` is an ignored server-only verification cleanup credential. It is not an application request identity. Hosted probes delete only accounts/objects they generated and exercise runtime data access through verified users.

### Native replay and hosted dump limitations

Historical replay succeeded through `20250628064557_aged_tree.sql` and first failed at `20250628065741_precious_brook.sql` because `template_shares` was absent. This establishes incomplete self-contained history in that replay environment, not the history of another hosted project. See [P5_REPLAY.md](supabase/schema_dump/P5_REPLAY.md) and its log.

`supabase db dump --linked` unexpectedly began pulling a Docker PostgreSQL image. It was interrupted before the dump/container execution. A partial image cache may remain; do not issue further Docker commands. Its empty output file was removed. [20261011-pre-p5-public-schema.sql](supabase/schema_dump/20261011-pre-p5-public-schema.sql) preserves only historical pre-change schema material and is not the current schema.

Native `pg_dump --schema-only` reached hosted PostgreSQL with `django_data` but failed the `ACCESS SHARE` lock on `public.users`, because that connector has no direct table SELECT grant. No runtime privileges were widened. There is no full current hosted SQL dump; use the reviewed migrations and current catalog JSON while retaining that limitation.

New databases created for the final scratch baseline/remediation comparisons were removed. An earlier native loopback cluster / `p5_rls` scratch database may still exist; this handoff does not claim all PostgreSQL processes were stopped. Native PostgreSQL 18.4 stubs are not a full Supabase 17.6 restore and cannot establish hosted pooler or CDN behavior.

## 7. What remains to finish P5

**Required gate:** Prove verified claims/role isolation, user switching, and transaction cleanup on the real Supabase shared transaction pooler.

The only missing operator configuration currently identified is the exact transaction-pooler connection string for restricted `django_data`. Obtain it from Supabase Dashboard → Connect. Store it locally as `DJANGO_SUPABASE_DATABASE_URL` in ignored `migration/django/.env`. Keep the password local; do not paste it into chat or commit it.

Use the dashboard's actual endpoint/project reference and appropriate restricted-role username. Shared pooler usernames generally include the project reference; verify the concrete setup instead of guessing it. Do not switch to `postgres`/`service_role`, widen grants, or change the separate `DJANGO_DATABASE_URL` state connection to make this pass.

The deleted tracked `.temp/pooler-url` belonged to an older project link. Do not restore/reuse it. Supabase CLI metadata was aligned with the existing configured development project; preserve that correction.

### Next-session ordered closure checklist

1. Read the brief/contracts and inspect current local configuration without printing secrets. Preserve the dirty working tree.
2. Obtain/configure the exact shared transaction-pooler endpoint; confirm project consistency, restricted data role, and transaction rather than session/direct mode.
3. Use a fresh shell or clear any scratch `DJANGO_SUPABASE_DATABASE_URL` override so it cannot mask `.env`. Never point the hosted probe at `127.0.0.1:49518/p5_rls`.
4. Inspect `check_p5_hosted_data.py` before relying on it: its current `pooler_verified` value is derived from hostname suffix and port. That flag alone is not behavioral proof.
5. Run the existing fresh-account hosted probe over the real pooler. Verify generated-resource cleanup and all previously passing role/data/Storage boundaries.
6. Ensure the hosted evidence explicitly covers A → B → A verified identity changes through reused client connections, `current_user`/`auth.uid()`/claims for each transaction, and isolation after a forced rollback/error. Add bounded hosted checks if the present probe does not demonstrate these. Record connection reuse/transaction boundaries honestly; do not infer a backend assignment from the URL.
7. Check transaction-local role/claims do not survive commit/rollback or leak into the next principal. Preserve unverified-principal and nested-user-switch rejection.
8. Run relevant isolated regressions/lint/type checks for any changes. Do not rerun schema provisioning or widen privilege to solve a probe issue.
9. Refresh sanitized hosted results/catalog/runtime flags as appropriate, `P5_VERIFICATION.md`, `P5_REPORT.md`, `P5_DECISIONS.md`, current state, and active prompt to reflect actual outcomes.
10. Close P5 only when the required behavioral proof passes and synthetic cleanup succeeds. Then report completion and prepare a bounded P6 brief if the owner requests it.

`check_p5_rls_scratch.py` intentionally refuses anything except its exact native scratch URL. Do not remove that safeguard or run its fabricated identities against hosted Supabase. Hosted evidence must use freshly authenticated synthetic accounts.

One probe detail to review when changing connection mode: the current hosted script compares the configured data-alias username literally with `django_data`. A shared-pooler login may include the project suffix. If that assertion needs adapting, validate the exact approved pooler login and actual restricted database role; do not remove the role check or substitute a privileged account.

### Commands already used successfully

From repository root:

```powershell
Set-Location .\migration\django
$storePython = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe'
$env:PYTHONPATH = (Resolve-Path .\.venv-p2\Lib\site-packages).Path
```

The runner used Windows Store Python 3.12 with existing `.venv-p2` packages because the managed uv interpreter had native/runtime problems. Recheck availability in the next session; do not recreate the environment unnecessarily.

For an authorized hosted synthetic run, after local pooler configuration:

```powershell
Remove-Item Env:DJANGO_SUPABASE_DATABASE_URL -ErrorAction SilentlyContinue
$env:DJANGO_SETTINGS_MODULE = 'config.settings.dev'
& $storePython scripts/check_p5_hosted_data.py
```

Clearing that shell override lets the ignored local configuration supply the URL; it does not edit `.env`. Inspect the configuration source first if a different environment setup is intentionally in use.

For isolated regression checks:

```powershell
$env:DJANGO_SETTINGS_MODULE = 'config.settings.test'
& $storePython -m pytest -q -p no:cacheprovider
& $storePython manage.py check
& $storePython -m mypy apps scripts/check_p5_hosted_data.py
.\scripts\run_ruff.ps1 check apps scripts/check_p5_hosted_data.py
```

These are reproduction instructions, not a claim that this documentation pass executed them. Network escalation may be necessary for the hosted probe; seek approved execution through the tool policy if needed.

## 8. Unfinished items that do not block the accepted P5 service implementation

| Item | Current treatment through P6 |
|---|---|
| P4 credential retirement | Separate approval-dependent action. Preserve the rejection/consumer-impact record; no retry under this handoff. |
| Email forgotten-password recovery | Unavailable; document honestly. No SMTP/paid workaround is authorized. |
| Signup verification before production | Development confirmation bypass is accepted; production policy remains a follow-up. |
| P3 live speech/extraction/device evidence | Preserve limitation; no provider calls required for P5/P6. |
| Missing successful/mobile reference states | P6 needs honest shell/browser evidence; do not manufacture historical goldens. |
| Broad P4 probe typing findings | Recorded tooling debt; do not claim all script typing passes or expand P5 unnecessarily. |
| Current hosted SQL dump | Catalog plus reviewed schema artifacts are available; dump limitation remains explicit. |
| Preferences (Q5), team/demo persistence (Q6/Q7) | Product decisions deferred; no new preference/team/organization/invitation schema in P6. |
| Scheduling timezone choice (Q13) | Preserve P5 contract; defer product correction. |
| Anonymous/generated share links (Q16) | No new anonymous route; private account-scoped sharing remains accepted. |
| Activity backend (Q21) | Retain feature/reference; no invented data model or seeded fake activity. |
| Full product page migration | Not completed by P5. P6 creates shared rendering infrastructure only. |

Original files remain for reference. Their historical React data contracts may differ from the deliberate UUID/private-file contracts now implemented; preservation does not establish that every legacy CRUD flow works against the new schema.

## 9. P6 plan: shared rendering and controlled fallback

### Goal and entry

Build reusable Django public/application rendering shells and shared fragments, with explicit routing back to existing legacy pages. Preserve the site's established design and allow comparisons while migration continues.

Required inputs: P2 foundation, P1 route manifest/design references, existing assets/tokens, and an authorized P6 execution brief. Under the current session sequence, finish the P5 pooler gate first. Do not overwrite root `prompt.md` with P6 as part of this handoff-only request.

### Implementation work to include in the future P6 prompt

1. **Inspect current shells and routes.** Read `migration/django/templates/base.html`, accounts templates, `config/urls.py`, both static configurations, `src/App.tsx`, current layouts, route/flow/reference inventories, and relevant components/assets. The P2 base is a fixture, not a finished shared shell.
2. **Build base/public/app templates.** Preserve colors, type, spacing, icons, copy, layout hierarchy, and content coverage. Create only reusable navigation/layout/fragments needed by the shell. Keep Supabase tokens server-side and preserve P4 normal-form/HTMX behavior.
3. **Specify interactive fragments.** Implement accessible shared modal/navigation behavior with explicit focus placement, trapping/restoration where needed, Escape handling, semantic buttons/links, keyboard operation, and progressive form behavior. Use minimal JavaScript with a concrete purpose.
4. **Finish static integration for shells.** Extend the standalone Tailwind pipeline using existing tokens. Inventory icons/fonts/images and required legacy asset paths; review explicit asset handling rather than forwarding arbitrary static requests. Keep generated CSS/output ignored and original references untouched.
5. **Define route ownership.** Make an explicit table of Django-owned paths, manifest page paths still sent to legacy, required legacy assets, allowed methods, and denied paths. Inspect actual behavior before choosing GET/HEAD; do not invent SPA POST endpoints. Preserve existing Django health/Auth/API ownership.
6. **Implement bounded fallback.** Forward only eligible manifest page paths/methods to a configured exact legacy origin. Unknown paths and API/Auth/admin/static/media/health namespaces must not enter page fallback. Required legacy assets need separately reviewed explicit routing, not a generic proxy exception.
7. **Handle protocol boundaries.** Review normalization/encoded-path bypasses, queries, headers, cookies, redirects, host handling, timeouts/errors, and loop prevention. Keep verified identity and secrets out of unintended forwarding. Test behavior rather than assuming response copying is safe.
8. **Document rollback.** Route ownership must be reversible without moving files. Specify session behavior/re-login when moving between Django and legacy pages; do not add browser-token migration or resurrect React authentication compatibility.
9. **Verify shells and fallback.** Test design/keyboard behavior, fragment interactions, allowlisted forwarding, deny cases, methods, headers/redirects/loop prevention, existing Auth/API/health access, and route rollback. Use synthetic states/current captures where necessary; historical login/error captures are not successful page baselines.
10. **Record acceptance.** Produce a P6 report and verification/route-ownership evidence, update state and prompt, and state exactly which shells/routes are implemented. Do not call P6 complete without its rendering/fallback gates.

### P6 completion criteria

- Reusable base/public/app templates and shared fragments render with the existing tokens and reviewed static/icon integration.
- Keyboard/focus/modal behavior is exercised and documented.
- Only explicit manifest page paths with verified methods forward to the configured legacy origin.
- Unknown/protected namespace paths cannot reach page fallback; legacy assets have explicit reviewed treatment.
- Header/cookie/redirect/loop and rollback behavior is verified.
- Existing Django Auth/API/health boundaries and isolated regressions remain intact.
- Original source/reference folders remain in place; no broad cleanup or relocation.
- Reports separate implemented shell infrastructure from unmigrated product pages and reference limitations.

### Outside P6

Do not migrate entire dashboard/template/scheduler/recorder pages, create teams or preferences, invent anonymous sharing/activity APIs, change P5 access/timezone rules, redo accepted Auth, retire credentials without approval, deploy, or remove legacy code. Do not extend this handoff into later-phase execution.

## 10. Local UI startup and what can be seen

Existing React pages remain available from repository root with `npm run dev`; `npm run dev:server` starts the existing Express service if a flow needs it. Vite has no explicit port override in `vite.config.ts`; use the actual origin it prints and record that origin for P6 fallback rather than assuming one.

For Django, run from `migration/django/` after the interpreter setup above:

```powershell
$env:DJANGO_SETTINGS_MODULE = 'config.settings.dev'
& $storePython manage.py runserver 127.0.0.1:8000
```

Implemented UI is the development Auth/protected account interface: `/signup/`, `/login/`, `/auth/session/`, `/change-password/`; `/healthz` reports health. Speech/extraction API routes also exist. Product pages are not yet ported, and P6 fallback is not implemented. A root-level `python manage.py` failure is a working-directory issue.

For shell styling, use the existing `migration/django/scripts/build_static.ps1` and `check_static.py` workflow documented in the Django README. Inspect current scripts before extending them. Do not overwrite the legacy `dist/client` or historical screenshots to prove Django shell work.

## 11. Working tree and operational cautions

HEAD is `b66efbb`; substantial tracked modifications and untracked migration/documentation directories remain. No migration commit, push, deployment, or history rewrite was made in this P5 work. Some dirty files predate P5; do not attribute all of them to this session or reset them.

Preserve ignored `.env` files, caches/environments, and local CLI metadata. Do not print passwords/tokens/admin keys or export real application rows/Auth identities/object payloads for a handoff. Sanitized catalog/check names and synthetic verification evidence are sufficient.

Do not use `git clean`, broad delete, `db reset`, blind `db push`, original-folder moves, or privilege widening as a shortcut. A local scratch process or partial Docker cache is not a reason to perform unsolicited cleanup.

## 12. Ready-to-use continuation prompts

### Next session: finish P5 only

> Read HANDOFF_P5_P6.md, MIGRATION_STATE.md, MIGRATION_PLAN.md, root prompt.md, and the P5 contracts/report/verification/results. Preserve the current dirty tree and original folders. Complete only the remaining P5 hosted transaction-pooler isolation gate. Use the exact locally configured Supabase shared transaction-pooler URL for django_data; do not guess endpoints, expose credentials, widen grants, reapply completed schema work, or reopen accepted P4 Auth. Inspect the hosted probe and add bounded evidence if needed for verified A/B/A identity switching, reused client connections, transaction-local role/claims cleanup after commit/rollback, and rejected invalid/nested user changes. Use fresh synthetic accounts, no emails, and exact generated-resource cleanup. Run relevant checks, record actual results/limitations, and close P5 only after the real behavioral proof passes. If the exact local pooler configuration is absent, complete independent review and state the one missing operator action. Do not start P6.

### After P5 closes: prepare the P6 execution brief

> Read the P6 section of HANDOFF_P5_P6.md and MIGRATION_PLAN.md, the P1 manifest/flows/reference inventory, and the existing Django foundation/templates/static scripts. Generate a detailed bounded P6 prompt.md for shared base/public/app rendering, accessible fragments/modal focus, token/icon/static integration, manifest-only legacy fallback, namespace/method/header/loop denial checks, explicit asset routing, and rollback. Preserve original folders and P4/P5 contracts. Define implementation files and concrete acceptance evidence; do not include full product page migration or later-phase scope. Preparing the prompt does not authorize implementation until requested.

Stop this continuation plan at P6. No later-phase implementation brief is included here.
