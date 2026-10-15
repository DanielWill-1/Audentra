# Migration plan and scope controls

**Version:** 2.6
**Updated:** 2026-10-16, P10 wave plan
**Current task:** P7/P8 and current-scope P9 are closed. The 2026-10-15 P10 local-runtime preparation sub-sprint passed with linked evidence. On 2026-10-16 the owner replanned P10 as the final local-first product/release-candidate stage before deployment; the expanded waves are planned and not yet implemented. See the [P10 brief](docs/deployment/P10_IMPLEMENTATION_PROMPT.md), [readiness ledger](docs/deployment/P10_READINESS.md), [current handoff](HANDOFF_2026-10-16_P10_WAVE_PLAN.md), and [migration state](MIGRATION_STATE.md). Deployment remains a separate later owner decision.

**Owner scope revision:** The owner's 2026-10-11 request replaces the earlier SMTP/legacy-account/React compatibility gates. Supabase Python SDK + Django + HTMX signup/login/session/refresh/password-change/logout passed against fresh hosted accounts. The project remains development-only and signup confirmation is disabled with authorization; email recovery is separate.

**Architecture reference:** [Existing Python plan](docs/python-migration-plan.md), including v0.3 revisions  
**State:** [MIGRATION_STATE.md](MIGRATION_STATE.md)  
**Completed P2 brief:** [P2_IMPLEMENTATION_PROMPT.md](docs/foundation/P2_IMPLEMENTATION_PROMPT.md)
**Archived P3 brief:** [P3_IMPLEMENTATION_PROMPT.md](docs/services/P3_IMPLEMENTATION_PROMPT.md)
**Archived P4 scope and execution record:** [P4_IMPLEMENTATION_PROMPT.md](docs/auth/P4_IMPLEMENTATION_PROMPT.md), [P4_REPORT.md](docs/auth/P4_REPORT.md)
**Archived P5 closure brief:** [P5_CLOSURE_PROMPT.md](docs/data/P5_CLOSURE_PROMPT.md) — hosted shared transaction-pooler gate passed; P5 is complete
**P6 implementation evidence:** [archived brief](docs/rendering/P6_IMPLEMENTATION_PROMPT.md), [report](docs/rendering/P6_REPORT.md), [verification](docs/rendering/P6_VERIFICATION.md), [review](docs/rendering/P6_REVIEW.md), [route ownership](docs/rendering/P6_ROUTE_OWNERSHIP.json), [asset inventory](docs/rendering/P6_ASSET_INVENTORY.md), [rollback](docs/rendering/P6_ROLLBACK.md)
**P7 W1 result:** The [W1 report](docs/pages/P7_W1_REPORT.md), [verification](docs/pages/P7_W1_VERIFICATION.md), [review](docs/pages/P7_W1_REVIEW.md), [asset provenance](docs/pages/P7_W1_ASSETS.md) and [route ownership](docs/pages/P7_W1_ROUTE_OWNERSHIP.json) record the delivered wave. Its [executed brief](docs/pages/P7_W1_IMPLEMENTATION_PROMPT.md) is archived.
**P7/P8 closeout review:** Preserve the master/closeout briefs and historical session review. The later [P7 finding closeout](docs/pages/P7_SR_CLOSEOUT_2026-10-13.md) closed SR-1 through SR-4 before P9 started; P8 remains a separate deterministic prerequisite.
**P3 evidence:** [P3_REPORT.md](docs/services/P3_REPORT.md), [P3_CONTRACTS.md](docs/services/P3_CONTRACTS.md), [P3_REVIEW.md](docs/services/P3_REVIEW.md)
**P2 evidence:** [P2_REPORT.md](docs/foundation/P2_REPORT.md), [P2_REVIEW.md](docs/foundation/P2_REVIEW.md)

## 1. Goal and authority

**Owner scope revision, 2026-10-16:** P9 is complete within its revised scope. P10 is the final pre-deployment stage and prioritizes a local-first product; the hosted installation is a demo. The former Scope 11 speech and recording work is included in P10 Waves 2–3. Wave 4 makes privacy/security promises real through backend controls and evidence. Wave 5 combines performance, error handling, local-first hardening, and the release-candidate gate. Physical mobile testing remains excluded; physical recording edge cases and audibility remain owner manual review. The 2026-10-15 runtime-preparation and local-schema results remain valid for their stated scope but do not prove local Supabase is the app's default target. Actual deployment remains deferred.

Move Audentra from React/TypeScript/Vite and Express to Django, Python services, server-rendered templates and HTMX. Retain Supabase Postgres, Auth and Storage. Keep browser JavaScript for microphone capture, playback and small interactions requiring browser APIs.

Preserve approved design, routes, copy, data semantics and working flows. Record intentional behavior changes before implementation. Keep the legacy stack runnable until the final removal gate.

This file consolidates scope and session evidence. The project is development/testing only, without production users or Docker. P1 is finalized under accepted exceptions; P2 is complete/reviewed; P3 bounded code findings are closed and live speech evidence remains later. P4 now follows the owner's clean development-only Auth scope. Hosted fresh-account and HTMX/browser evidence passes. [P4_REPORT.md](docs/auth/P4_REPORT.md) records the remaining credential-retirement approval and production/email-recovery limitations.

Source precedence:

1. User instructions establish authorization and bounds.
2. Current repository/environment evidence establishes dated facts.
3. `MIGRATION_STATE.md` records status, decisions and limitations.
4. This plan defines scope, gates and corrections to conflicting older instructions.
5. The detailed old plan supplies technical/porting reference where consistent.
6. Older prompts, inferred schema, screenshots and scan reports describe historical snapshots.

