# Migration state

**Updated:** 2026-10-15, P9 local acceptance follow-up
**Project:** Audentra / VoiceForm  
**Current task:** P7 SR-1 through SR-4 and P8 deterministic acceptance are closed. Deterministic local browser implementation is in place; formal P9 acceptance remains open, and the full live voice journey is not verified. See [P9 report](docs/parity/P9_REPORT.md), [verification](docs/parity/P9_VERIFICATION.md), and [matrix](docs/parity/P9_ACCEPTANCE_MATRIX.md).
**Latest local follow-up:** Public W1/W2 [attempt 07](docs/parity/evidence/p9/p9-route-acceptance-20261014/attempt-07/django/) supports 12/13 public route PASS rows. Fresh synthetic [attempt 14 W3-W7](docs/parity/evidence/p9/p9-route-acceptance-20261014/attempt-14/django/) passes all four Auth rows and reruns app workflows. Current-worktree W7 [attempt 03](docs/parity/evidence/p9/p9-w7-mobile-interactions-20261015/attempt-03/django/w7/browser-results.json) passes six route/viewport contracts and ten interactions at both viewport sizes. Focused Activity Log [attempt 13](docs/parity/evidence/p9/p9-activity-parity-20261015/attempt-13/django/w7/browser-results.json), Dashboard [attempt 06](docs/parity/evidence/p9/p9-dashboard-parity-20261015/attempt-06/django/w4/browser-results.json), and Templates keyboard follow-up [attempt 01](docs/parity/evidence/p9/p9-keyboard-followup-20261015/attempt-01/django/w5/browser-results.json) close those local matrix rows, with 24/25 route-row statuses marked PASS. AI Voice deterministic local acceptance now passes at desktop and mobile sizes; /help-center is the sole unaccepted route pending owner disposition of P9-D9. See [voice attempt 04](docs/parity/evidence/p9/p9-voice-route-followup-20261015/attempt-04/P9_VOICE_COMMAND_RESULTS.json). Fresh W6 attempt 10 closes Scheduler, Manage Schedules and Scheduler Settings after the fixture reset was scoped to those application routes. Current-worktree W6 [attempt 11](docs/parity/evidence/p9/p9-keyboard-followup-20261015/attempt-11/P9_W6_COMMAND_RESULTS.json) additionally verifies the Manage Schedules sort disclosure with Enter and Space at both viewports.
**Latest device follow-up:** Desktop attempt 11 sent a real recording to local Django `/api/transcribe`, received HTTP 200, and displayed the mock transcript without saving audio or calling a provider. The run failed navigation cleanup: one active track remained live at `pagehide`. A `p7_media.js` cleanup fix was added after the run and is unverified. See [device/provider results](docs/parity/P9_DEVICE_PROVIDER_RESULTS.md) and the [attempt 11 result](docs/parity/evidence/p9/p9-desktop-permission-followup-20261015/device/desktop-mic/attempt-11/P9_DESKTOP_MIC_RESULTS.json).
**Active step:** P9 implementation is in closeout, but formal acceptance remains open; wait for explicit owner approval before P10. Full three-mode aggregate attempt 46 passed. After the final Filled Templates screenshot adjustment, app-only attempt 48 passed every W3-W7 journey using attempt 46 source captures; attempt 47's subsequent source retry stopped on local Vite `ERR_NO_BUFFER_SPACE` before comparison or app checks. The W4/W6 comparator negative controls passed; the route asset audit passed all 14 local static response checks; the bidirectional keyboard focus sweep passed all 48 rendered route/viewports; 37 hosted route/security checks passed with cleanup; visible schema sections match P5; and desktop recording, browser permission denial, and local mock transcription boundary checks pass. Current-scope follow-up passed 90 focused tests, Django's test-settings system check, and 12 synthetic voice-page journeys across two viewport sizes. The same-origin keyboard-link audit now passes all 50 route/viewports and 547 visible local links. Default-state paired screenshots for all 25 routes were manually reviewed, with the final Filled Templates screenshots checked separately. Formal acceptance remains open for `/help-center` (P9-D9), restricted Storage bucket metadata, physical mobile, no-device and actual empty/oversize capture, active-recording navigation cleanup (fix unverified), live-provider checks, human audibility and BFCache disposition under the protected routes' no-store policy. On 2026-10-15 the owner explicitly chose to keep every gate open; no `APPROVED EXCEPTION` exists.
**Next execution scope:** The owner chose to keep all P9 gates open. Finish only evidence within the current desktop-only/no-provider scope; obtain renewed scope/access for mobile hardware, provider calls, restricted Storage metadata and human audibility. Keep `/help-center` and BFCache open pending owner/security disposition. Do not start P10 implementation or readiness checks until the owner explicitly approves P10. Deployment and production soak remain later owner decisions.

