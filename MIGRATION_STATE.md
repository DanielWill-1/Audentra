# Migration state

**Updated:** 2026-10-17, P11 local legacy retirement
**Project:** Audentra / VoiceForm  
**Current owner scope:** P9 and all five P10 waves are complete and owner-accepted. The owner authorized local P11 legacy retirement with no entry gates. Deployment and hosted changes remain out of scope. Preserve the historical design, screenshot, parity, schema, and documentation records.
**Current P9 next work:** None within the current owner scope. Hosted `template-files` privacy, 20 MiB limit and MIME allowlist pass; see [schema acceptance](docs/parity/P9_SCHEMA_ACCEPTANCE.md). Retain the P1 manifest's separate `full_state_matrix_verified: false` value unchanged. The completed P10 local release-candidate review and prior local-preparation evidence are in the [P10 review](docs/deployment/P10_W5_RELEASE_CANDIDATE_REVIEW.md) and [readiness ledger](docs/deployment/P10_READINESS.md).
**Current P9 status:** Complete within the revised owner scope: all 25 route-level rows pass, P9-D9 is closed, and hosted Storage metadata matches the accepted configuration. The P1 full-state flag is separate and is not a P9 blocker. See [P9 report](docs/parity/P9_REPORT.md), [verification](docs/parity/P9_VERIFICATION.md), [matrix](docs/parity/P9_ACCEPTANCE_MATRIX.md), [schema acceptance](docs/parity/P9_SCHEMA_ACCEPTANCE.md), and [device/provider results](docs/parity/P9_DEVICE_PROVIDER_RESULTS.md).
**Historical progress snapshots:** The following dated paragraphs retain earlier evidence and statuses; the current P9 result and owner scope above govern.
**Current task:** P11 local retirement is implemented. The former root React/Vite/Express application and workflow are archived under `legacy/`; Django no longer proxies or falls back to that app. API services require Django session and CSRF, reject the retired request marker and bearer header, and transcription accepts multipart audio only. See [P11 closeout](HANDOFF_2026-10-17_P11_LEGACY_RETIREMENT.md). No deployment or hosted changes were made.
**Prior local follow-up:** Public W1/W2 [attempt 07](docs/parity/evidence/p9/p9-route-acceptance-20261014/attempt-07/django/) supports the public route comparisons. Fresh synthetic [attempt 14 W3-W7](docs/parity/evidence/p9/p9-route-acceptance-20261014/attempt-14/django/) passes all four Auth rows and reruns app workflows. Current-worktree W7 [attempt 03](docs/parity/evidence/p9/p9-w7-mobile-interactions-20261015/attempt-03/django/w7/browser-results.json), Activity Log [attempt 13](docs/parity/evidence/p9/p9-activity-parity-20261015/attempt-13/django/w7/browser-results.json), Dashboard [attempt 06](docs/parity/evidence/p9/p9-dashboard-parity-20261015/attempt-06/django/w4/browser-results.json), Templates keyboard follow-up [attempt 01](docs/parity/evidence/p9/p9-keyboard-followup-20261015/attempt-01/django/w5/browser-results.json), and W6 [attempts 10 and 11](docs/parity/evidence/p9/p9-keyboard-followup-20261015/) cover route interactions and expanded keyboard states. All 25 route-level rows pass; `/help-center` is closed under P9-D9 using the existing Chrome mobile-viewport evidence. AI Voice local acceptance is deterministic and synthetic; live provider work is paused for Scope 11. The separate P1 full-state flag remains false; hosted Storage metadata was subsequently verified by the supplemental read-only capture linked above.
**Prior device follow-up:** Desktop attempt 11 sent a real recording to local Django `/api/transcribe`, received HTTP 200, and displayed the mock transcript without saving audio or calling a provider. The run failed navigation cleanup: one active track remained live at `pagehide`. A `p7_media.js` cleanup fix was added afterward and remains unverified; the owner has paused this work for future Scope 11. See [device/provider results](docs/parity/P9_DEVICE_PROVIDER_RESULTS.md) and the [attempt 11 result](docs/parity/evidence/p9/p9-desktop-permission-followup-20261015/device/desktop-mic/attempt-11/P9_DESKTOP_MIC_RESULTS.json).
**Prior active-step summary:** Full three-mode aggregate attempt 46 passed. App-only attempt 48 passed W3-W7; attempt 47's later source retry stopped with local Vite `ERR_NO_BUFFER_SPACE` before comparison or app checks. The W4/W6 comparator negative controls passed; route asset audit passed all 14 local static responses; bidirectional focus passed 48 rendered route/viewports; 37 hosted route/security checks passed with cleanup; visible schema sections match P5. Default-state screenshot pairs for all 25 routes were manually reviewed. Current P9 next steps are limited by the owner scope stated above.