Record conflicts. Do not pick the interpretation that expands the active task. Recommendations and "approved" headings do not establish user approval for unresolved choices.

## 2. Scope controls

### Previous documentation update

At the folder-policy update, the user asked for all repository documentation to state the additive-folder and legacy-preservation rule. Those edits were:

```text
MIGRATION_STATE.md
MIGRATION_PLAN.md
prompt.md
README.md
docs/python-migration-plan.md
docs/security-remediation.md
docs/tables.md
docs/prompt.md
```

That was a documentation-only task. P1 was subsequently implemented and accepted with explicit exceptions; P2 is now complete within its bounded scope. Preserve existing user edits and unrelated working-tree changes.

### Separate folders and preservation

Build the replacement beside the existing repository layout. Put P1 tooling/dependencies/tests/fixtures in migration/parity/, P2-and-later Python application work in migration/django/, and new comparison documentation/baselines/reports in docs/parity/. Python app paths in older phase descriptions are relative to migration/django/; P1 harness paths are relative to migration/parity/. Shared Supabase migration history and repository CI remain at their existing or explicitly named repository paths.

Keep src/, server/, scripts/, public/, new pages/, page-screenshots/, existing Node manifests and Vite/TypeScript/style configuration in their original locations and runnable until the entire migration passes P9, deployment verification and the P10 soak. Reference files remain available for repeated comparisons throughout every wave. Copy content into the new implementation; do not relocate originals into legacy/ or rename the design folders.

Record original source paths/revisions and comparison artifacts in each phase report. Necessary compatibility/settings changes must fit the phase's exact existing-file allowlist, preserve legacy behaviour and record their diffs. Replacement code belongs in the new folders. Existing SQL migrations remain append-only; this policy does not restore material removed by P0.

P11 may retire old runtime files only after the full completion/soak gates and a documented cleanup/recovery scope. Keep design references, historical screenshots, schema history, documentation and parity evidence available after retirement. No P1 task or individual route-wave completion permits old-folder cleanup.

### Future phase contract

Before a future implementation, record a bounded brief:

| Item | Required content |
|---|---|
| Authorization | User instruction permitting the phase and any external/destructive step |
| Objective | A concrete phase/wave result, or all packages explicitly included in the owner's master brief |
| Entry gates | Upstream completion and required decision evidence |
| Files | Exact existing paths and proposed new files/directories |
| Behavior | Flows to preserve and accepted intentional differences |
| Checks | Completion checks and evidence locations |
| Recovery | Code/traffic rollback, or operator recovery for a history change |
| Stop conditions | Missing access, unresolved choice or required scope expansion |

Map changed files to the brief. Record unrelated bugs in a backlog. Finish independent authorized work when a gate blocks dependent work. The earlier P7/P8 brief did not itself authorize later phases; P9 was subsequently started. The owner closed P9 within the revised scope, then authorized P10 entry work and later the local runtime/configuration sprint on 2026-10-15. Actual deployment/production soak and P11 retirement require later owner instructions.

Preserve user changes. Dependency overlap does not authorize additional phases, background work or remote writes.

### Exclusions

The migration excludes product redesign, replacement of Supabase identity, new billing behavior, new AI providers, reminder workers, operational admin, contact-form functionality and a new share route without the corresponding decision.

Do not rename URLs, rewrite legal text, reinterpret design tokens, add pagination, change extraction models/prompts, recreate unused code or force browser APIs into Python as incidental cleanup. File/line estimates are planning aids, not functional requirements.

## 3. Architecture boundaries

| Concern | Planned owner and constraint |
|---|---|
| Routing / rendering | Django URLconf/templates; HTMX returns fragments |
| Design | Existing Tailwind tokens/assets and separate public/application shells |
| Business logic | Python write services and read selectors |
| Identity | Supabase GoTrue only; fresh development accounts, no legacy identity migration/testing requirement |
| Sessions | P2 selects dedicated-schema database sessions; token storage/hydration belongs to P4 |
| Principal | `SupabaseUser` carries identity/auth flags, no access/refresh token |
| Django-owned state | P2 brief: dedicated django schema and restricted django_app role; no admin/account tables |
| App tables | Supabase `public` schema; Django models use `managed = False` |
| User queries | P2: restricted django_data connector with metadata-only access; P5b adds reviewed authenticated-role context, claims and query guard |
| Elevated role | Administrative commands/reconciliation only; no request path or normal session connection uses `service_role` |
| Storage | Server calls using acting-user credentials under Storage RLS |
| Speech / extraction | Python orchestration, server credentials, preserved request/response semantics |
| Browser integrations | Recorder, native audio controls and bounded clipboard/presentation helpers |
| Build | P2 brief: standalone Tailwind CLI compatible with existing major version/tokens; legacy Node removal only in P11 |

Alpine manages presentation such as drawers/password visibility. It does not own auth, authorization, data fetching or writes. HTMX handles forms/fragments; recording stays in browser JavaScript.

Prove roles, transaction scoping, query guard and pooler behavior before P5b. If the proof fails, stop P5b. The old service-role/ORM-scoping fallback changes a security boundary and requires a separate decision and audit.

### Transitional mechanisms

| Mechanism | Introduction / use | Removal |
|---|---|---|
| Legacy JSON/base64 transcription | P3 retains it alongside multipart | P8 switches recorder; P11 removes input after zero-use evidence |
| Supabase bearer credential | P3 implements; P4 requires valid bearer or Django session | P11 after legacy callers retire |
| `INTERNAL_API_TOKEN` | Public P3 request marker, not authentication | P11; P4 auth cannot accept marker alone |
| Legacy route fallback | P6 allowlists manifest page paths and verified methods | P11 after zero forwards during soak |
| Browser Supabase session | Supports remaining React pages | Preserve while needed; remove with legacy stack at P11 |