**P5 closure result (2026-10-11):** The shared transaction-pooler probe passed all 65 hosted checks and cleaned all three synthetic accounts. A/B/A role/claims and private-row isolation, transaction cleanup, forced rollback/recovery and reused Django client connection passed. Local verification passed 95 pytest tests, Django's system check, focused mypy across 60 source files and Ruff.

**Session handoff:** [P9 closeout handoff](HANDOFF_2026-10-14_P9_CLOSEOUT.md). The earlier [local-readiness scope review](HANDOFF_2026-10-14_LOCAL_READINESS.md) is retained as a prior snapshot and is superseded by the latest instruction to wait before P10. The [P7 closeout and P9 kickoff](HANDOFF_2026-10-13_033145_IST.md) retains its valid historical evidence.

**P9 checkout metadata:** See [P9 start metadata](docs/parity/evidence/p9/p9-full-20261014-0723-utc/P9_START_METADATA.json), [current closeout metadata](docs/parity/evidence/p9/p9-full-20261014-0723-utc/P9_CLOSEOUT_METADATA.json), and retained [prior closeout snapshot 05](docs/parity/evidence/p9/p9-full-20261014-0723-utc/P9_CLOSEOUT_METADATA_PRIOR_05.json) and [snapshot 06](docs/parity/evidence/p9/p9-full-20261014-0723-utc/P9_CLOSEOUT_METADATA_PRIOR_06.json) plus the [earlier final metadata snapshot](docs/parity/evidence/p9/p9-full-20261014-0723-utc/P9_FINAL_METADATA.json). The earlier `main`/`3d16649` clean review predates P9 code changes; do not report it as the execution baseline.
**Latest local verification run:** [recheck ledger](docs/parity/evidence/p9/p9-local-final-verification-20261015/P9_LOCAL_RECHECKS.json), [start metadata](docs/parity/evidence/p9/p9-local-final-verification-20261015/P9_START_METADATA.json), [final metadata](docs/parity/evidence/p9/p9-local-final-verification-20261015/P9_FINAL_METADATA.json), and [closeout metadata](docs/parity/evidence/p9/p9-local-final-verification-20261015/P9_CLOSEOUT_METADATA.json).

**P10 status:** Prepared briefs/readiness notes exist, but P10 implementation is not authorized until the owner approves after P9. Earlier readiness observations remain in [P10 readiness](docs/deployment/P10_READINESS.md); they are not current work authorization.

**Owner scope revision:** The 2026-10-11 development-only request supersedes earlier SMTP, confirmation-delivery, legacy account and React Auth compatibility gates. Supabase remains the sole provider via its Python SDK. The supplied publishable key is configured. Automatic approval review blocked broad credential revocation; see [P4_CREDENTIAL_ROTATION.json](docs/auth/P4_CREDENTIAL_ROTATION.json).

**Folder policy:** P1 work belongs in migration/parity/, Python application work in migration/django/, and comparison evidence in docs/parity/. P2 created the Django foundation under migration/django/. Preserve the original app and reference folders through P9 and the P10 soak.

## 1. Purpose and authority

