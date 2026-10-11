# Finish P7 and P8 completely, then hand off to P9

**Updated:** 2026-10-12 02:19:14 IST (Asia/Kolkata, UTC+05:30).
**Status:** Ready for the next implementation request. This update prepares the brief only.
**Scope:** Close every remaining requirement of all seven P7 waves and P8, including P7-R1–R5 and P8-R1–R6. Repair existing implementation and supply missing evidence. Successful execution must leave P7/P8 closed and P9 as the next phase. P8 is a separate prerequisite, not an eighth P7 wave.
**Authority:** The owner explicitly expanded the P8-only closeout to complete P7 and P8 together. This supersedes the P8-only stopping boundary in the dated reviews/handoff and [previous closeout prompt](docs/services/P8_CLOSEOUT_PROMPT_2026-10-12.md). Existing review findings, development contracts and preservation limits still apply.
**Baseline:** HEAD `acba9564752f1c121b81d17f59fca4d3f2b9b0f8` plus the preserved dirty tree. All 25 manifest routes have local owners; normal legacy fallback is zero. Fresh review passed 145 pytest tests and Django check. P7/P8 unconditional completion claims were superseded by dated reviews.

When asked to execute this prompt, work continuously through the entire P7/P8 closeout without stopping after a finding or wave or requesting routine wave approvals. Do not stop at P8 with known P7 work outstanding. Read the archived all-wave brief as the full requirement baseline: the review findings are a minimum backlog, not a replacement for requirements that were missed by the review. Execute P9 only after a later owner request; prepare its brief at the end of successful closure.

## Read first

1. Latest owner instructions and applicable AGENTS.md; [dated handoff](HANDOFF_2026-10-12_020354_IST.md), [P8 review](docs/services/P8_REVIEW_2026-10-12.md), [P7 review](docs/pages/P7_REVIEW_2026-10-12.md), MIGRATION_STATE.md and MIGRATION_PLAN.md.
2. P8_REPORT.md, P8_CONTRACTS.md, P8_VERIFICATION.md and historical evidence in `docs/services/`; archived [P7/P8 brief](docs/pages/P7_P8_IMPLEMENTATION_PROMPT.md), all seven P7 wave reports/verification/assets/ownership snapshots and aggregate reports/differences.
3. P3_CONTRACTS.md/P3_REVIEW.md, P4_CONTRACTS.md/P4_REPORT.md, P5_CONTRACTS.md and P5_VERIFICATION.md; preserve accepted provider, identity, CSRF, byte-limit, RLS and legacy-input semantics.
4. Mounted source `src/pages/AIVoiceAutoFill.tsx`, `src/services/ai.ts` and related field mapping/playback; actual Django `static/js/p7_media.js`, `p7_voice.js`, `apps/application/views.py`, `templates/application/voice_autofill.html`, `apps/api/`, `apps/speech/`, `apps/ai/`, `apps/voice/` and relevant tests/browser fixture settings.
5. `docs/parity/flows.md`, route-manifest.json, P1_ACCEPTANCE.md, current source for every affected page/component and its mounted service path. Review the actual source control inventory rather than relying only on the prior reports.
6. Existing `scripts/p8_media_check.cjs`, P7 browser/source runners, hosted route probe, route registry/resolver/rollback and W7 route tests. Read their mocks/bypasses before reusing them.

Record HEAD, dirty state and baseline. Keep original source/evidence in place. Historical mock/hosted results do not replace the actual missing checks below.

## Combined execution order and requirement matrix

Baseline and requirement matrix → P8-R1–R6 repairs → P7 comparison and W3–W6 missing flows/hosted proof → W6 time-boundary checks → actual-page W7 voice/filled/activity closure → all-wave regression/comparison/ownership/rollback checks → final P7/P8 closure report and P9 prompt. Independent checks may be grouped, but repaired P8 must pass before W7 closes.

Create `docs/pages/P7_P8_CLOSURE_MATRIX.md` before implementation. Map every requirement/control in the archived brief and current source to wave/route, existing implementation, missing repair, actual test/evidence path, fixture type, outcome and any explicit pre-existing exception. Include every P7/P8 review ID. Reuse evidence only when it proves the same current behavior at the same boundary; service tests do not automatically prove a page interaction, and mock saves do not prove hosted persistence. Keep the matrix current throughout execution.