P3 binds privately with configured origin/CORS controls; do not expose an unauthenticated provider proxy to the internet. P4 requires session or valid bearer authentication. Protect session-authenticated writes with CSRF; specify/test the separate bearer API policy without exempting session requests by accident.

## 4. Roadmap and gates

P0 is complete per owner report. P1 is finalized with owner-accepted exceptions: 25-route contract, 24 accepted desktop references and reviewed tooling. Before P5, the linked development target was reachable and had no public application schema or Storage bucket; P5 has now provisioned those objects. The owner permits native Windows and no Docker; carryovers remain mandatory before affected cutovers and final parity.

    P0 reported complete -> P1 accepted with exceptions -> P2 implemented
    P2 -> P6 -> P7 W1 -> W2
    P2 -> P3 -> P4 -> P7 W3 (also after W2)
    P2 + accepted schema reference/rebuild disposition -> P5a
    P4 + P5a + RLS proof -> P5b
    P5b + W3 + product decisions -> W4 -> W5 -> W6
    P3 + P6 -> P8
    W6 + P8 -> W7
    P1 carryovers + continuous wave checks -> P9 full parity gate
    P7 + P9 local acceptance -> P10 local-first release candidate
    Later owner deployment decision -> deployed verification/soak -> P11 removal

P4 requires P3. P5b requires P4/P5a. W1/W2 do not wait for authenticated/data phases; P8 must precede W7. Dependencies allow future overlap only within user-authorized work.

### P0: remediation and recovery

**Current handoff:** The owner reports P0 complete; P1 is now finalized with owner-accepted exceptions. Accept P0 as owner-reported without claiming independent verification. The recovery procedure and earlier findings below remain historical reference; do not restart them solely because older records say P0 is incomplete.

**Entry:** User authorizes a bounded recovery task. Current authorization covers its proposal only.

**Scope:** Identify restored paths/blobs/refs; preserve private recovery material; remove credential/export tracking; repair affected history; verify surviving source protections; complete documented rotations/audit review and reviewed hardening against the correct environment. Account exposure and remote coordination remain owner work.

**Exit:** Current tracked/history scans pass, appropriate whole-object scan passes, separate dump/archive checks pass, no browser secret or credential-copy build path remains, a fresh build passes secret checks, and rotation/retirement/deployment/live hardening evidence exists. Record operator actions and any accepted residual exception. Document scanner limitations.

**Limits:** No UI or business logic port. Preserve runtime while deploying a replacement credential. Prepare reviewable local repair before requesting destructive shared-remote authorization. Keep old ancestry out of clean history; coordinate clean re-clones or reviewed transfer of changes.

**P5 verification:** The pre-change target had no `filled_templates` table. P5 created the account-scoped table and owner-only RLS; hosted isolation and owner-delete checks pass. See [P5_TARGET_INVENTORY.json](docs/data/P5_TARGET_INVENTORY.json) and [P5_REPORT.md](docs/data/P5_REPORT.md).

#### Recovery preflight result and bounded procedure

Preflight on 2026-10-10 confirms one credential blob in tracked files, reachable history and the whole local object database. The affected current local refs are `refs/heads/main`, `refs/remotes/origin/main`, `refs/remotes/origin/HEAD` and `refs/remotes/origin/deb`. The local `deb`, `origin/bolt` and `origin/bolt2` refs do not contain the matched blob. No tags were present in the inspected ref set. These are local references; verify GitHub separately when authorized.

The existing rewrite tool accepts exact paths and enumerates all local refs, but it needs correction or isolation before it can support a safe run:

- Its dry-run calls `git mktree`, which writes unreachable tree objects. Four such trees appeared in `git fsck` after preflight. The command ran in this checkout; it did not move refs or touch worktree files. No cleanup was performed. Other unreachable object counts lack a pre-run comparison, so do not attribute or prune them.
- The dry-run maps a changed commit to its old ID. It therefore undercounts descendant commit rewrites when only an ancestor tree changed.
- The script does not update annotated tag objects. None existed in this snapshot; recheck before execution and make the script safely handle them or stop if they appear.
- The local hook path is unset, the default pre-commit hook is absent, and `.githooks/pre-commit` skips successfully if Python is unavailable. Current hook enforcement is unproven and fail-open.

The repair proposal is limited to the P0 paths, history, scanner gate and incident record. A later authorized execution should:

