# Migration state

**Updated:** 2026-10-11  
**Project:** Audentra / VoiceForm  
**Current task:** P5 implementation and evidence review. P5a schema/Storage and P5b Django data services are implemented; P5 remains partial pending hosted transaction-pooler verification.
**Active step:** [prompt.md](prompt.md) defines the bounded P5 scope. [P5_REPORT.md](docs/data/P5_REPORT.md), [P5_VERIFICATION.md](docs/data/P5_VERIFICATION.md), [P5_RLS_MATRIX.md](docs/data/P5_RLS_MATRIX.md) and [schema reconciliation](docs/schema-reconciliation.md) record actual changes and evidence.
**Next implementation step:** Configure the exact shared transaction-pooler URL locally and rerun the hosted P5 probe. Do not begin P6/P7 or claim P5 complete before this P5b gate passes. Exposed-key retirement remains separately approval-dependent; P3 live speech evidence remains a later voice/parity gate.

**Session handoff:** [HANDOFF_P5_P6.md](HANDOFF_P5_P6.md) records completed session work, evidence limitations, the P5 closure runbook, and bounded P6 preparation. It does not authorize P6 implementation.

**Owner scope revision:** The 2026-10-11 development-only request supersedes earlier SMTP, confirmation-delivery, legacy account and React Auth compatibility gates. Supabase remains the sole provider via its Python SDK. The supplied publishable key is configured. Automatic approval review blocked broad credential revocation; see [P4_CREDENTIAL_ROTATION.json](docs/auth/P4_CREDENTIAL_ROTATION.json).

**Folder policy:** P1 work belongs in migration/parity/, Python application work in migration/django/, and comparison evidence in docs/parity/. P2 created the Django foundation under migration/django/. Preserve the original app and reference folders through P9 and the P10 soak.

## 1. Purpose and authority