**P5 closure result (2026-10-11):** The shared transaction-pooler probe passed all 65 hosted checks and cleaned all three synthetic accounts. A/B/A role/claims and private-row isolation, transaction cleanup, forced rollback/recovery and reused Django client connection passed. Local verification passed 95 pytest tests, Django's system check, focused mypy across 60 source files and Ruff.

**Latest handoff:** [P11 local legacy-retirement closeout](HANDOFF_2026-10-17_P11_LEGACY_RETIREMENT.md) is the current session record. [P10 wave-plan handoff](HANDOFF_2026-10-16_P10_WAVE_PLAN.md), [P10 preparation handoff](HANDOFF_2026-10-15_P10_PREPARATION.md), and [P10 readiness](docs/deployment/P10_READINESS.md) retain their dated phase evidence. The [P9 closeout](HANDOFF_2026-10-14_P9_CLOSEOUT.md), [local-readiness scope review](HANDOFF_2026-10-14_LOCAL_READINESS.md), and [P7 closeout/P9 kickoff](HANDOFF_2026-10-13_033145_IST.md) retain their historical scope.

**P9 checkout metadata:** See [P9 start metadata](docs/parity/evidence/p9/p9-full-20261014-0723-utc/P9_START_METADATA.json), [current closeout metadata](docs/parity/evidence/p9/p9-full-20261014-0723-utc/P9_CLOSEOUT_METADATA.json), and retained [prior closeout snapshot 05](docs/parity/evidence/p9/p9-full-20261014-0723-utc/P9_CLOSEOUT_METADATA_PRIOR_05.json) and [snapshot 06](docs/parity/evidence/p9/p9-full-20261014-0723-utc/P9_CLOSEOUT_METADATA_PRIOR_06.json) plus the [earlier final metadata snapshot](docs/parity/evidence/p9/p9-full-20261014-0723-utc/P9_FINAL_METADATA.json). The earlier `main`/`3d16649` clean review predates P9 code changes; do not report it as the execution baseline.
**Latest local verification run:** [recheck ledger](docs/parity/evidence/p9/p9-local-final-verification-20261015/P9_LOCAL_RECHECKS.json), [start metadata](docs/parity/evidence/p9/p9-local-final-verification-20261015/P9_START_METADATA.json), [final metadata](docs/parity/evidence/p9/p9-local-final-verification-20261015/P9_FINAL_METADATA.json), and [closeout metadata](docs/parity/evidence/p9/p9-local-final-verification-20261015/P9_CLOSEOUT_METADATA.json).

**P10 status:** All five local-first waves are complete and the owner accepted the local release candidate. Deployment remains deferred. See the [release-candidate review](docs/deployment/P10_W5_RELEASE_CANDIDATE_REVIEW.md), [readiness ledger](docs/deployment/P10_READINESS.md), and [wave-plan handoff](HANDOFF_2026-10-16_P10_WAVE_PLAN.md).

**P4 scope record:** The 2026-10-11 development-only request superseded earlier SMTP, confirmation-delivery, legacy-account and React Auth compatibility requirements. Django uses the Supabase Python SDK for email/password Auth; Google and Azure OAuth remain out of scope. See the [P4 report](docs/auth/P4_REPORT.md) for its dated implementation record. P11 did not include credential or hosted-service changes.