1. Rotate and deploy replacement Google credentials before retiring the key the running Express service may depend on. Review provider audit logs. Rotate the Groq key independently; the current browser path is disabled, and the replacement remains server-side for P3. Record non-secret confirmation. These account actions need their owner access and must not wait for GitHub cleanup.
2. Keep the existing recovery bundle and bare mirror protected. Both contain sensitive history and currently exist at the locations in `docs/security-remediation.md`, under the OneDrive tree. The owner must select a secure, unsynced destination and retention/disposal policy before creating or moving recovery copies. Do not put another copy in the repository.
3. Work from a disposable, complete local clone/mirror of the refs under review. Preserve the active worktree, `.gitignore` edit and uncommitted planning documents. Do not fetch or merge remote history into the active checkout. Repair the rewrite tool first so dry-run writes nothing, counts all parent-dependent commits, and either rewrites annotated tags correctly or refuses to run when it finds one.
4. Scan every ref and enumerate all sensitive paths before rewriting. Remove the service-account path, `backups/` and historical `backup supabase/` paths; include any additional full-scan findings by exact path. Retain the service's local credential only as an ignored runtime file until the replacement is verified, then retire the old copy. Do not remove unrelated design/source files.
5. Apply the rewrite only in the disposable clone. Compare the complete pre/post ref map, verify only intended paths disappeared, run tracked/history/object scans and targeted dump markers, inspect for unreachable sensitive blobs, then prune unreachable objects only in that clone after confirming the protected recovery copy. Build the app and inspect the output for secrets. Do not claim the remote is clean from a local result.
6. Present the clean refs and path/scan evidence for review before replacing refs in the active checkout. Preserve the user's worktree changes while reconnecting it to the reviewed clean lineage; never merge the pre-rewrite `66064ec` or contaminated cached `origin/deb` lineage back in.
7. Treat the remote rewrite as a separate, explicitly authorized operator action. First inspect actual remote ref IDs and coordinate collaborators; push only approved refs with expected old IDs. Ask GitHub to expire old reachable-by-SHA objects, then require collaborators to re-clone. A local `origin/*` tracking ref is not proof of current remote state.
8. Establish an enforced secret-scan gate. Review scanner coverage; make the hook fail closed when its interpreter is missing and configure it per clone, then add a required CI check if repository CI is available. Verify the actual gate blocks a safe synthetic test value without logging a real credential.
9. Resolve H4 account response and H5 live-hardening verification with the data/security owner. Do not guess whether any service credential is active or any live policy was applied. Keep the unknown `filled_templates` policy clearly assigned to schema reconciliation unless live evidence establishes an urgent fix.

**Execution file boundary:** `scripts/p0_history_rewrite.py` (dry-run/ref correctness), `.githooks/pre-commit` and a narrowly scoped CI workflow if authorized, `docs/security-remediation.md`, plus the three planning documents. `.gitignore` already contains ignore patterns and has a user edit; do not rewrite it. `package.json` already exposes `secret-scan`; change it only if the reviewed gate needs a minimal, demonstrated adjustment. Credential/data files are removed from tracked history in the disposable clone, not printed or copied into source.

**Completion evidence:** Every reviewed local branch/ref has no sensitive path or matched credential in reachable history; the isolated repository's object scan passes after verified pruning; targeted dump checks pass; build output contains no credentials; replacement keys are deployed and old keys retired; live P0 policy state is verified; gate enforcement works; remote cleanup, account response and recovery artifact disposal are individually recorded. Any unavailable external item remains an explicit P0 blocker.

### P1: baseline

**Status:** Finalized with owner-accepted exceptions on 2026-10-10; [acceptance record](docs/parity/P1_ACCEPTANCE.md) is authoritative for this handoff. The [archived brief](docs/parity/P1_IMPLEMENTATION_PROMPT.md) preserves the original scope. Q21 retains /activitylog and all 25 routes.

**Delivered:** Python capture/comparison harness, guarded deterministic seeder, synthetic contracts, 27 passing tests (two browser skips), CI workflow, route manifest, source flow/difference register and review of all 24 historical desktop PNGs. Supabase metadata inspection confirmed an empty approved hosted testing target; private configuration/link alignment was corrected.

**Accepted exceptions:** No /open/mobile matrix or successful authenticated goldens; some historical images show login/loading/error; numeric thresholds/masks not approved; no Auth identity, database fixtures, app/Storage RLS or hosted CI result. Legacy lint/type/build failures remain recorded. These limitations do not block P2.

**Carryover gates:** P4 proves Auth; P5a reconciles/provisions app schema and Storage; P5b proves RLS and populated fixtures. P6/P7 establish current desktop/mobile references before affected cutovers. P9 completes deterministic captures, repeat comparisons, interactions and provider/device checks. Real Supabase semantics remain required for live Auth/Storage/RLS; offline checks cannot substitute for them.

**Limits:** Preserve source/screenshots; no incidental legacy repairs. Accepted P1 references are manual historical evidence, not a passing full-parity matrix.

### P2: foundation

**Status:** Complete within the bounded scope. See [P2_REPORT.md](docs/foundation/P2_REPORT.md) for checks, live role/schema results and limitations. Do not rerun remote bootstrap or migrations as part of a later phase.

**Brief choices:** Dedicated django-schema database sessions and django_migrations; restricted django_app state role and separate metadata-only django_data connector; no admin/account models/Auth implementation; standalone Tailwind with legacy major version/tokens. Preserve existing project-wide PUBLIC grants; inherited public-schema USAGE does not grant table access, so prove no public CREATE or application-table rights instead of changing global ACLs. These are bounded defaults, not retrospective owner answers to all historical questions.

**Scope:** Native Python 3.12/Django LTS project, isolated settings/env/lockfile, health checks, migration/router boundaries and static build under migration/django/. Shared supabase/bootstrap/django_app_role.sql may create only those restricted roles and Django-owned schema. Document private runtime credentials and sanitized evidence under docs/foundation/. Preserve root legacy env/config.

**Exit:** Native startup, settings/deploy checks, Django-only migrations, actual restricted role/schema connectivity on both aliases, unchanged public app-table catalog, session/data separation, Tailwind/static collection and focused lint/type/tests passed. /healthz returned 200 for verified connectivity/identities/boundaries. The report records the deliberate production HSTS warning and Python patch-version limitation.

**Limits:** No page cutover, proxy/API/Auth flow, public app-table DDL, Storage provisioning, fabricated inspectdb models, Docker requirement or legacy relocation. The empty public schema means unmanaged application models wait for P5a. Hosted tests must not create/drop/flush an application database.

### P3: services

**Entry:** P2 and scoped provider/mock configuration with contract fixtures.

**Executed brief:** [P3_IMPLEMENTATION_PROMPT.md](docs/services/P3_IMPLEMENTATION_PROMPT.md). P2's test isolation remains intact. [P3_REVIEW.md](docs/services/P3_REVIEW.md) records the original three findings and their bounded corrections; [P3_REPORT.md](docs/services/P3_REPORT.md) retains initial and follow-up evidence. P3 live speech-provider evidence remains open for later voice/P9 verification.