Use this file for current facts, evidence, decisions and blockers. Use [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for scope and completion gates, the archived [P2](docs/foundation/P2_IMPLEMENTATION_PROMPT.md) and [P3](docs/services/P3_IMPLEMENTATION_PROMPT.md) briefs for executed scope, [archived P4 brief](docs/auth/P4_IMPLEMENTATION_PROMPT.md) for executed Auth scope, [prompt.md](prompt.md) for P5, and [P4_REPORT.md](docs/auth/P4_REPORT.md) for execution evidence.

On 2026-10-10 the user authorized implementation of the P2 brief on native Windows and the existing hosted testing project. P2 created restricted django_app and django_data roles and a django schema, migrated only Django sessions/migration bookkeeping, and verified both runtime aliases. The public application table catalog and Storage bucket count remained empty. No Docker, commits, pushes, deployment, P3 work or P0 recovery was part of P2. P1 carryovers remain assigned to their later phases.

Current repository evidence takes precedence over older status claims. User instructions determine authorization. A recommendation or an "approved" heading in an older document does not resolve a pending product decision.

The owner requested a basic P2 review and P3 prompt, then explicitly authorized P3 implementation. The P2 review isolated pytest from hosted databases and repeated the foundation checks successfully (9 tests, Ruff, mypy over 18 source files, framework/static checks and live read-only health); see [P2_REVIEW.md](docs/foundation/P2_REVIEW.md). P3 work is recorded separately in [P3_REPORT.md](docs/services/P3_REPORT.md). No P3 database write was performed.

The owner authorized P4 and then revised it on 2026-10-11 to clean development-only Django + HTMX + Supabase Python SDK Auth. Mandatory signup confirmation was disabled with that authorization. Fresh hosted Auth and browser checks pass; the generated account/session rows were cleaned up and no email was sent. Earlier template/SMTP and React/old-account gates are superseded. Privileged-key replacement/local artifact cleanup is prepared; retirement still requires approval after automatic review blocked the broader operation.

The user reports P0 is done. Carry that completion forward as owner-reported acceptance; this P1 implementation does not independently verify the recovery or provider actions. Earlier P0 evidence below remains a dated record and does not reopen P0 automatically.

The user also requires the existing application/reference folders to remain in their original locations until the migration is fully finished and verified. Preserve src/, server/, scripts/, public/, new pages/, page-screenshots/ and existing legacy configuration through P9 and the P10 soak. Run repeated comparisons against those originals; do not move them into legacy/ or overwrite reference screenshots. P11 runtime retirement needs the completion gates and a documented clean recovery reference; design/documentation/parity evidence remains retained. P0 removals stay in effect.

## 2. Repository snapshot

| Item | Observation | Evidence / limitation |
|---|---|---|
| Branch / HEAD | `main`, `b66efbb` | Local Git inspection |
| Merge parents | `39c280cee95557bbd6d92e87c6899580f3a4919a` and `66064ecb4d994f87c64a4c401507c57da45ff4e7` | Second parent reconnects history preceding P0 cleanup |
| Local tracking references | `origin/main` and `origin/HEAD` point to HEAD | This pass did not query GitHub; local refs do not establish present remote server state |
| Starting working tree | Existing P1/P2/P3 migration and documentation changes are uncommitted | Preserve those edits and private CLI metadata; no commit was made in this review |
| Migration code | P1 parity harness, P2 Django foundation, P3 speech/extraction services, P4 development Auth | P1 accepted with exceptions; P2 complete; P3 code findings corrected with live provider evidence open; P4 hosted/browser/PostgreSQL acceptance passed and owner accepted |
| P0 hardening | `supabase/migrations/20261005181500_security_hardening.sql` exists | Does not prove application to a live project |
| P0 SQL check | `supabase/tests/rls_users_select_test.sql` exists | The old claim of zero tests predates P0 |

Refresh this snapshot at each handoff. Preserve other people's working tree changes.

## 3. Current runtime

| Concern | Current implementation |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router |
| Styling | Tailwind CSS; design tokens in `tailwind.config.js` |
| Backend | Express in `server/`; mounted transcription and TTS routes |
| Identity / data | Browser Supabase clients and `AuthContext`; Supabase Auth, PostgREST and Storage |
| Speech | Browser microphone capture/playback; legacy JSON requests to Express |
| Groq | `src/config/api.ts` exports `GROQ_API_KEY` as `undefined`; the assistant can use its existing mock fallback |
| Activity | `src/lib/activity.ts` uses localStorage and example items |
| Settings / collaboration | Several preferences, team and review flows use localStorage or mocks |
| Screenshots | `scripts/screenshot.js` uses Node Playwright, route discovery and a desktop viewport; it does not set up a signed-in session |

The README reports completed public-page and dashboard design work. Those pages remain React implementations; their redesign does not complete a Python phase. The `/documentation` page describes a target schema architecture that the runtime has not implemented.

The earlier audit identifies ElevenLabs code and an alternate transcription route as unused. Verify actual imports and mounted routes before a future port; file presence does not prove a working integration.

## 4. Historical P0 regression and preflight evidence

The historical P0 cleanup commit is `d8459d2`, followed by documentation/tooling at `39c280c`. The later merge `b66efbb` includes pre-rewrite parent `66064ec` and restores these paths to the tracked tree:

```text
service-account.json
backups/db_cluster-12-08-2025@20-15-27.backup.gz
backups/db_cluster-12-08-2025@20-15-27.backup/db_cluster-12-08-2025@20-15-27.backup
backups/qpjclqmszrmdgdqcbels.storage.zip
```

### P0 recovery preflight, 2026-10-10

This session refreshed the repository and scanner evidence without printing credential values:

| Command | Recorded result |
|---|---|
| `python scripts/secret_scan.py --mode tracked` | Exit 1; 158 files / 11,530,419 bytes; four pattern sites in one service-account blob |
| `python scripts/secret_scan.py --mode history` | Exit 1; 1,041 objects enumerated / 409 blobs / 16,536,961 bytes; same four sites |
| `python scripts/secret_scan.py --mode objects` | Exit 1; 419 blobs / 16,595,231 bytes; same four sites |

The findings identify one blob, `57cba5d1c194`, matching service-account/private-key patterns. They do not identify four credentials. Git path inspection separately established backup tracking; provider-pattern scanning alone cannot prove removal of dumps or personal data.

The seven local refs are branches `main`, `deb` and cached `origin/{main,deb,bolt,bolt2,HEAD}`; no tags are present. The service-account blob is reachable from `refs/heads/main`, `refs/remotes/origin/main`, `refs/remotes/origin/HEAD` and `refs/remotes/origin/deb`. The local `deb`, `origin/bolt` and `origin/bolt2` refs do not contain that blob. These are local refs; they do not establish present GitHub state.

`git config --get core.hooksPath` is unset, and the default `.git/hooks/pre-commit` is absent. `.githooks/pre-commit` is therefore not active in this clone. That script also exits successfully if Python is missing, so it is fail-open in that case.

Both documented recovery artifacts exist: `.git/p0-prewrite-backup.bundle` and sibling `VoiceForm-p0-prewrite.git`. The security record says they contain the compromised key and database dump. Keep access, cloud-sync exposure and eventual disposal as explicit operator work.

### Rewrite-tool side effect found during preflight

I ran `python scripts/p0_history_rewrite.py --path service-account.json --path backups --path "backup supabase"` to inspect its dry-run behavior. It did not update refs or working files. Its dry-run calls `git mktree`, however, which writes tree objects to the Git object database. Its printed claim that the dry run wrote nothing is inaccurate. A subsequent read-only `git fsck --unreachable` listed four unreachable tree objects; it also listed ten blobs and one commit whose prior status is unknown. No object was pruned. Do not attribute or remove the other unreachable objects without inspecting them in a protected copy.

The dry-run printed seven refs, 162 reachable commits and 24 changed trees/commits. Do not use that final count as the predicted rewrite total: dry-run mode maps changed parents to their original IDs, so it misses descendants that need new commit objects. The script also does not update annotated tag objects. No tags are present in this snapshot; check again in any execution copy.

The rewrite command ran in this working repository, so its object database now contains four unreachable trees. HEAD and all refs remain at their original IDs. This task prohibits pruning; leave them in place and disclose them in any later recovery brief.

These scans are earlier session evidence. This documentation pass did not rerun them or repair tracking/history. The existing `.gitignore` edit does not remove files Git already tracks or remove historical blobs.

**At that preflight, P0 was incomplete with a confirmed local cleanup regression.** The owner has since reported P0 complete and requested the P1 handoff. The older clean reports in `docs/p0-evidence/` and the preflight findings describe their respective snapshots; this review did not produce a new cleanliness verification.

The source protections that removed the browser credential import, disabled the browser Groq key and removed the credential-copy build step remain visible. Verify their survival during P0 recovery without expanding into application refactoring.

## 5. External work without current completion evidence

The table preserves evidence availability from the earlier preflight. The latest owner report accepts P0 as done; this planning pass did not independently check these external actions or infer their present provider state.

The [historical remediation record](docs/security-remediation.md) lists these operator actions:

| ID | Action | Status in this session |
|---|---|---|
| H1 | Rotate Google service-account key, audit use, retire old key, deploy replacement outside Git | No completion evidence supplied |
| H2 | Rotate exposed Groq key; keep replacement server-side | No completion evidence supplied |
| H3 | Coordinate remote history replacement, old GitHub objects and collaborator clones | Old record says not performed; current remote state unverified |
| H4 | Decide password resets / sign-in review for accounts exposed in the dump | Pending owner decision; record no account identities here |
| H5 | Apply reviewed P0 hardening to the correct Supabase environment and verify restrictions | Historical isolated SQL verification does not prove live application |
| H6 | Establish working scanner enforcement on actual developer/CI platform | Scanner/hook files exist; operational enforcement unverified |
| H7 | Secure or dispose of sensitive recovery artifacts after the agreed recovery period | Storage/disposal status unverified |

Do not infer whether an exposed key remains active or whether a live table has a particular policy. Those facts require provider/database evidence. The README's DNS failure is historical. The linked testing project was reachable before P5 and had no public app tables or Storage bucket; P5 has since provisioned the reviewed development schema. Original historical schema provenance remains unknown; the P5 development contracts do not claim recovery of it.

## 6. Route inventory

`src/App.tsx` defines **25 routes: 13 public content routes, 4 authentication routes and 8 application routes**.

| Group | Paths |
|---|---|
| Public content (13) | `/`, `/features`, `/industries`, `/security`, `/pricing`, `/about`, `/contact`, `/status`, `/help-center`, `/documentation`, `/terms`, `/privacy`, `/open` |
| Authentication (4) | `/login`, `/signup`, `/forgot-password`, `/reset-password` |
| Application (8) | `/dashboard`, `/templates`, `/scheduler`, `/manage-schedules`, `/scheduler-settings`, `/filledtemplates`, `/AIVoiceAutoFill`, `/activitylog` |

Classification does not establish effective auth guarding. The router has no central guard; Route-wave checks and P9 must establish each page's anonymous and signed-in behavior; P1's accepted references do not establish it.

The old phrase "12 authenticated app routes" combines four authentication paths with eight application paths. Future captures must use the appropriate states. Preserve spelling and case, including `/AIVoiceAutoFill`.

Q21 was answered by the owner on 2026-10-10: retain `/activitylog` as a future feature. Keep all 25 routes and capture its current localStorage/example behavior; implementing the real backend belongs to a later scoped phase.

The screenshot script discovers routes from `App.tsx`; its fallback omits `/open`. It does not authenticate before application visits, so existing screenshots do not establish authenticated parity. New P1 tooling lives alongside it and does not modify or overwrite the legacy script or screenshots.

## 7. P1 final review and acceptance

P1 is finalized with owner-accepted exceptions. [P1_ACCEPTANCE.md](docs/parity/P1_ACCEPTANCE.md) records the exact scope, checks and phase assignments. The [P1 brief](docs/parity/P1_IMPLEMENTATION_PROMPT.md), [P2 brief](docs/foundation/P2_IMPLEMENTATION_PROMPT.md) and [P3 brief](docs/services/P3_IMPLEMENTATION_PROMPT.md) are archived; root prompt.md now specifies P5a/P5b. P4 scope is archived in docs/auth/P4_IMPLEMENTATION_PROMPT.md.

The reviewed harness, guarded seeder, capture/comparison tooling, tests and CI live in migration/parity/ and .github/. The manifest accepts all 25 current routes and Q21 retains /activitylog. All 24 existing desktop PNGs were inventoried and visually reviewed; /open and mobile references are absent. Four application images show login, one shows loading and one shows an error. They are accepted historical manual references, not successful authenticated goldens. Numeric tolerances remain proposals. Originals were preserved.

The CLI link was corrected to match the private .env target. A read-only hosted catalog query verified zero public application tables and zero Storage buckets. Private PARITY_ URL/allowlist/anon settings now match the legacy config; no account, elevated fixture credential or write acknowledgement is configured. No application rows were read and no database, Auth, bucket or policy writes were performed. Application schema/Storage provisioning belongs to P5a; RLS/data evidence to P5b; Auth to P4. Full matrix evidence remains required through route waves and P9.

| Check | Final result | Scope |
|---|---|---|
| Python parity suite | 27 passed, 2 skipped | Offline contracts/safety/comparison; browser smoke checks skipped |
| Private configuration alignment | Passed | Target origin and anon configuration match; no credentials printed |
| Hosted catalog query | Passed | Testing target reachable; public app tables and buckets absent |
| Historical screenshot review | 24 PNGs readable and reviewed | Desktop references only; dimensions/digests in reference-inventory.json |
| Legacy lint | 194 errors, 15 warnings | Existing untouched legacy debt |
| TypeScript noEmit checks | Failed: app 4092; node/server 21 each | Cascading JSX configuration errors; overlapping checks |
| Vite scratch build | Failed | Elevated retry transformed 1593 modules, then esbuild temp-file cleanup was denied; existing dist preserved |
| Hosted CI / live Auth / full capture | Not run | Accepted carryovers, not passing parity evidence |
| Django foundation | Complete within P2 scope | [P2_REPORT.md](docs/foundation/P2_REPORT.md); P3 separate authorization required |

No legacy source fixes, secret-history recovery, commits or deployments were performed. See the acceptance record for evidence limitations and carryover gates.

## 8. Phase status

| Phase | Current status | Next gate |
|---|---|---|
| P0 | Complete per owner report; accepted for P1 handoff | Independent completion evidence not reviewed in this planning pass |
| P1 | Finalized with owner-accepted exceptions | Carryovers remain assigned in docs/parity/P1_ACCEPTANCE.md; full parity is not claimed |
| P2 | Complete and reviewed; test isolation tightened | [Archived scope](docs/foundation/P2_IMPLEMENTATION_PROMPT.md), [implementation report](docs/foundation/P2_REPORT.md) and [review evidence](docs/foundation/P2_REVIEW.md) |
| P3 | Code findings corrected; live-provider evidence remains open | [P3 review](docs/services/P3_REVIEW.md) and [P3 report](docs/services/P3_REPORT.md); keep live speech checks for later voice/P9 verification |
| P4 | Development Auth accepted by owner; separate credential-retirement approval pending | [P4 report](docs/auth/P4_REPORT.md); fresh hosted account, HTMX, PostgreSQL and regression proof; no SMTP/legacy-identity gate |
| P5a | Baseline/reconciliation implemented and applied; isolated baseline, empty-target remediation, idempotence and native RLS checks passed | Hosted target inventory is refreshed; current hosted schema-only dump is unavailable under the restricted runtime role |
| P5b | Django profiles/templates/shares/reviews/scheduling/filled-form/Storage services implemented; hosted direct-host probe passed | Shared transaction-pooler identity/user-switch proof is still required; keep P5 partial |
| P6 | Not started | P2 |
| P7 W1-W7 | Not started | Wave-specific dependencies |
| P8 | Not started | P3/P6; complete before W7 |
| P9 | Not started | Full gate after page waves; P1 harness is the starting point |
| P10 | Not started | Full parity, deployment access and rollback agreement |
| P11 | Not started | P10 soak and zero transitional usage evidence |

The final P1 review added live read-only catalog inspection and historical screenshot review to offline harness checks. Legacy lint/type/build failures remain recorded. No browser capture, live Auth/RLS verification or deployment occurred. Earlier P0 scans/rewrite preflight retain their historical scope.

## 9. Decisions and schema limits

Q21 is resolved: retain /activitylog as a future feature, preserving current localStorage/example references. Q18 accepts historical screenshots for manual review; numeric thresholds, masks and a complete matrix remain deferred. Q2's current testing environment is confirmed and reachable.

The P2 brief chooses dedicated django-schema sessions, restricted django_app and django_data connection roles, no operational admin/Auth implementation, and standalone Tailwind compatible with existing tokens. These are bounded implementation defaults, not retrospective owner answers to all historical Q12/Q19/Q20 questions. Other product choices remain pending in the decision register.

The P4 implementation retains a functional persistent-sign-in choice with a 14-day absolute cap and mandatory verified service identity. The owner explicitly removed React Auth compatibility and old-account migration/testing requirements. Supabase uses email/password only. Django owns secure server sessions, refresh, local-scope logout and authenticated password changes. Profile/schema/Storage and application RLS were deferred from P4 and have since been implemented in P5. Email recovery is separate and unavailable; disabling signup confirmation does not provide email recovery.

Before P5, repository DDL was missing for template_shares, template_reviews and filled_templates, and the linked development target had no public app tables or Storage bucket. That says nothing about any historical source project. P5 now records new development contracts, applies a fresh baseline/reconciliation, and preserves historical migrations. Do not treat the newly created contracts as recovered legacy DDL or use personal dump rows as fixtures.

The app historically referenced template-files and public URLs. P5 created the private `template-files` bucket and policies and verified hosted owner/shared-recipient access, including revocation. P2 created only restricted roles and Django-owned state; public schema/Storage changes belong to P5 and are now recorded in the P5 report. Hosted pooler semantics remain unverified.

## 10. Sources and conflicts

| Source | Role |
|---|---|
| Current session | Owner-reported P0 completion; P1 exceptions accepted; P2 implemented/reviewed; P3 implementation authorized and underway |
| `docs/python-migration-plan.md` | Detailed target, phases, questions and wave order; revision history includes v0.3 |
| `docs/security-remediation.md` | Historical P0 changes and operator blockers; local-cleanliness claim superseded by merge evidence |
| `docs/p0-evidence/*.json` | Historical sanitized scan results |
| `README.md` | Project/UI history and recorded environment limitation; runtime claims need evidence |
| `docs/tables.md` | Historical migration/schema audit; inferred fields are not verified live DDL |
| Previous root `prompt.md` | P1/P2/P3 scopes archived under their evidence folders; current root prompt specifies P5; P4 scope archived under docs/auth |
| `docs/prompt.md` | Pointer to prepared root prompt and archived scope; no separate execution authority |
| `.commandcode/taste/taste.md` | Empty template; no migration requirements |
| Current routes, package/config/server/screenshot/activity files | Runtime and tooling evidence |

The old long plan contains stale headings and conflicting instructions. The [correction register](MIGRATION_PLAN.md#8-corrections-to-older-documents) defines this consolidation's interpretation without granting execution authority.

## 11. Handoff and updates

P2 is complete/reviewed. P3 code corrections pass; the owner accepted P4 development authentication; see [P4_REPORT.md](docs/auth/P4_REPORT.md). Fresh hosted signup/login/session/refresh/password-change/logout, real HTMX browser and PostgreSQL concurrency passed. SMTP/legacy-account compatibility is outside the revised scope. Exposed-key retirement awaits separate approval. P5 schema, private Storage and Django services are implemented; 90 regression tests, Django checks, native PostgreSQL RLS/idempotence proof and the hosted direct-connection probe pass. P5 remains partial until the pooler user-switch proof is completed. Preserve original source/reference folders. See [P5_REPORT.md](docs/data/P5_REPORT.md) and [prompt.md](prompt.md). Do not proceed to P6/P7 under this P5 implementation handoff.

Future updates must record:

```text
Date and HEAD:
User-authorized phase and scope:
Starting user changes preserved:
Files changed and why:
Checks run, results and evidence locations:
User decisions received:
Remaining blockers and owner:
Phase status and next permitted task:
```

Keep a phase incomplete while required evidence is missing. A proposal or a file's existence does not prove completion.
