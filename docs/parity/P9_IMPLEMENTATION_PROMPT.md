# P9 task: independent parity and release acceptance

**Updated:** 2026-10-13 after P7 closeout. **Status:** P9 in progress; the owner authorized its start after SR-1 through SR-4 passed. The 25-route acceptance matrix was created before P9 execution. The first local/read-only route inventory passed 25/25 manifest/registry/resolver checks. P9 end-to-end rows remain NOT RUN until evidenced. P10/P11 remain separate.

## 0. Entry gate: establish facts before P9

Read the [session review](../pages/P7_P8_SESSION_REVIEW_2026-10-13.md), [current handoff](../../HANDOFF_2026-10-13_033145_IST.md), [P7/P8 matrix](../pages/P7_P8_CLOSURE_MATRIX.md), [prior closure report with correction](../pages/P7_P8_CLOSURE_REPORT.md), [MIGRATION_STATE.md](../../MIGRATION_STATE.md), [MIGRATION_PLAN.md](../../MIGRATION_PLAN.md), [P1 acceptance/carryovers](P1_ACCEPTANCE.md), [P6 rollback](../rendering/P6_ROLLBACK.md), and P3/P4/P5 contracts and verification. Inspect applicable AGENTS.md and actual mounted source.

P7 entry gate is satisfied. SR-1 through SR-4 are closed in [P7 finding closeout](../pages/P7_SR_CLOSEOUT_2026-10-13.md): source-backed comparisons and real negative controls, paired visual review and layout repairs, actual-page invalid settings rejection, and six source/Django timezone cases. The owner has authorized P9 start. Keep the original review findings as historical evidence; do not transfer them to P9 or call P9 complete.

Record current branch/HEAD, preserved dirty changes, source and Django content digests, runtime/browser versions, manifest digest, fixture/environment boundary and run ID. The reviewed baseline was HEAD `4e3e5c7e0a3bc383cea5d8b6b4d2ce18693469a6` plus uncommitted changes; refresh rather than assuming it is still current. Source captures must record their exact source revision/digests and the reference run consumed by comparison.

## 1. Acceptance matrix and deterministic comparison

The required `docs/parity/P9_ACCEPTANCE_MATRIX.md` was created before execution and covers all 25 manifest paths to its approved owner, anonymous/signed-in/role behavior, relevant empty/populated/error/validation states, desktop 1440×900 and mobile 390×844, keyboard/focus requirements, source control/copy/destination contract, fixture type, command/artifact and outcome. Use explicit `PASS`, `FAIL`, `NOT RUN`, or `APPROVED EXCEPTION`; name the owner decision supporting every exception. Keep deterministic browser, hosted data, real device and live-provider evidence distinct.

Capture source and Django using equivalent sanitized synthetic data, clock and state. Enforce meaningful source sections/order, copy, fields/types/labels, controls and fixed destinations through reviewed mappings. Fail unregistered differences. Test deliberate removal/change of required source/Django content at the real comparison boundary. Do not allowlist the entire current Django output or treat a toy checker fixture as route-comparison proof. Inspect layout, fonts, spacing, icons, wrapping, drawers/dialogs, focus and overflow at both viewports. Numeric image thresholds/masks require an explicit decision; otherwise record manual findings without a fabricated score. Preserve route-specific layouts.

Run the required actual-page journeys: Auth/session/refresh/logout/password change and failure states; dashboard navigation/local history/profile; template list/builder/CRUD/duplicate/visibility/export/private-file/sharing/review workflows; scheduler date/calendar/actions and schedule management/bulk exports; settings every tab/save/reset/import/export/invalid/storage errors; voice media/chat/review/return/save/list/delete; filled empty/populated/error states; account-scoped activity/filter/delete/untrusted rendering. Keep source-inactive controls and accepted unavailable integrations truthful.

## 2. Routes, session, security and rollback

Reconcile the unchanged manifest, current URL resolver and runtime inventory: 13 page owners, three Auth exclusions, one deliberate local 404, eight application owners, zero normal fallback unless an explicitly reviewed contract changes. Check expected HTTP methods, slash aliases, encoded/malformed-path denials, DEBUG=False, previews off, cache/referrer policy, protected-page access, static assets and absence of React/proxy bootstrap.

Exercise real session+CSRF middleware separately from browser fixture bypasses. Check signup/login/remember-me/refresh/expiry/provider outage/password-change/logout, principal verification and cross-account isolation. For service endpoints assert marker, origin, host, payload/byte limits, CSRF and identity denial before provider access. Preserve P4 development limitations; P9 does not add email recovery/OAuth/legacy identity migration.

Repeat representative public/protected exact-route rollback and restoration, fixed-origin/digest checks, header stripping, encoded/method rejection and fail-closed behavior. Record independent-session re-login expectations. Do not switch deployed traffic or assume a source login/error screen is successful protected parity.

## 3. Hosted data, RLS, Storage and schema acceptance

