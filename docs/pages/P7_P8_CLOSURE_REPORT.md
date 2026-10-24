# P7/P8 closeout report

> **Latest status - 2026-10-13:** P7 SR-1 through SR-4 are closed, and P8 deterministic acceptance is complete within its documented boundaries. P9 started after its 25-route matrix was created. Earlier review corrections and "P9 not executed" statements below are historical snapshots; use the [current handoff](../handoffs/HANDOFF_2026-10-13_033145_IST.md), [P7 closeout](P7_SR_CLOSEOUT_2026-10-13.md), and [P9 report](../parity/P9_REPORT.md).


> **Review-time correction - 2026-10-13:** The independent review recorded P7 as open for SR-1 through SR-4; the later P7 closeout supersedes that status. P8 deterministic results remained valid. See the dated [session review](P7_P8_SESSION_REVIEW_2026-10-13.md) and the current handoff.

**Original closeout snapshot:** 2026-10-13 (Asia/Kolkata). Scope: all seven P7 waves and the separate P8 media prerequisite. P9 had not started at that snapshot; current status appears above.

## Baseline and disposition

Closeout began at HEAD `4e3e5c7e0a3bc383cea5d8b6b4d2ce18693469a6` with an already dirty working tree. Existing edits and evidence were preserved; no clean-tree claim is made. The source React tree and original reference folders remain in place. No commit, push, deployment, Docker run, dependency upgrade, email, live speech-provider call, physical microphone test, or legacy deletion was performed.

The P1 route manifest still contains 25 paths and has SHA-256 `ada8836ff8ba323888f1b99d42e7d720b66823c3975e008af104789d3923c9b7`. The current runtime inventory assigns 13 `django-page`, three `django-auth-excluded`, one deliberate `local-404`, and eight `django-app` routes; normal legacy fallback is zero. Existing rollback, encoded-path/method rejection, restoration, origin/digest/header and fail-closed checks remain recorded in P6/P7 tests and artifacts. The closeout did not change the route manifest or rollback contract.

## Requirement outcomes

| Requirement | Outcome and evidence |
|---|---|
| W1/W2 source content and behavior | Passed the current `--check-only` suite: W1 has 22 page captures and 6 interactions; W2 has 4 captures and 3 interactions. Section/destination and clipboard positive/negative checks passed. Evidence: `docs/pages/evidence/w1/closeout-20261012/` and `w2/closeout-20261012/`. |
| W3 Auth/navigation | Passed 8 route captures and 6 interactions, including session, forms, safe navigation, validation and provider-unavailable boundaries. Recovery/reset/OAuth remain the accepted unavailable states; no email/OAuth integration was added. Evidence: `docs/pages/evidence/w3/closeout-20261012/django/`. |
| W4 dashboard | Passed 2 route captures and 4 interactions, including navigation drawer, tabs, dialog Escape/focus restoration and the truthful Team unavailable state. Evidence: `docs/pages/evidence/w4/closeout-20261012/django/`. |
| W5 templates, files, sharing and reviews | Passed 2 route captures and 2 interactions plus hosted route proof for private upload/download/replacement/revocation/delete bytes, owner/editor/viewer/admin/unrelated boundaries and review transitions. UUID-scoped fixture cleanup passed. Evidence: `docs/pages/evidence/w5/closeout-20261012/django/` and [hosted results](evidence/w5/closeout-20261012/hosted-route-results.json). |
| W6 scheduler/settings | Passed 6 route captures and 4 interactions. Month/week navigation, schedule changes, management actions, settings import/export bytes, invalid values and storage failures passed. UTC-midnight, positive/negative offsets and DST boundary tests passed while preserving entered values and P5 query semantics. Evidence: `docs/pages/evidence/w6/closeout-20261012/django/`. |
| W7 voice/filled/activity | Passed 6 route captures and 4 interactions. The filled-record mobile empty state and safe navigation were exercised; saved records, deletion, owner isolation, filters and untrusted activity text were verified. Hosted session/CSRF routes separately proved filled-record persistence/read/delete and unrelated-user denial. Evidence: `docs/pages/evidence/w7/closeout-20261012/django/` and the W5 hosted result file. |
| P7-R1 | Closed. Route-specific source/control comparisons reject missing required sections, destinations and fields through negative controls; W1/W2 regressions remain enforced. Visual review covered desktop 1440×900 and mobile 390×844 without an invented pixel score. |
| P7-R2 | Closed within the existing P1/P4/P5 development contracts. Required W3–W7 flows and reachable controls were exercised; hosted boundaries are identified separately from deterministic browser fixtures. |
| P7-R3 | Closed. Deterministic UTC/local-midnight, positive/negative offset and DST create/edit/filter/export checks pass; entered date/time and P5 UTC query behavior are preserved. |
| P7-R4 | Closed. The actual selected-template page and shipped scripts were exercised with fake media/provider responses and a browser session/CSRF boundary. Editable review, stale/duplicate suppression, safe retry, return state, filled save/list/delete, and revoked/unreadable/unrelated denial are covered. Hosted persistence proof is separate. |
| P7-R5 | Closed. P8 lifecycle and actual-page integration checks passed before final W7 acceptance. |
| P8-R1/R2 | Closed. Attempts own recorder/stream/chunks; stale permission and recorder events cannot affect a newer attempt. Pending starts, asynchronous errors, empty/oversized capture, terminal controls, reset/pagehide cleanup and retry pass deterministic regressions. |
| P8-R3 | Closed. TTS request/audio ownership, replacement, pagehide cancellation, stale response suppression, rejected playback and visible error handling pass fake API/audio checks. |
| P8-R4 | Closed for the deterministic development boundary. The selected-template Django page uses its real scripts and verified session+CSRF request path; missing/expired session, CSRF, origin/marker and revoked-template cases are rejected before provider access. Hosted filled persistence is separately verified. |
| P8-R5 | Closed. Advertised WebM/Ogg MIME parameters are normalized deliberately at the adapter boundary while captured MIME and bytes remain truthful. Fake-provider request and size checks pass; supported legacy JSON behavior remains. MP4 is not advertised as a supported capture choice. |
| P8-R6 | Closed as documentation preparation. [Device checklist](../services/P8_DEVICE_CHECKLIST.md) records expected desktop/mobile evidence and explicitly marks physical devices and live-provider checks not run; those remain P9 work. |