### P7-R1: enforce source content and reachable behavior

Extend W3–W7 comparisons to enforce route-specific sections/order, headings, labels/fields, local destinations and meaningful control behavior. Retain the passing W1/W2 comparison/clipboard regressions. Normalize only justified presentation differences; explicitly register differences supported by the owner-approved development contracts. Do not blanket-allow current output, missing source sections or token differences. An implementation report calling a difference accepted is insufficient authority on its own.

Add negative controls proving that removing a required section/control/destination or changing an expected field causes the comparison gate to fail. Inspect source and Django screenshots at 1440×900 and 390×844, including successful protected states. Check fonts, wrapping, mobile drawers, overflow, console errors, failed requests, keyboard/focus and no React/proxy bootstrap. Numeric pixel tolerances remain unapproved; record visual inspection without inventing a score. Correct missing preserved UI/flows as part of this task.

### P7-R2: finish the required page and route flows

Audit all seven waves, including W1/W2 regressions. The following W3–W6 checklist is mandatory; finish missing implementation as well as verification:

| Wave | Required closeout |
|---|---|
| W3 Auth/navigation | Real accepted signup/login/session/remember-me/logout/password-change navigation; full-page/HTMX validation/errors, double submission, CSRF rejection, safe next paths, expired/refreshed/provider-unavailable sessions, protected routes, cache/referrer policy and verified public/app navigation. Exercise browser forms rather than only capturing them. Recovery/reset/OAuth retain accepted unavailable states; no email/OAuth integration. |
| W4 Dashboard | Home/Team/Settings, mobile drawer, overview/cards/refresh, recent local activity, upcoming events and quick actions. Audit each reachable source dialog, open/close/Escape/focus/validation/result, empty/populated/error state and fixed safe navigation. Preserve local preferences and truthful demo/unavailable membership/invite behavior; contracted sharing/reviews must reach working P5-backed flows. |
| W5 Templates | List/grid/search/category/sort; builder stepper/manual/upload paths; add/reorder/remove/required fields; persisted create/edit/duplicate/visibility/confirmed delete; template export bytes. Inspect actual source parsing semantics and preserve supported behavior without claiming unsupported parsing. Exercise private upload/download/replacement/delete, cacheNonce/revocation, cleanup failure feedback, UUID share/revoke/hide/role and review queue/request/content/status flows through actual routes. Verify owner/editor/viewer/admin/reviewer/unrelated boundaries without adding anonymous shares or membership/email backends. |
| W6 Scheduler | Month/week, previous/next/today/date selection, create/edit/delete/cancel and validation/results; management search/type/status/sort, selection and row/bulk complete/cancel/export/delete. Verify every selected ID under the principal, reject mixed foreign IDs before any partial mutation, and check exported bytes and persisted changes. |
| W6 Settings | Every tab, per-user local keys/defaults, Save/Reset, actual JSON import/export roundtrip, invalid JSON/unsupported values/storage failures and accessible errors. Integration/notification toggles remain honest local state. |

Finish the missing real development-project evidence using the already approved minimal synthetic fixture boundary. Extend the hosted Django route probe or a focused successor for private Storage transfers/replacement/revocation/delete and review transitions, and any persistence path not established by retained valid route evidence. Use fresh synthetic accounts and exact template/share/review/schedule/filled IDs and Storage object paths. Assert downloaded bytes/content, persisted rows and access denials; exercise actual Django session+CSRF routes. No paid speech provider or email delivery is needed.

Use restricted project-scoped pooler identities and P5 verified-principal RLS. Privileged test credentials are allowed only at the existing authorized fixture provisioning/cleanup seam, never for application request data access. Track created resources before further operations and cleanup in finally blocks, including on failure. Delete only generated IDs/objects/accounts/sessions; record sanitized checks and exact cleanup. Preserve all pre-existing project data. Treat cleanup failure as an unresolved gate rather than claiming success. Do not replace hosted semantics with mocked permission checks.