Use the authorized development project and restricted project-scoped pooler identities. Provision only fresh synthetic users and exact fixture rows/object paths through the existing seam; never use privileged fixture credentials for application request data access. Track resources before dependent actions, clean only generated IDs/paths/accounts/sessions in finally blocks, and make cleanup failure a blocking result.

Verify owner/editor/viewer/admin/reviewer/unrelated boundaries through actual Django session+CSRF routes and RLS. Cover template CRUD/visibility/duplicate/export, share/revoke/hide/roles, review content/status transitions, private Storage upload/download/replacement/revocation/delete and cleanup failure feedback, schedules create/edit/filter/row/bulk/mixed-owner rejection and exported bytes, and filled save/read/delete. Assert persisted rows, exact download/export bytes, cache/revocation behavior and denial before partial mutation. Do not claim browser fixture mutation is hosted persistence.

Create a read-only schema acceptance record against the accepted P5 baseline/migrations: tables, column types/nullability/defaults, constraints/foreign keys/indexes, ownership/RLS policies, grants/restricted roles, Storage bucket privacy/limits/policies and Django default-versus-Supabase alias separation. Record drift and its effect. This task does not authorize DDL, migrations, policy/grant changes or copying historical personal rows; request a concrete correction scope if drift requires mutation.

## 4. Physical device and provider acceptance

Execute the [P8 device checklist](../services/P8_DEVICE_CHECKLIST.md) on available real desktop/mobile devices. Record OS/device/browser versions, secure context, actual grant/deny/no-device permission, recorder MIME and actual blob bytes/metadata, audible preview/TTS, stop/reset/repeat/background/navigation/back-forward restoration, empty/oversize/error states and transcript review. Include the review's persisted-page lifecycle observation in real navigation tests. Synthetic pagehide/pageshow events do not prove BFCache eligibility/restoration.

Live STT/TTS/extraction requests require explicit owner authorization for the selected existing provider and spend. Preserve P3 backend/model/prompt/input semantics; do not upgrade/change providers for this task. Use harmless synthetic content, inspect sanitized request/response contracts, supported MIME encoding and sample-rate handling, transcript/field correctness, audible output and failure feedback. Record any latency/accuracy measures descriptively unless acceptance limits were approved. No live-provider or real-device pass may be inferred from mocks.

Unavailable hardware or unapproved live calls remain `NOT RUN`; continue independent local/hosted work and report the remaining gate. Do not mark P9 complete until required rows pass or the owner explicitly accepts concrete exceptions.

## 5. Verification discipline and deliverables

For a verified defect, establish a failing regression, make only the necessary repair, run focused checks, then perform one final aggregate verification after affected requirements are complete. Keep unrelated improvements in a backlog. Use native Windows and the existing pinned tools; no broad dependency upgrades or Docker.

From `migration/django/`, use the documented Store Python/PYTHONPATH workaround if needed: isolated `pytest -q -p no:cacheprovider`, Django check, `mypy apps config tests`, and `scripts/run_ruff.ps1 check apps config tests scripts`. Include new helpers in appropriate lint/syntax checks; describe mypy command scope accurately. Check changed JS syntax and complete browser modes explicitly; the default runner currently covers W1/W2/media and is not an all-wave runner. Write results to a new run directory rather than overwriting closeout/review evidence. Build pinned CSS/token checks and collectstatic when assets change. Run `git diff --check` after documentation changes.

Deliver:

- `docs/parity/P9_ACCEPTANCE_MATRIX.md`, `P9_REPORT.md`, `P9_VERIFICATION.md` and `P9_DIFFERENCES.md`.
- `P9_ROUTE_OWNERSHIP.json`, `P9_ASSET_INVENTORY.md`, `P9_SCHEMA_ACCEPTANCE.md` and `P9_DEVICE_PROVIDER_RESULTS.md`.
- `docs/parity/evidence/p9/<run-id>/` with source/Django screenshots/metadata, interaction/negative-control results, sanitized hosted/provider/device evidence, exact fixture cleanup and command/result ledger.
- Updated migration state/plan/indexes/readmes and a dated handoff distinguishing current evidence, retained evidence and unrun gates.

Use exact artifact links per requirement/control. Perform a final independent requirement-to-evidence read-through; route existence, file counts or unrelated passing tests are insufficient. P9 passes only when all required acceptance rows pass or have an explicit concrete owner exception. After a pass, prepare the concrete P10 deployment/soak proposal and stop. Do not deploy, soak or start P11.

## Preservation and authority

Preserve existing edits and original `src/`, `server/`, `scripts/`, `public/`, `new pages/`, `page-screenshots/`, Node/Vite configuration, legacy runtime and historical evidence through P9/P10. No commit/push, deployment, broad cleanup, production data, email/OAuth/team membership/reminder workers, credential retirement or legacy deletion is authorized. P9 local/read-only inventory has started. Use only the existing development project and restricted synthetic fixtures where the P9 contract authorizes them. Physical-device checks and live provider/spend remain NOT RUN without an explicit device/provider scope.
