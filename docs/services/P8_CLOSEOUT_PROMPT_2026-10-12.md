# P8 media repair and integration closeout

**Archive:** Previous repository-root prompt, superseded by the owner-requested combined [P7/P8 closure prompt](../../prompt.md) on 2026-10-12 02:19:14 IST. Embedded repository paths retain their original root context; local Markdown links below are rebased for this archive location. This draft was not executed.

**Prepared:** 2026-10-12 02:03:54 IST (Asia/Kolkata, UTC+05:30).
**Status:** Ready for the next implementation request; not executed by the review turn.
**Scope:** Finish the existing P8 bridge and its deterministic actual-page integration. P8 already exists; preserve it and repair the review findings. P7 has seven waves, with P8 as a separate prerequisite.
**Baseline:** HEAD `acba9564752f1c121b81d17f59fca4d3f2b9b0f8` plus the preserved dirty tree. All 25 manifest routes have local owners; normal legacy fallback is zero. Fresh review passed 145 pytest tests and Django check. P7/P8 unconditional completion claims were superseded by dated reviews.

When asked to execute this prompt, continue through all six P8 findings and aggregate verification without approval stops between items. Finish reviewable local repairs within these bounds; do not recreate the media bridge or silently broaden to all remaining P7/P9 work.

## Read first

1. Latest owner instructions and applicable AGENTS.md; [dated handoff](../../HANDOFF_2026-10-12_020354_IST.md), [P8 review](P8_REVIEW_2026-10-12.md), [P7 review](../pages/P7_REVIEW_2026-10-12.md), MIGRATION_STATE.md and MIGRATION_PLAN.md.
2. P8_REPORT.md, P8_CONTRACTS.md, P8_VERIFICATION.md and historical evidence in `docs/services/`; archived [P7/P8 brief](../pages/P7_P8_IMPLEMENTATION_PROMPT.md).
3. P3_CONTRACTS.md/P3_REVIEW.md, P4_CONTRACTS.md/P4_REPORT.md, P5_CONTRACTS.md and P5_VERIFICATION.md; preserve accepted provider, identity, CSRF, byte-limit, RLS and legacy-input semantics.
4. Mounted source `src/pages/AIVoiceAutoFill.tsx`, `src/services/ai.ts` and related field mapping/playback; actual Django `static/js/p7_media.js`, `p7_voice.js`, `apps/application/views.py`, `templates/application/voice_autofill.html`, `apps/api/`, `apps/speech/`, `apps/ai/`, `apps/voice/` and relevant tests/browser fixture settings.
5. Existing `scripts/p8_media_check.cjs`, P7 browser runner and W7 route tests. Read their mocks/bypasses before reusing them.

Record HEAD, dirty state and baseline. Keep original source/evidence in place. Historical mock/hosted results do not replace the actual missing checks below.

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

No hosted mutation is needed for this P8 deterministic boundary. Remaining P7 private Storage/review/persistence gates stay explicit rather than being closed by a browser mock.

## 5. P8-R5: deliberate codec and provider boundary

Inventory every advertised recorder MIME and the current P3/server/provider behavior. Parameterized WebM/Ogg do not match the current adapter's exact encoding-map keys; MP4 lacks an explicit entry. Add deterministic fake-provider request assertions for supported MIME parameters and byte limits. Normalize media-type parameters deliberately for backend configuration where appropriate while retaining truthful captured blob metadata; never relabel audio bytes.

If a recorder format cannot be supported within the established P3 contract, remove it from advertised capture choices or show an explicit unsupported state. Do not introduce a transcoding service, dependencies or speculative codec support. Preserve existing supported JSON/base64 clients until P11 and existing provider/model/prompt/error semantics. Keep byte/MIME validation before provider access; any contract correction must be documented and covered by focused legacy regression tests. Mock transcription success alone is not codec proof, and no live/provider/device success is authorized or inferred.

## 6. P8-R6: physical-device checklist and honest evidence

Create `docs/services/P8_DEVICE_CHECKLIST.md`: browser/version/OS, secure context, real granted/denied/no-device permission, supported recorder MIME, audible preview/TTS, stop/reset/repeat/background/navigation cleanup, empty/size/provider failure and transcript correctness. Include desktop/mobile dimensions, expected evidence, mock-versus-real columns and explicit **not run** status. Physical microphone/live provider execution belongs to later P9 acceptance; this prompt prepares that checklist.

Update P8 contracts/report/verification with each review ID's disposition, exact commands, actual-page integration evidence, remaining device/provider limits and reproducible tests. Preserve all original 12-check and defect-reproduction artifacts; write new dated evidence separately, using configurable output directories where needed.

## Verification and deliverables

Before fixing each reproduced behavior, establish a failing regression; run focused tests during repair, then full isolated pytest, Django check, appropriate mypy/Ruff, syntax checks for changed JS/helpers and deterministic browser suite. Rebuild/verify static output if source assets change. Use existing pinned/locked tooling. Verify request bytes/headers, real field state, cleanup and expected denials. Run `git diff --check` after documentation updates.

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

Deliver repaired code, regression/integration tests, dated browser/server evidence, device checklist, updated P8 reviews/contracts/reports and handoff/state/plan/index. Report what changed, exact passing/blocked checks, fixture boundaries and remaining risks. P8 may be marked complete only when P8-R1–R6 have concrete passing dispositions within this deterministic scope. List still-open P7-R1–R5 individually; actual-page P8 proof closes only the portions it directly verifies. Do not restore unconditional P7 completion based on P8 alone.

## Bounds and stop point

Native Windows; application edits in `migration/django/`, P8 evidence in `docs/services/`. Preserve the original app, assets, design references and existing dirty edits. Keep session-derived authority, CSRF/RLS, private Storage and field-review semantics. No bearer token bridge, schema/auth provider change, email/OAuth/team/reminder integration, audio-upload/new filled export feature, dependency upgrade, Docker, paid/live call, commit/push, deployment or legacy deletion.

Finish all six P8 items and their aggregate deterministic verification, then report remaining P7 closure and P9 device/provider gates. The latest request prepared this prompt only; execution starts when the owner asks to implement it. P9/P10/P11 and broader P7 repairs remain separate scopes.