**Folder policy:** P1 tooling belongs in `migration/parity/`, active Python application code belongs in `migration/django/`, and comparison evidence belongs in `docs/parity/`. P11 archives the former React/Vite/Express source and configuration under `legacy/`; screenshots, design references, schema history, migration documentation and parity evidence remain in their existing locations.

## 1. Purpose and authority

Use this file for current facts, evidence, decisions and blockers. Use [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for scope and archived phase briefs for original scope. The current local retirement record is [P11 closeout](HANDOFF_2026-10-17_P11_LEGACY_RETIREMENT.md); root `prompt.md` and older phase prompts are historical. Evidence and dated reviews remain under `docs/pages/`, `docs/services/`, and `docs/parity/`.

On 2026-10-10 the user authorized implementation of the P2 brief on native Windows and the existing hosted testing project. P2 created restricted django_app and django_data roles and a django schema, migrated only Django sessions/migration bookkeeping, and verified both runtime aliases. The public application table catalog and Storage bucket count remained empty. No Docker, commits, pushes, deployment, P3 work or P0 recovery was part of P2. P1 carryovers remain assigned to their later phases.

Current repository evidence takes precedence over older status claims. User instructions determine authorization. A recommendation or an "approved" heading in an older document does not resolve a pending product decision.

The owner requested a basic P2 review and P3 prompt, then explicitly authorized P3 implementation. The P2 review isolated pytest from hosted databases and repeated the foundation checks successfully (9 tests, Ruff, mypy over 18 source files, framework/static checks and live read-only health); see [P2_REVIEW.md](docs/foundation/P2_REVIEW.md). P3 work is recorded separately in [P3_REPORT.md](docs/services/P3_REPORT.md). No P3 database write was performed.

The owner authorized P4 and then revised it on 2026-10-11 to clean development-only Django + HTMX + Supabase Python SDK Auth. Mandatory signup confirmation was disabled with that authorization. Fresh hosted Auth and browser checks pass; the generated account/session rows were cleaned up and no email was sent. Earlier template/SMTP and React/old-account gates are superseded. Privileged-key replacement/local artifact cleanup is prepared; retirement still requires approval after automatic review blocked the broader operation.

The user reports P0 is done. Carry that completion forward as owner-reported acceptance; this P1 implementation does not independently verify the recovery or provider actions. Earlier P0 evidence below remains a dated record and does not reopen P0 automatically.

Historical folder-preservation instruction: keep the original application/reference folders in place through P9 and P10 verification. The owner superseded it on 2026-10-17 by authorizing local P11 archival without deployment, soak, telemetry, or recovery-reference entry gates. The old app is now under `legacy/`; design references, screenshots, schema history, documentation, and parity evidence remain retained. P0 removals stay in effect.

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
| Migrated pages | All 25 manifest routes resolve directly to Django templates/views; the legacy route proxy and rollback bridge are removed |
| Legacy app | The React/Vite/Express source, package manifests, build configuration, and former workflow are archived under `legacy/` and are outside the active Django runtime |
| Styling | Django uses the pinned standalone Tailwind CSS 3 build; active tokens live in `migration/django/config/tailwind.config.cjs` and `migration/django/assets/tailwind.input.css` |
| Identity / data | Active pages use verified Django sessions and server-side Supabase Python data services; the browser has no Supabase client credential |
| Service APIs | Chat and TTS require Django session and CSRF; transcription accepts multipart audio only; bearer headers and the former public request marker are rejected |
| Speech | Browser MediaRecorder submits multipart audio to Django; P10's Groq provider selection remains server-side |
| Activity | Django `/activitylog` remains browser-local/example data and is not a server audit ledger |
| Screenshots | Historical route screenshots and parity evidence remain in their existing folders; the old Node capture utility is archived under `legacy/scripts/` |

The active application is Django under `migration/django/`. The retired React/Vite/Express code is preserved in `legacy/`; no production traffic cutover or deployment is recorded. Historical screenshots, route manifests, parity reports, schema history, and documentation remain available.

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

`legacy/src/App.tsx` defines **25 routes: 13 public content routes, 4 authentication routes and 8 application routes**.

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
| P9 | Complete within current owner scope | [P9 report](docs/parity/P9_REPORT.md), [visual review](docs/parity/P9_VISUAL_REVIEW.md), [verification](docs/parity/P9_VERIFICATION.md) and [handoff](HANDOFF_2026-10-14_P9_CLOSEOUT.md); all 25 route-level rows and hosted Storage metadata pass, including P9-D9. The separate P1 full-state flag remains false and unchanged. BFCache is verified with `no-store` retained and full reload working. Physical mobile is excluded; physical edge cases/audibility are for owner manual review; recording/provider checks are paused for future Scope 11. |
| P10 | Implementation complete; owner-accepted local release candidate; deployment remains deferred | [P10 closeout](docs/deployment/P10_W5_RELEASE_CANDIDATE_REVIEW.md), [W3 privacy/security](docs/deployment/P10_W3_PRIVACY_SECURITY_REVIEW.md), [W4 website review](docs/deployment/P10_W4_WEBSITE_REVIEW.md), [readiness](docs/deployment/P10_READINESS.md), and [handoff](HANDOFF_2026-10-16_P10_WAVE_PLAN.md) |
| P11 | Local source/runtime retirement complete within owner scope; no deployment or hosted changes | [P11 closeout](HANDOFF_2026-10-17_P11_LEGACY_RETIREMENT.md); React/Vite/Express archived, Django fallback/bearer/marker/legacy transcription removed |

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
| Current session | P9/P10 are complete within the owner-accepted local scope and P11 local archival is complete. No deployment or hosted changes occurred. Deployment/soak remain deferred. Physical mobile and recording edge cases/audibility remain excluded. P1 full-state flag remains false and separate. Keep `no-store`. |
| `docs/python-migration-plan.md` | Detailed target, phases, questions and wave order; revision history includes v0.3 |
| `docs/security-remediation.md` | Historical P0 changes and operator blockers; local-cleanliness claim superseded by merge evidence |
| `docs/p0-evidence/*.json` | Historical sanitized scan results |
| `README.md` | Project/UI history and recorded environment limitation; runtime claims need evidence |
| `docs/tables.md` | Historical migration/schema audit; inferred fields are not verified live DDL |
| Root `prompt.md` | Historical 2026-10-15 local-preparation sub-sprint closeout |
| `docs/prompt.md` | P10 plan, handoff, and historical evidence index; P10 is complete |
| `.commandcode/taste/taste.md` | Empty template; no migration requirements |
| Current routes, package/config/server/screenshot/activity files | Runtime and tooling evidence |

The old long plan contains stale headings and conflicting instructions. The [correction register](MIGRATION_PLAN.md#8-corrections-to-older-documents) defines this consolidation's interpretation without granting execution authority.

## 11. Handoff and updates

**Historical review update (2026-10-13):** At the time of the independent review, P7 remained open for SR-1 through SR-4 and P8 deterministic checks passed. The [P7 closeout](docs/pages/P7_SR_CLOSEOUT_2026-10-13.md) later closed those findings; P8 deterministic acceptance is complete and P9 has started. See the [P9 kickoff handoff](HANDOFF_2026-10-13_033145_IST.md) and active [P9 task](docs/parity/P9_IMPLEMENTATION_PROMPT.md). Paragraphs below retain their dated review scope.

At the 2026-10-13 review snapshot, prior mypy/Ruff/JS/static checks, 50 captures/14 interactions, 12 isolated fake-media checks, and hosted W5/W6 cleanup evidence did not close the newly identified P7/P8 findings. Subsequent work closed P7 SR-1 through SR-4 and P8 deterministic acceptance; see the [P7 closeout](docs/pages/P7_SR_CLOSEOUT_2026-10-13.md), [P8 verification](docs/services/P8_VERIFICATION.md), and [P9 kickoff handoff](HANDOFF_2026-10-13_033145_IST.md).

P2â€“P6 completion evidence and P1 accepted exceptions remain as previously recorded. P3 live speech evidence, P4 recovery email/production policy and credential follow-up remain separate. Historical source/reference folders were preserved through P9/P10; P11 subsequently archived the application code while retaining comparison and design evidence.

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