**Scope:** Port mounted STT/TTS, extraction prompt/parsing and field matching. Preserve JSON/base64 contracts and response keys; add multipart. Implement transitional credential checks and private/origin boundary.

**Exit:** Differential transcript/TTS/extraction fixtures meet documented provider tolerances; both transcription inputs work; malformed/oversized requests and boundary violations fail; assets hold no secret. The owner selected Groq `openai/gpt-oss-120b`; live-provider comparison remains separate from mocked acceptance.

**Legacy edit limit:** Only transport edits in `src/services/ai.ts` needed for STT/TTS/extraction endpoints and request marker. List exact requests first; a "two-line" estimate is not a contract. Preserve voice page, auth components and browser payload shape. Mock checks do not establish live provider behavior.

**Current corrections:** P0 disables browser Groq credentials, so the default legacy extraction remains its mock branch. P3 adds an opt-in Django transport without restoring client keys. The limit is 10 MiB of base64 characters, TTS metadata/options are part of parity, and both slash forms must work without POST redirects. Optional credential helper tests establish the future session-principal seam only; P4 owns real hydration and mandatory authentication. No session-key or self-asserted session-field shortcut. Groq model availability and the owner's selection are recorded in `docs/services/P3_CONTRACTS.md`; the brief bounds live smoke calls and requires separately labelled evidence.

### P4: development Supabase Auth

**Entry:** P3 code findings corrected. The owner's revised development-only scope supersedes previous React compatibility, old-account and SMTP/email-verification gates.

**Scope:** Supabase Auth is the sole provider, using its Python SDK with Django forms and locally vendored HTMX. No Django Auth. Clean email/password signup/login, server-side PostgreSQL sessions, serialized refresh, POST logout, protected routes and authenticated password changes. Mandatory signup confirmation is disabled with owner authorization. No custom SMTP, paid service, OAuth, React Auth compatibility or old-user testing. Keep the project and application data intact.

**Acceptance:** Fresh hosted signup → login → protected session → logout, token refresh, password change/CSRF, real HTMX browser, and PostgreSQL race protection pass. Isolated regression, SDK, lint/type/framework and static checks are recorded in [P4_REPORT.md](docs/auth/P4_REPORT.md). The probe deletes only its own generated account/session rows and sends no email.

**Security:** The supplied publishable key is configured; local generated secret-shaped build content is cleaned. A replacement server-only cleanup credential is prepared. Automatic approval review blocked broader revocation because unknown CI consumers may break; obtain explicit approval for exact key retirement and update external consumers. Do not claim completed rotation while pending.

**Limitations:** Email-based forgotten-password recovery remains unavailable and does not block the owner's revised development acceptance. Reconsider signup confirmation and implement/verify recovery before production. No public profile rows, schema, Storage or RLS changes belong to P4. React-specific session handoff was removed; original source/reference folders remain.


### P5a: schema reconciliation

**Entry:** P2, safe Supabase environment, recorded new-development contracts for absent objects and artifact/config authorization. Product decisions precede schema additions for deferred features. The [archived P5 closure brief](docs/data/P5_CLOSURE_PROMPT.md) records native Windows/no-Docker verification bounds.

**Scope:** Sanitized schema reference, historical replay, classified deltas/data shape, fresh-install baseline and separate guarded live remediation. Verify tables, policies and Storage configuration instead of inferring them from client types.

**Exit:** Each delta has a disposition; baseline matches intended schema; empty-target remediation matches the documented result; second application changes nothing. Record reference date/provenance and unknowns. Review schema-only exports for sensitive defaults/configuration.

**P5 status:** Baseline and both additive migrations are applied to the verified development target. The native baseline + Storage policy and empty-target remediation paths produce identical normalized catalogs; the remediation is idempotent and policy assertions pass. Hosted catalog and direct-connection service evidence are in [P5_REPORT.md](docs/data/P5_REPORT.md). The target had no application schema to restore, so the isolated remediation started from an equivalent empty application schema with minimal Auth/Storage stubs; this is not represented as a full Supabase restore. A current hosted SQL dump was unavailable under the restricted runtime role; the sanitized hosted catalog JSON is retained instead.

**Limits:** Existing migrations, including P0, remain append-only references. No live write before restored-copy verification and authorization; no guessed tables, destructive changes, data replacement or insertion into historical migration order.

### P5b: data access

**Entry:** P4/P5a, verified applicable hardening, RLS/pooler proof and decisions for feature services.

**Scope:** Port templates/scheduling/sharing/reviews/filled-form and approved feature operations, server ownership, parameterized search and user-scoped Storage. Reconcile actual call sites against the old appendix.

**Exit:** Policy-specific owner/non-owner matrix, rejection outside RLS context, alias isolation, pooler/user-switch checks, Storage round trips and differential CRUD. Preserve verified participant access for shared/review records.

**P5 status:** Profile/template/share/review/scheduler/filled-form/Storage services are implemented. The hosted direct-connection run is archived; the final shared transaction-pooler run passed 65 checks with the project-scoped restricted login, A/B/A claims and private-row isolation, transaction cleanup, forced rollback/recovery, client reuse and exact cleanup. Transaction-mode settings disable prepared statements and use transaction-local search paths. P5a/P5b and overall P5 are complete. See [P5_VERIFICATION.md](docs/data/P5_VERIFICATION.md) and [P5_HOSTED_RESULTS.json](docs/data/P5_HOSTED_RESULTS.json).

**Limits:** No schema/policy redesign. Resolve necessary schema expansion before coding it.