Use this file for current facts, evidence, decisions and blockers. Use [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for scope/gates and archived phase briefs for original scope. Root [prompt.md](prompt.md) contains the active P9 task. Evidence and dated reviews remain under `docs/pages/`, `docs/services/`, and `docs/parity/`.

On 2026-10-10 the user authorized implementation of the P2 brief on native Windows and the existing hosted testing project. P2 created restricted django_app and django_data roles and a django schema, migrated only Django sessions/migration bookkeeping, and verified both runtime aliases. The public application table catalog and Storage bucket count remained empty. No Docker, commits, pushes, deployment, P3 work or P0 recovery was part of P2. P1 carryovers remain assigned to their later phases.

Current repository evidence takes precedence over older status claims. User instructions determine authorization. A recommendation or an "approved" heading in an older document does not resolve a pending product decision.

The owner requested a basic P2 review and P3 prompt, then explicitly authorized P3 implementation. The P2 review isolated pytest from hosted databases and repeated the foundation checks successfully (9 tests, Ruff, mypy over 18 source files, framework/static checks and live read-only health); see [P2_REVIEW.md](docs/foundation/P2_REVIEW.md). P3 work is recorded separately in [P3_REPORT.md](docs/services/P3_REPORT.md). No P3 database write was performed.

The owner authorized P4 and then revised it on 2026-10-11 to clean development-only Django + HTMX + Supabase Python SDK Auth. Mandatory signup confirmation was disabled with that authorization. Fresh hosted Auth and browser checks pass; the generated account/session rows were cleaned up and no email was sent. Earlier template/SMTP and React/old-account gates are superseded. Privileged-key replacement/local artifact cleanup is prepared; retirement still requires approval after automatic review blocked the broader operation.

The user reports P0 is done. Carry that completion forward as owner-reported acceptance; this P1 implementation does not independently verify the recovery or provider actions. Earlier P0 evidence below remains a dated record and does not reopen P0 automatically.

The user also requires the existing application/reference folders to remain in their original locations until the migration is fully finished and verified. Preserve src/, server/, scripts/, public/, new pages/, page-screenshots/ and existing legacy configuration through P9 and the P10 soak. Run repeated comparisons against those originals; do not move them into legacy/ or overwrite reference screenshots. P11 runtime retirement needs the completion gates and a documented clean recovery reference; design/documentation/parity evidence remains retained. P0 removals stay in effect.

## 2. Historical repository snapshot

The table below describes the earlier handoff, not the current HEAD. The latest review inspected acba956 plus uncommitted P5 changes; see [P6 readiness review](docs/rendering/P6_READINESS_REVIEW.md). Preserve the current working tree.

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
| Migrated page path | P7 manifest routes are locally owned by Django templates/views; all 25 URL patterns resolve and the normal legacy fallback count is zero |
| Retained source/runtime | React 18, TypeScript, Vite, React Router and Express remain in their original folders for P9â€“P11 comparison/recovery; no traffic cutover or legacy retirement occurred |
| Styling | Django uses its P6 public/application shells and the pinned Tailwind CSS 3 build; source tokens remain in `tailwind.config.js` and the Django theme config |
| Identity / data | Django migrated pages use verified server sessions and P5 Supabase Python data services; the retained React stack keeps its separate existing session behavior |
| Speech | P8 provides browser MediaRecorder and same-origin multipart to Django/P3; live provider and physical-device behavior remain unverified |
| Groq | `src/config/api.ts` exports `GROQ_API_KEY` as `undefined`; the assistant can use its existing mock fallback |
| Activity | The retained React source uses localStorage; migrated `/activitylog` remains browser-local/example data and is not a server audit ledger |
| Settings / collaboration | Scheduler settings and dashboard preferences remain local; only P5-backed template share/review operations use real services |
| Screenshots | `scripts/screenshot.js` uses Node Playwright, route discovery and a desktop viewport; it does not set up a signed-in session |

The original React/Vite/Express app is preserved as a source/reference runtime, while the P7 route manifest is served through the Django path. This establishes local ownership, not production cutover or full P9 release acceptance. The `/documentation` page describes a target architecture and does not itself prove that every described capability is shipped.

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

P1 is finalized with owner-accepted exceptions. [P1_ACCEPTANCE.md](docs/parity/P1_ACCEPTANCE.md) records the exact scope, checks and phase assignments. Executed P1â€“P6 and [P7/P8 briefs](docs/pages/P7_P8_IMPLEMENTATION_PROMPT.md) are archived; root [prompt.md](prompt.md) prepares combined P7/P8 closure following the dated review.

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
| P5b | Complete | Hosted shared-pooler probe, A/B/A identity/data isolation, cleanup and local checks passed; see P5 evidence |
| P6 | Implemented; W1 closed both review findings | [Review](docs/rendering/P6_REVIEW.md) records R1/R2 disposition; [P6 report](docs/rendering/P6_REPORT.md) retains original delivery evidence |
| P7 W1-W7 | Closed within accepted development boundaries; SR-1 through SR-4 repaired and verified | [P7 finding closeout](docs/pages/P7_SR_CLOSEOUT_2026-10-13.md), [matrix](docs/pages/P7_P8_CLOSURE_MATRIX.md); 25 local owners and zero fallback |
| P8 | Deterministic media/development-session boundary revalidated | Fresh 16 media and 12 actual-page voice checks pass; P9 desktop microphone and denied-permission subsets passed; mobile and live-provider evidence remain open |
| P9 | Implementation closeout in progress; deterministic browser, asset, default-state screenshot review, hosted route, desktop recording, denied-permission, and local mock transcription boundary passed; formal acceptance remains open | [P9 report](docs/parity/P9_REPORT.md), [visual review](docs/parity/P9_VISUAL_REVIEW.md), [verification](docs/parity/P9_VERIFICATION.md) and [handoff](HANDOFF_2026-10-14_P9_CLOSEOUT.md); active-recording navigation cleanup awaits retest; `/help-center`, bucket metadata, mobile, no-device/empty/oversize, provider, audibility and BFCache gates remain open |
| P10 | Preparation brief created; implementation/readiness checks not run | [P10 task](docs/deployment/P10_IMPLEMENTATION_PROMPT.md), [readiness ledger](docs/deployment/P10_READINESS.md); deployment deferred by owner |
| P11 | Not started | Later deployed verification/soak and zero transitional usage evidence; preparation is insufficient |

The final P1 review added live read-only catalog inspection and historical screenshot review to offline harness checks. Legacy lint/type/build failures remain recorded. No browser capture, live Auth/RLS verification or deployment occurred. Earlier P0 scans/rewrite preflight retain their historical scope.

## 9. Decisions and schema limits

Q21 is resolved: retain /activitylog as a future feature, preserving current localStorage/example references. Q18 accepts historical screenshots for manual review; numeric thresholds, masks and a complete matrix remain deferred. Q2's current testing environment is confirmed and reachable.

The P2 brief chooses dedicated django-schema sessions, restricted django_app and django_data connection roles, no operational admin/Auth implementation, and standalone Tailwind compatible with existing tokens. These are bounded implementation defaults, not retrospective owner answers to all historical Q12/Q19/Q20 questions. Other product choices remain pending in the decision register.

The P4 implementation retains a functional persistent-sign-in choice with a 14-day absolute cap and mandatory verified service identity. The owner explicitly removed React Auth compatibility and old-account migration/testing requirements. Supabase uses email/password only. Django owns secure server sessions, refresh, local-scope logout and authenticated password changes. Profile/schema/Storage and application RLS were deferred from P4 and have since been implemented in P5. Email recovery is separate and unavailable; disabling signup confirmation does not provide email recovery.

Before P5, repository DDL was missing for template_shares, template_reviews and filled_templates, and the linked development target had no public app tables or Storage bucket. That says nothing about any historical source project. P5 now records new development contracts, applies a fresh baseline/reconciliation, and preserves historical migrations. Do not treat the newly created contracts as recovered legacy DDL or use personal dump rows as fixtures.

The app historically referenced template-files and public URLs. P5 created the private `template-files` bucket and policies and verified hosted owner/shared-recipient access, including revocation. P2 created only restricted roles and Django-owned state; public schema/Storage changes belong to P5 and are now recorded in the P5 report. P5's hosted shared-pooler identity, transaction-cleanup and connection-reuse checks passed as recorded in the closure evidence.

## 10. Sources and conflicts

| Source | Role |
|---|---|
| Current session | P9 execution and closeout: browser, hosted route, schema and desktop microphone/denial evidence gathered; local checks pass; owner chose to keep remaining gates open; formal P9 acceptance remains open and P10 waits for explicit approval |
| `docs/python-migration-plan.md` | Detailed target, phases, questions and wave order; revision history includes v0.3 |
| `docs/security-remediation.md` | Historical P0 changes and operator blockers; local-cleanliness claim superseded by merge evidence |
| `docs/p0-evidence/*.json` | Historical sanitized scan results |
| `README.md` | Project/UI history and recorded environment limitation; runtime claims need evidence |
| `docs/tables.md` | Historical migration/schema audit; inferred fields are not verified live DDL |
| Root `prompt.md` | Active P9 closeout only; P10 brief is a reference until explicit owner approval |
| `docs/prompt.md` | Current review, handoff, prompt and historical evidence index |
| `.commandcode/taste/taste.md` | Empty template; no migration requirements |
| Current routes, package/config/server/screenshot/activity files | Runtime and tooling evidence |

The old long plan contains stale headings and conflicting instructions. The [correction register](MIGRATION_PLAN.md#8-corrections-to-older-documents) defines this consolidation's interpretation without granting execution authority.

## 11. Handoff and updates

**Historical review update (2026-10-13):** At the time of the independent review, P7 remained open for SR-1 through SR-4 and P8 deterministic checks passed. The [P7 closeout](docs/pages/P7_SR_CLOSEOUT_2026-10-13.md) later closed those findings; P8 deterministic acceptance is complete and P9 has started. See the [P9 kickoff handoff](HANDOFF_2026-10-13_033145_IST.md) and active [P9 task](docs/parity/P9_IMPLEMENTATION_PROMPT.md). Paragraphs below retain their dated review scope.

At the 2026-10-13 review snapshot, prior mypy/Ruff/JS/static checks, 50 captures/14 interactions, 12 isolated fake-media checks, and hosted W5/W6 cleanup evidence did not close the newly identified P7/P8 findings. Subsequent work closed P7 SR-1 through SR-4 and P8 deterministic acceptance; see the [P7 closeout](docs/pages/P7_SR_CLOSEOUT_2026-10-13.md), [P8 verification](docs/services/P8_VERIFICATION.md), and [P9 kickoff handoff](HANDOFF_2026-10-13_033145_IST.md).

P2â€“P6 completion evidence and P1 accepted exceptions remain as previously recorded. P3 live speech evidence, P4 recovery email/production policy and credential follow-up remain separate. Preserve original source/reference folders through P9 and the P10 soak; P11 retirement needs its own gate.

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
