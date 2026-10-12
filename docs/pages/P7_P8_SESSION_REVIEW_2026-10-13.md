# P7/P8 session review

> **Superseded status note - 2026-10-13:** This review records findings at review time. SR-1 through SR-4 were subsequently closed; use [P7_SR_CLOSEOUT_2026-10-13.md](P7_SR_CLOSEOUT_2026-10-13.md) and the current [matrix](P7_P8_CLOSURE_MATRIX.md) for present status.


**Reviewed:** 2026-10-13 01:03 IST. **Snapshot:** HEAD `4e3e5c7e0a3bc383cea5d8b6b4d2ce18693469a6` plus the preserved dirty tree.
**Verdict:** useful implementation and regression work, but the blanket P7/P8 closure verdict is not supported. P7 acceptance is reopened for SR-1–SR-4 below. The P8 deterministic package passes its bounded regression checks; physical-device/live-provider acceptance remains P9 work. P9 is drafted, not started, and its entry gate is not satisfied.

This review supersedes the earlier 26/26 closure claim and current-status statements that depended on it. Preserve the prior reports and results as dated evidence. A passing browser runner remains useful evidence for what it asserts; it is not proof of requirements it never checks.

## Findings, ordered by impact

| ID | Severity | Finding | Required disposition |
|---|---|---|---|
| SR-1 | High | W3–W7 source comparison is still incomplete. `scripts/p7_application_browser_check.cjs:290` asserts only the source H1. Line 293 checks a separate hardcoded Django contract. Source sections, fields, controls, destinations and missing copy are recorded at lines 332–350 but do not determine pass/fail. The negative controls at line 157 mutate a toy contract fixture, not paired source/Django evidence. | Reopen P7-R1. Build source-backed per-route/control mappings with narrowly documented contract exceptions; fail unregistered omissions and changes. Apply negative controls to representative real route fixtures at the same comparison boundary. Record the source run/revision/digest actually consumed; the default reference run at line 9 is older than the closeout run. |
| SR-2 | High | Visual/source preservation is not established. Inspected paired desktop screenshots show material differences: Dashboard adds a top tab strip and statistics row, shrinks/repositions the title and voice card, and changes the first-fold composition. Scheduler introduces Dashboard's sidebar and changes the header, controls, calendar and scheduling-entry presentation. P6's brief explicitly says not to assume every page shares Dashboard's sidebar and to preserve distinct layout needs. These layout changes are not covered by the listed development Auth/data exceptions. | Reopen the visual part of P7-R2/W4/W6 and review W3–W7 with the corrected source gate. Restore source-backed layout/content/controls or obtain a concrete owner-approved exception with paired screenshots and affected routes. No pixel threshold is invented. |
| SR-3 | Medium | Scheduler settings accepts invalid values. `static/js/p7_settings.js:46` allows zero for all numeric preferences; Save at line 137 does not enforce the input's validity. The actual page saved `defaultDuration: 0` while its input declares `min=1`. Working-hour import at line 37 merely slices strings: `25:99` was accepted, rendered as an empty time by the browser, and saved as an empty string with success feedback. Existing tests exercise malformed JSON and an unsupported theme, which miss these cases. | Reopen the W6 settings/P7-R2 row. Reject invalid numeric and HH:MM values consistently on import, save and export; preserve existing stored preferences on rejection. Add actual-page regressions for the reproduced cases and relevant source-supported field constraints. |
| SR-4 | Medium, evidence gap | Date-boundary proof is partial. The new Python tests use Django timezone overrides, mocked schedule services and an in-memory `stored` dictionary (`tests/test_p7_application.py:592–673`). They prove route handling preserves entered strings and intended UTC-derived boundaries, not source-browser equivalence or real database edge-case persistence. Source Scheduler mixes local calendar labels/Today with `toISOString()` event matching (`src/pages/Scheduler.tsx:64,170,489`); the source capture runner has no boundary timezone matrix. | Reopen the missing source-comparison part of P7-R3. Compare source and Django under a frozen clock in positive/negative offsets and DST boundaries, document actual display/query differences against P5, and reuse valid service proof only for its exact boundary. Do not introduce a new timezone product or silently change P5 semantics. |

The independent [probe script](evidence/review-20261013/review_session_checks.cjs) and [JSON results](evidence/review-20261013/session-review-results.json) reproduce SR-1 and SR-3. SR-1 executes the exact source-side assertion against recorded source metadata: removing sections, controls, destinations, fields or copy leaves that guard passing. This is a focused guard probe, not a whole Playwright run with edited source files. SR-3 uses the actual Django settings page and shipped JavaScript with the isolated browser fixture. The [settings screenshot](evidence/review-20261013/settings-invalid-values-saved.png) records the resulting invalid state.