### P6: rendering and fallback

**Entry:** P2, P1 manifest and design references.

**Scope:** Base/public/app templates, shared fragments, modal/focus behavior, icons/static pipeline and allowlisted legacy fallback. Preserve tokens and both stacks' content coverage.

**Exit:** Design/keyboard checks; manifest-only forwarding; unknown/API/auth/admin/static/media/health paths denied; verified headers/loop handling and route rollback. Inventory required legacy assets and review their explicit routing without a generic fallback.

**Limits:** Verify page methods rather than inventing SPA POST endpoints. Django owns new auth/API endpoints under migration/django/. Keep legacy folders in their original locations and runnable; no relocation or original-folder cleanup during P6 or P7.

### P7: seven page waves

The [archived master brief](docs/pages/P7_P8_IMPLEMENTATION_PROMPT.md) defines W1–W7/P8 source-preservation and acceptance requirements. Routes and substantial flows are implemented, but [review](docs/pages/P7_P8_SESSION_REVIEW_2026-10-13.md) reopens comparisons/layouts, invalid settings and source/browser timezone proof. These remain P7 work.

| Wave | Routes | Entry dependencies |
|---|---|---|
| W1 | `/terms`, `/privacy`, `/open`, `/about`, `/security`, `/pricing`, `/industries`, `/features`, `/contact`, `/status`, `/help-center` | P6; prove route switch/fallback |
| W2 | `/`, `/documentation` | W1/P6 |
| W3 | `/login`, `/signup`, `/forgot-password`, `/reset-password` | W2/P4 |
| W4 | `/dashboard` and reachable flows | W3/P5b; Q5/Q6/Q7 and applicable choices |
| W5 | `/templates`, builder/share/review/upload flows | W4/P5b; Q16 before sharing-route change |
| W6 | `/scheduler`, `/manage-schedules`, `/scheduler-settings` | W5/P5b; Q13/preferences |
| W7 | `/AIVoiceAutoFill`, `/filledtemplates`, `/activitylog` if retained | W6/P8/P5b; Q21 |

**Exit per wave:** Django serves its paths; effective fallback count decreases by newly migrated fallback pages; content/visual/flow checks pass at both viewports without legacy browser auth; rollback works. W3's four Auth routes were already excluded and do not decrease fallback count. Expected counts across P6/W1/W2/W3/W4/W5/W6/W7 are 21/10/8/8/7/6/3/0. Record expected legacy re-login for a protected route rollback.

**Limits:** Build each wave in migration/django/ while preserving every original page/component in place through full migration verification and soak. Copy legal wording/design; no incidental product changes or per-wave deletion of reference source.

### P8: media bridge