## Verification performed

- Isolated Django suite: `python -m pytest -q -p no:cacheprovider` — **167 passed**.
- `python manage.py check` — passed, no issues.
- `python -m mypy apps config tests` — passed, 93 source files.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_ruff.ps1 check apps config tests scripts` — passed.
- P7 browser suite `--check-only` — W1/W2 passed (26 captures, 9 interactions); `--app-only` — W3–W7 passed (24 captures, 20 interactions), at 1440×900 and 390×844 with no overflow or unexpected browser errors. DEBUG was false, previews were off and normal legacy fallback was disabled/unavailable.
- P8 `--media-only` — 16 fake-media checks passed. P8 `--voice-only` — 12 actual-page journey checks passed; desktop/mobile no-overflow checks passed. Media, STT, extraction and TTS were intercepted; no live provider was called.
- Hosted Django route probe — passed with three synthetic accounts; `cleanup_ok: true`, all generated accounts/shares/templates/reviews/filled records/storage objects/schedules/sessions removed, and zero emails sent. Exact downloaded/replaced content and access denials were asserted.
- Pinned Tailwind build — passed at 3.4.17; output digest `67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346`. Token check and `collectstatic --noinput` passed (9 copied, 8 unchanged). These checks followed the static-asset changes; no static assets changed afterward.
- Configured mypy and Ruff targets passed. A separate exploratory `mypy scripts/check_p7_hosted_routes.py` invocation reports dynamic typing errors; this probe is outside the configured mypy target, passed Ruff, and executed successfully against the authorized hosted fixture.

Machine-readable outcomes are under `docs/pages/evidence/w1..w7/closeout-20261012/` and `docs/services/evidence/p8/closeout-20261012/`. Historical review artifacts remain intact. Review dispositions are appended to [P7 review](P7_REVIEW_2026-10-12.md) and [P8 review](../services/P8_REVIEW_2026-10-12.md); the full requirement ledger is [P7_P8_CLOSURE_MATRIX.md](P7_P8_CLOSURE_MATRIX.md).

## Remaining phase boundary

P7 and P8 are closed within their authorized local and development-hosted boundaries. No device, physical microphone, live speech provider, production release, P9 parity/release gate, P10 deployment/soak, or P11 retirement was claimed. The next permitted work is P9 only after a separate owner request. Root `prompt.md` and [P9_IMPLEMENTATION_PROMPT.md](../parity/P9_IMPLEMENTATION_PROMPT.md) contain that brief.