Visual evidence inspected: [source Dashboard](evidence/w4/closeout-20261012/legacy/dashboard-desktop.png), [Django Dashboard](evidence/w4/closeout-20261012/django/dashboard-desktop.png), [source Scheduler](evidence/w6/closeout-20261012/legacy/scheduler-desktop.png), [Django Scheduler](evidence/w6/closeout-20261012/django/scheduler-desktop.png). These two desktop pairs do not constitute a new all-route/all-viewport visual approval.

## What holds up

- Recorder attempts now own their streams/recorder/chunks, pending starts are guarded, stale callbacks are suppressed, and terminal errors/reset/navigation clean up. The refreshed 16-check fake-media suite passes.
- The real selected-template Django page loads its shipped scripts and passes the 12-check deterministic voice journey, including duplicate/stale extraction, reviewed edits, conversation return, synthetic save/list/delete and TTS replacement/error/cancellation. Both tested viewports have no overflow. API interception is correctly identified as mocked.
- Session+CSRF transcription acceptance/rejection tests independently use the real middleware boundary. Fresh local pytest passes 167 tests; Django check, configured mypy across 93 files and Ruff pass.
- The private Storage download guard distinguishes template discovery from file authorization. Retained hosted results record 37 route checks, three synthetic accounts, zero emails and exact cleanup success. This review read that evidence and did not repeat hosted writes.
- Route ownership remains 25 local paths with zero normal fallback. The original source/runtime is unchanged relative to HEAD, the executed closeout prompt hash still matches `E1CFD63DECA1180F8D583DB38DD13BA1619BCB7167D6B4A73BA7CF6950661B17`, and no commit/deployment/legacy removal occurred.

## Additional observations

OBS-1: after synthetic persisted `pagehide`/`pageshow` events, Record remains disabled because the media/voice scripts keep `disposed=true` and have no restore handler. The probe does not establish actual browser BFCache eligibility/restoration. Include real back/forward navigation in P9/device acceptance; this observation alone is not counted as a current P8 blocking finding.

OBS-2: the hosted helper passed Ruff and its retained runtime probe, but standalone strict mypy reported errors in the prior session. The normal command targets `apps config tests`; the mypy configuration itself does not exclude `scripts/`. Describe the command boundary accurately rather than suggesting the helper was type-checked or configured out. Broad typing refactoring is not required by this review.

The previous matrix groups many controls into broad rows, and wave report/verification/asset addenda repeat generic PASS text. These records need a more precise requirement-to-evidence mapping after SR-1–SR-4 are repaired. Their existence, screenshot counts and interaction-group counts do not establish every source requirement.

## Fresh verification and limits

| Check | Fresh result |
|---|---|
| Store Python runner with `.venv-p2/Lib/site-packages`; `python -m pytest -q -p no:cacheprovider` | 167 passed in 15.36s |
| `python manage.py check` | No issues |
| `python -m mypy apps config tests` | Clean, 93 source files |
| `scripts/run_ruff.ps1 check apps config tests scripts` | Passed |
| `node docs/pages/evidence/review-20261013/review_session_checks.cjs` | SR-1 and SR-3 reproduced; synthetic restore observation recorded; fixture database removed |
| P7 runner `--media-only`, `P8_EVIDENCE_DIR=docs/services/evidence/p8/review-20261013-regression` | 16 passed, fake media and intercepted API |
| P7 runner `--voice-only`, `P8_VOICE_EVIDENCE_DIR=docs/pages/evidence/w7/review-20261013` | 12 passed; 1440×900 and 390×844, no overflow |

The review did not rerun every wave, hosted fixture writes, static build, physical microphones, paid/live providers, deployment or schema changes. No application implementation was changed in this review. Documentation statuses and the P9 task were corrected to match the findings. Later successful tests must not erase these limits.

## Assessment of the three-hour session

The scope was substantial: media races, TTS ownership, Auth/form flows, a mutable browser fixture, template/Storage/review/scheduling/filled paths and hosted cleanup. It was more than a small documentation task. However, the final unconditional closure claim was premature: a weak comparison gate and untested invalid settings survived, while considerable effort went into repeating generic closure statements and matrix/file-count validation. The useful fixes do not make that verdict reliable.

No reliable per-command/model timing ledger exists for the prior session, so this review cannot attribute the entire three hours or all dirty-tree changes to a single activity. The baseline was already dirty. A better next pass should repair one concrete finding at a time, prove a failing regression, run focused checks, and perform one final aggregate run after acceptance gaps close. P9 should start only after these P7 findings are closed or the owner explicitly accepts concrete exceptions.