### P7-R3: timezone and date boundary proof

Add deterministic UTC/local midnight, positive/negative offset and DST transition fixtures to scheduling selectors/routes/calendar/settings as applicable. Compare entered values, stored semantics, query date boundaries and displayed results against the source and P5 contract. Prove create/edit/filter/export behavior at those boundaries. Preserve entered date/time and established UTC-derived P5 semantics; document observed differences without introducing a new timezone product or schema.

### P7-R4/R5: W7 and the P8 dependency

The P8 actual-page journey below is also required W7 evidence. Complete Voice AutoFill template selection, capture/chat, ID/label field matching, editable review, return-to-chat state, incomplete feedback, successful real filled save/list/confirmed delete and safe retries. Prove unavailable/revoked template on extraction and save and unrelated-account denial. Include one minimal hosted Django-route filled-record persistence/read/delete check with deterministic extraction or pre-reviewed synthetic values; no live provider is needed. Keep browser mocks distinct from that persistence evidence.

Finish owner-scoped filled-template empty/populated/error/snapshot states and source navigation. Audit Activity's source-supported local/example feed, refresh/search/type/date filters and row deletion, preserving existing browser data and safe untrusted rendering. Document any bounded browser-key isolation correction. Do not add an activity database, audio-upload UI, filled export or new behavior for source-inactive controls.

Every remaining original requirement must have a concrete implementation/evidence disposition in the closure matrix. P7-R5 closes only after all P8 findings below pass. Known P7 gaps cannot be relabeled as P9 tasks to meet the completion target.

## 1. P8-R1: own each recording attempt's resources

Reproduce the review ordering cases before repair:

```powershell
node docs/services/evidence/p8/review-20261012/reproduce_media_races.cjs
```

This probe asserts defects exist; exit zero is not acceptance. Preserve the recorded review artifact unchanged. Add separate regression tests that express correct behavior and fail on the current implementation.

- Delayed stop/data events from recording A after reset/start B must never stop B's stream or append A's chunks to B.
- Out-of-order permission responses must never overwrite another attempt's active stream. Dispose stale streams directly using their own references.
- Disable/guard repeated start while permission is pending; reset/pagehide invalidate pending attempts and release resources exactly.
- Use per-attempt stream/recorder/chunks and generation guards before mutating current UI/resources. Keep the implementation small; no media framework.
- Prove tracks stop on their own stop/reset/navigation/error, object URLs are revoked when replaced/discarded, and stale async responses cannot report success.

## 2. P8-R2: recorder failures and terminal controls

Handle `MediaRecorder` asynchronous errors as well as construction/start failures. Surface accessible failure with typed-input fallback. Clean its stream/recorder/chunks/preview without touching newer attempts. Restore Record/Stop/Transcribe controls consistently for error, empty, oversized and reset outcomes. Exercise delayed error, delayed stop, empty/oversized capture and retry; prove no failed capture produces a stale success or upload.

Retain current audio/envelope byte caps and visible denial/no-device/no-recorder/unsupported states. No automatic mock success on a live failure.

## 3. P8-R3: TTS playback lifecycle

Repair the existing `/api/tts` response playback in `p7_voice.js`. Keep an owned playback handle; pause/release previous audio on replacement/navigation/disposal and suppress late responses. Handle rejected `play()`, failed/invalid response, repeated click and pending request cancellation/replacement visibly. Use deterministic fake Audio/API responses for tests; no real provider call. Do not change TTS prompts/options/provider configuration.

## 4. P8-R4: actual-page authenticated integration

Keep useful isolated harness checks, but add a test visiting the actual selected-template `/AIVoiceAutoFill?template=...` page and loading its real scripts. Use controlled synthetic identity/data and deterministic media/providers. Clearly label intercepted browser APIs separately from a server test that proves authenticated session+CSRF enforcement.

Required successful journey: select accessible template → record/stop/preview → multipart transcript → review transcript → browser chat `/api/ai/extract` → edit extracted field → submit reviewed values → filled list → confirmed delete. Verify returned data and field values, not just status messages. Capture meaningful successful states at desktop/mobile with legacy browser session/storage cleared. Assert no React bootstrap/fallback and no unexpected console/network/overflow failures.