**Disposition:** P8-R1–R6 are closed within deterministic and development-session boundaries; see [P8 verification](docs/services/P8_VERIFICATION.md), [review addendum](docs/services/P8_REVIEW_2026-10-12.md#2026-10-13-final-disposition) and [device checklist](docs/services/P8_DEVICE_CHECKLIST.md). Physical device/live provider checks remain explicitly not run and are assigned to P9.

**Entry:** P3/P6; complete before W7.

**Scope:** Browser capture, codec detection, visible permission/errors, multipart upload, preview/playback. Reuse verified services/field mapping. Register multipart/codec/playback/export differences before implementation.

**Exit:** Capture through submission works with fixtures/fake media and device checklist; errors visible; object URLs clean up; export content matches; new browser uses multipart while server accepts cached legacy clients.

**Limits:** No provider/prompt changes or deletion of legacy server input. JS line estimates do not override correctness/accessibility.

### P9: full parity gate

**Result:** Complete within the owner's 2026-10-15 scope. All 25 route rows, 37 hosted route/security checks and restricted P5 schema comparison pass. The supplemental read-only hosted capture confirms the private bucket, 20 MiB limit and MIME allowlist. P9-D9 accepts the Chrome mobile responsive correction. Recording/provider checks and physical/manual items retain the owner's deferred or excluded status; see the [P9 report](docs/parity/P9_REPORT.md).

**Scope / exit:** The current P9 matrix and [report](docs/parity/P9_REPORT.md) record completed in-scope acceptance and explicit owner scope boundaries. The P1 full-state flag remains separate and unchanged. The later P10 entry instruction supersedes the earlier wait-before-P10 status; it does not reopen deferred recording or device work.

**Limits:** Verification findings do not authorize general refactoring or features.

### P10: local-first release candidate before deployment

**Entry:** P7/P8 and current-scope P9 are closed. The 2026-10-15 runtime/configuration preparation sub-sprint passed; its evidence is linked in the [P10 readiness ledger](docs/deployment/P10_READINESS.md). On 2026-10-16 the owner expanded P10. The expanded work is planned and incomplete.

**Scope:** Follow the five waves in the [active P10 brief](docs/deployment/P10_IMPLEMENTATION_PROMPT.md): (1) owner-reported website issue intake and fixes; (2) evaluate/select and implement a live speech provider for STT/TTS; (3) resume recording lifecycle after provider integration; (4) implement and evidence backend privacy/security controls for existing promises; and (5) merge performance/error improvements with local-first hardening and release-candidate readiness. Run locally against the local Supabase CLI stack by default. The hosted installation is a synthetic-data demo. The former Scope 11 voice work belongs to P10 Waves 2–3. Keep physical mobile out of scope and leave physical recording edge cases/audibility to the owner for manual review.

**P10 exit:** All five waves have concrete evidence and the owner has reviewed the release candidate. The 2026-10-15 sub-sprint passing does not pass any expanded P10 wave by itself. Report local product readiness and hosted-demo readiness separately. A claim requiring a provider configuration, contract, certification, selected region, TLS host, or organizational audit remains gated until its evidence exists.

**Deployment:** Publishing, production changes, DNS/traffic switching, production migrations, external secret changes, and production soak require a later owner instruction after P10 review. Distinguish traffic/code rollback from data-incident recovery. Traffic rollback does not revert valid new rows; corrupted writes need targeted incident response. P10 completion does not authorize P11.

**Limits:** Do not retire the legacy runtime during P10. P11 still requires deployed verification, an agreed soak, zero fallback/API usage evidence, and a clean recovery reference. Physical mobile tests remain excluded; physical edge cases/audibility are owner manual work.

### P11: legacy removal

**Entry:** Accepted P10 deployment verification after the later owner deployment decision; agreed soak (old recommendation: at least two weeks); evidence of zero fallback forwards and zero legacy API usage; clean recovery reference. Preparation-only completion does not satisfy this gate.

**Scope:** Retire React/Express/Node, legacy deployment, bearer path, public request marker and legacy transcription input. Preserve designs, parity artifacts, schema history and documentation.

**Exit:** Build/test/deploy without Node; session-only/multipart-only endpoints reject retired inputs; proxy gone; browser content has no Supabase credential; references preserved.

**Limits:** Elapsed time alone cannot justify deletion. Old runtime folders stay in place until full parity, deployment verification and soak complete and the cleanup/recovery scope is recorded. Keep Supabase data, migration history, designs, original screenshots, documentation and comparison evidence. Check history cleanliness before creating recovery tags.

## 5. Decision register

Record owner decisions separately from bounded brief defaults. The latest instruction resolves current testing-target suitability, manual reference acceptance and Q21; other product choices remain pending unless explicitly recorded.

| ID | Needed decision/evidence | Gate |
|---|---|---|
| Q1 | Future deployment/users/owner | Actual deployment; local preparation may proceed |
| Q2 | Current .env target confirmed hosted development/testing, reachable with empty public schema and Storage before P5; historical source status not established | Resolved for P2 target, 2026-10-10; P5 post-apply inventory in docs/data/P5_TARGET_INVENTORY.json |
| Q3 | No historic application DDL recovered; P5 records new development contracts for the previously absent objects and imports/deletes no legacy rows | Resolved for P5 implementation scope; see docs/data/P5_DECISIONS.md |
| Q4 | Repository exposure context | P0 record; rotate exposed credentials regardless |
| Q5 | Per-user database preferences or preserved browser state | Related schema/services; W4 |
| Q6 | Implement/remove each team/review/mock feature | Related schema/services; W4 |
| Q7 | Team modal's role after Q6 | W4 |
| Q8 | Persistent-sign-in option implementation/removal | P4/W3 |
| Q9 | Later strict-validation enforcement | Separate change after P10 soak |
| Q10 | API auth behavior and external callers | P4; target is mandatory auth |
| Q11 | Re-login expectations for independent sessions | P4/W3 |
| Q12 | P2 brief selects standalone Tailwind compatible with legacy tokens; no Node-free legacy cleanup yet | P2 default; Node retirement P11 |
| Q13 | Scheduler timezone behavior/correction | W6 |
| Q14 | Useful markup from unused components | P6; no resurrected features by inference |
| Q15 | Secrets owner/deployment mechanism | P0 follow-up / actual deployment; preparation documents placeholders |
| Q16 | Repair/remove unrouted share-link feature | Related service/route work; W5 |
| Q17 | Product identity for domain/email/deployment | Actual deployment; preserve current brand during preparation |
| Q18 | Existing desktop screenshots accepted for manual reference; numeric thresholds/masks and full matrix deferred | Manual acceptance recorded; automated evidence before affected cutovers/P9 |
| Q19 | P2 brief selects dedicated django-schema sessions with restricted state and metadata connector roles; principal/auth remains P4 | P2 default, verify boundaries |
| Q20 | P2 brief excludes operational admin and Django account models | P2 default; future admin requires separate scope |
| Q21 | Retain `/activitylog` as a future feature; P1 captures its current localStorage/example behavior | Answered 2026-10-10; retain 25 routes; real backend is later scoped work |
| Q22 | Cleanup if execution pauses after introducing temporary mechanisms | Before introduction |

P4 brief defaults (2026-10-10; not owner answers): Q8 implements the checkbox with browser-close versus persistent cookies and a 14-day absolute server cap; Q10 requires verified service authentication with no anonymous exception; Q11 keeps independent sessions/re-login. Django logout uses local scope; React sends bearer without Django cookies. Apply any later owner response before dependent implementation. Profile integration was deferred to P5a/P5b and is now implemented; do not provision schema merely to satisfy historical P4 acceptance wording.

Owner decision (2026-10-10): use Supabase Auth email/password only for current P4 verification; keep Google and Azure disabled and do not add OAuth signup flows.

Record brief defaults with their phase bounds; keep unresolved product recommendations pending until answered. New feature/schema work needs a bounded specification, ownership/access rules and data preservation decision.

Q21 decision record, 2026-10-10: the owner chose to keep `/activitylog` as a future feature. P1 keeps the route and current feed in the 25-route baseline and records localStorage/example behavior; it does not authorize implementing the feature's real backend.

Decision record:

```text
ID and user instruction/date:
Selected option and bounds:
Affected routes/files/data:
Intentional parity difference:
Responsible phase:
```

## 6. Verification policy

Run meaningful checks from each authorized implementation brief. Record passed, failed, blocked or not run; name environment and commit. Isolated SQL, mocked provider tests and live checks establish different claims.

Require route content, security scenarios and deterministic comparison fixtures. Specify justified provider tolerances; two live TTS calls need not yield identical bytes. Successful process exit does not prove schema parity or access control.

Use sanitized evidence. Publish no private key, token, password hash, session, connection string or personal dump row. Review schema-only exports for sensitive defaults/functions before committing them.

Completion requires stated gates or a user-accepted bounded exception. Missing evidence stays pending. Static page rendering alone cannot complete the migration.

## 7. Change control and handoffs

**Current status (2026-10-15):** P7/P8 and current-scope P9 are closed. P10 local preparation is complete and verified; deployment/release verification and soak remain deferred. The microphone cleanup patch and recording/provider work remain intentionally owner-deferred. See the [P9 report](docs/parity/P9_REPORT.md), [migration state](MIGRATION_STATE.md), [P10 readiness](docs/deployment/P10_READINESS.md), and [P10 handoff](HANDOFF_2026-10-15_P10_PREPARATION.md).

Before expanding scope, record trigger, affected files/routes/data, necessity, alternatives, checks, recovery and user authorization. Update the brief after approval. Keep unrelated work in a backlog.

Each handoff reads state/plan/prompt, preserves completed work/user changes, refreshes stale evidence and executes only the authorized task. An old prompt cannot authorize a new phase.

Current session record: [P10 preparation handoff](HANDOFF_2026-10-15_P10_PREPARATION.md) and [P10 readiness](docs/deployment/P10_READINESS.md). The [P9 closeout](HANDOFF_2026-10-14_P9_CLOSEOUT.md), [local-readiness scope review](HANDOFF_2026-10-14_LOCAL_READINESS.md), and [P9 kickoff](HANDOFF_2026-10-13_033145_IST.md) retain their dated evidence. P9 and in-scope P10 preparation are complete; actual deployment and P11 retirement await later decisions.

## 8. Corrections to older documents

| Older instruction/claim | Consolidated interpretation |
|---|---|
| Continue P10 immediately after P9 without a phase transition | P9 was completed and reported before the owner authorized P10 entry scope/doc updates and local schema repair on 2026-10-15. Actual deployment/soak remains a later owner decision. |
| Strict full Auth/state-matrix completion before P2 | Superseded by latest owner acceptance: P1 finalized with exceptions; assigned verification remains required before affected cutovers/P9 |
| P2 Docker/root-level files/four existing tables | Native Windows, migration/django/, isolated env; the pre-P5 app schema was empty, so P5 defines and provisions new development contracts |
| P2 data alias starts with application role grants | P2 django_data had metadata/connectivity only; P5 adds `authenticated` membership with `INHERIT FALSE, SET TRUE` and uses it only in transaction-local RLS context |
| Header says v0.2/nothing approved; history/verdict describes revised v0.3 architecture | Retain the revised design reference; P1 exceptions are accepted and P2 is implemented within its recorded scope; brief defaults remain distinct from owner decisions |
| P0 record says local tracked/history clean | Historical result superseded by current merge/scans |
| 12 authenticated app routes | 13 public, 4 auth, 8 app paths; use appropriate states |
| P1 dependency permits plain Postgres | Real Supabase for parity/auth/RLS/Storage; plain Postgres only for isolated checks |
| Schema audit suggests inserting CREATE migrations / absent live tables | P5 verified the linked pre-change target was empty, added forward-only migrations and a baseline, and preserved historical migrations |
| P2 replaces environment example and removes all `VITE_` names | Preserve browser Supabase config while legacy runs; secret `VITE_` values remain prohibited |
| `default` alias described as service role | v0.3/P2 correction: least-privilege `django_app`, no `BYPASSRLS`/app-table access |
| P4 table permits bearer "or" marker | Valid session/bearer mandatory; marker is not authentication |
| Summary says P4 requires only P2 | P4 requires P3 as its phase specifies |
| P8 depends on P7 while W7 requires P8 | P8 requires P3/P6 and precedes W7 |
| P3 migration promised in two lines | Scope exact STT/TTS/Groq transport edits; preserve each contract |
| P3 accepts a Django session before P4 principal hydration exists | Test a trusted-principal helper seam; never trust session existence or self-asserted fields; actual session authentication/hydration is P4 |
| P3 TTS requires identical bytes from separate live provider calls | Identical mock bytes must match; live behavior needs documented provider tolerances and separately labelled evidence |
| AI example uses different extraction field name | Preserve boundary keys, including `extractedData`; document internal mapping |
| Early relocation of React tree / renaming design folders | Superseded by user instruction: new code in migration/parity/ and migration/django/; preserve original locations through full verification and soak; retain design/reference evidence after retirement |
| P6 assumes SPA form POST routes | Verify methods; no invented endpoints or broad API forwarding |
| P1 local replay assumed despite missing DDL | The pre-P5 target was empty; P5 records new contracts and hosted/native provisioning evidence, while P1's accepted handoff exception remains |
| Old audit has zero tests | P0 SQL test exists; full app parity suite still absent |
| Old fallback-route descriptions | Current fallback omits `/open`; normal discovery reads `App.tsx`; P1 manifest replaces assumptions |
| All browser tokens removed at P4 | Django pages keep tokens server-side; legacy session remains until React retires; full closure at P11 |
| P3 declared mocked-contract complete after the initial suite | The later review found retries, SDK status mapping and UTF-16 defects; correct them before closing implementation gates |
| P4 requires public.users creation/completion before auth can work | P4 used GoTrue identity/metadata independently; P5 later created the profile table and verified fresh profile provisioning |
| P4 React transport sends cookies with its bearer | Prepared brief omits credentials; Django session writes separately require CSRF |

Older versions, counts and provider/model names describe snapshots. Verify compatibility in the relevant phase and record necessary changes; they do not authorize upgrades during planning.