Add server request-boundary tests with `enforce_csrf_checks=True`, a real Django synthetic session containing the expected Supabase auth state, patched provider validation at the established seam, valid CSRF/marker/origin and **no Authorization header**. Prove accepted multipart reaches the deterministic transcriber; missing/expired session, wrong CSRF, disallowed origin/missing marker reject before provider access. Reuse valid P4 tests where they cover the exact contract; avoid fixture middleware that bypasses the boundary being asserted.

Prevent stale/duplicate chat/media success and verify real page forms retain reviewed conversation/data state. Investigate separate save-form conversation fields, manual edits before subsequent chat and Return to chat navigation against mounted source semantics; make only fixes needed for this integrated flow. Recheck accessible template on save; test revoked/unreadable template and unrelated-user denial. Label mocked save/list/delete accurately; a mock result must not be reported as hosted persistence.

The isolated P8 boundary requires no hosted provider call. The combined P7 task separately requires the minimal hosted Storage/review/filled persistence evidence above; a mocked browser journey cannot close those gates.

## 5. P8-R5: deliberate codec and provider boundary

Inventory every advertised recorder MIME and the current P3/server/provider behavior. Parameterized WebM/Ogg do not match the current adapter's exact encoding-map keys; MP4 lacks an explicit entry. Add deterministic fake-provider request assertions for supported MIME parameters and byte limits. Normalize media-type parameters deliberately for backend configuration where appropriate while retaining truthful captured blob metadata; never relabel audio bytes.

If a recorder format cannot be supported within the established P3 contract, remove it from advertised capture choices or show an explicit unsupported state. Do not introduce a transcoding service, dependencies or speculative codec support. Preserve existing supported JSON/base64 clients until P11 and existing provider/model/prompt/error semantics. Keep byte/MIME validation before provider access; any contract correction must be documented and covered by focused legacy regression tests. Mock transcription success alone is not codec proof, and no live/provider/device success is authorized or inferred.

## 6. P8-R6: physical-device checklist and honest evidence

Create `docs/services/P8_DEVICE_CHECKLIST.md`: browser/version/OS, secure context, real granted/denied/no-device permission, supported recorder MIME, audible preview/TTS, stop/reset/repeat/background/navigation cleanup, empty/size/provider failure and transcript correctness. Include desktop/mobile dimensions, expected evidence, mock-versus-real columns and explicit **not run** status. Physical microphone/live provider execution belongs to later P9 acceptance; this prompt prepares that checklist.

Update P8 contracts/report/verification with each review ID's disposition, exact commands, actual-page integration evidence, remaining device/provider limits and reproducible tests. Preserve all original 12-check and defect-reproduction artifacts; write new dated evidence separately, using configurable output directories where needed.

## Aggregate verification and closure deliverables

Before fixing each reproduced behavior, establish a failing regression. Run focused tests during repair, then full isolated pytest, Django check, appropriate mypy/Ruff including new helpers/probes, syntax checks for changed JS/helpers, all-wave deterministic browser comparisons and actual-page integration. Build/verify pinned static output and collectstatic if source assets change. Verify request bytes/headers, exported/downloaded data, actual field state, persistence, role/session denial and exact cleanup. Run `git diff --check` after documentation updates. Avoid test assertions that simply mirror implementation without exercising the required behavior.

Reconcile the runtime registry with the unchanged 25-path manifest, documented ownership and actual URL resolver; retain zero normal fallbacks and all Auth exclusions. Preserve representative public/protected exact-route rollback/restoration and encoded/method rejection checks, independent-session re-login limits, fixed origin/digests/header stripping and fail-closed behavior. Reuse valid browser rollback evidence; repeat affected checks if route/session/rollback implementation changes. Normal captures must use DEBUG=False, previews off and fallback disabled/unavailable.

Native local runner from `migration/django/`:

```powershell
$p8Python = Join-Path $env:LOCALAPPDATA 'Microsoft/WindowsApps/PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0/python.exe'
$env:PYTHONPATH = (Resolve-Path -LiteralPath './.venv-p2/Lib/site-packages').Path
$env:DJANGO_SETTINGS_MODULE = 'config.settings.test'
& $p8Python -m pytest -q -p no:cacheprovider
& $p8Python manage.py check
& $p8Python -m mypy apps config tests
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_ruff.ps1 check apps config tests scripts
```

Do not claim an environment-blocked check passed; use the actual tool escalation policy for a required blocked local process. No reinstall/broad cleanup just to avoid existing runner quirks.

Deliver repaired code, meaningful tests and separate dated source/Django/browser/server/hosted evidence, completed closure matrix and device checklist. Update every affected wave report/verification/assets/ownership record, P7 aggregate report/verification/differences/route inventory, P8 contracts/report/verification and both review finding dispositions. Preserve original dated findings and historical results; append closure evidence rather than erasing them. Update MIGRATION_STATE.md, MIGRATION_PLAN.md, docs/prompt.md, readmes and a newly dated/time-stamped session handoff with consistent actual status.

Produce `docs/pages/P7_P8_CLOSURE_REPORT.md` covering every requirement and review ID, repairs, exact commands/results, source/fixture revisions, runtime/settings, hosted checks/cleanup, route/rollback checks and evidence links. Distinguish deterministic versus hosted versus unrun physical/live results. Run an independent final read-through of the matrix and reports: existence of a route, screenshot, file or passing unrelated test is insufficient to close a requirement.

### Completion gate and P9 handoff

P7/P8 are complete only when all of the following are evidenced:

- All seven P7 wave requirements and P7-R1–R5 are implemented and verified within accepted development boundaries; all P8-R1–R6 have concrete passing dispositions.
- Enforced source/control comparisons and negative controls pass; required actual-page interactions, accessibility/mobile checks, session/CSRF/object/role denials and timezone fixtures pass.
- Required hosted route Storage/review/filled persistence evidence passes with exact cleanup; mock success is not counted as hosted proof.
- The full regression/tool/static checks and all 25 route-owner/zero-fallback/rollback checks pass; current reports/indexes agree with the closure matrix.
- Remaining items are exclusively established later-phase gates or explicit pre-existing accepted exceptions, such as physical-device/live-provider proof and full P9 release acceptance. No newly discovered required P7/P8 gap is hidden among those items.

After this gate passes, archive this executed combined brief as `docs/pages/P7_P8_CLOSEOUT_PROMPT.md`, prepare `docs/parity/P9_IMPLEMENTATION_PROMPT.md` grounded in P1 acceptance/carryovers, MIGRATION_PLAN.md and the actual closure evidence, and replace root `prompt.md` with the ready-to-execute P9 brief. The P9 brief must cover full route/visual/behavior/data/Auth/RLS/Storage/provider/schema release acceptance, the explicit unrun physical-device/live-provider matrix and review/approval needs for any external actions. Do not run P9 in this task. Final report must state that P7/P8 are closed and P9 is next only when the gate actually passes.

If a genuinely required decision or external dependency remains unavailable, continue all independent authorized P7/P8 work, record its exact unresolved gate and report incomplete status. Do not prepare a P9-ready completion claim from a blocked or failed P7/P8 gate.

## Bounds and stop point

Native Windows; application edits in `migration/django/`, P7 evidence in `docs/pages/`, P8 evidence in `docs/services/`. Preserve the original app, assets, design references and existing dirty edits. Keep session-derived authority, CSRF/RLS, private Storage and field-review semantics. No bearer token bridge, schema/auth provider change, email/OAuth/team/reminder integration, audio-upload/new filled export feature, dependency upgrade, Docker, paid/live provider call, commit/push, deployment or legacy deletion. Minimal development-project hosted fixture verification is authorized only as scoped above.

Finish P7 and P8 together, with no known requirement left outstanding, then prepare the P9 handoff/brief and stop. The latest request updates this prompt only; implementation begins when the owner asks to execute it. P9 execution, P10 deployment/soak and P11 retirement remain later scopes.
