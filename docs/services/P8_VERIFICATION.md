# P8 verification

**Current status (2026-10-13):** P8-R1 through P8-R6 are closed for deterministic browser, service, and development-session acceptance. The final media regression passed 16 checks, and the actual selected-template page passed 12 journey checks. The older 2026-10-12 incomplete-review note below is historical and is superseded by the combined closeout. Physical-device and live-provider checks remain NOT RUN and are assigned to P9. See [16-check media results](evidence/p8/closeout-20261012/media-results.json), [12-check actual-page results](../pages/evidence/w7/closeout-20261012/voice-integration-results.json), the [current handoff](../handoffs/HANDOFF_2026-10-13_033145_IST.md), and [device checklist](P8_DEVICE_CHECKLIST.md).

**Review correction — 2026-10-12 02:03:54 IST:** The 12 checks use injected markup on /login, fake media and intercepted APIs. They do not exercise the actual voice-page/session pipeline or the newly reproduced races. See [P8 review](P8_REVIEW_2026-10-12.md).

**Run:** 2026-10-12, Playwright Chromium 148.0.7778.96, deterministic fake MediaDevices/MediaRecorder, intercepted same-origin API.

All 12 checks passed:

1. Unsupported browser presents typed-input fallback.
2. Unsupported codecs are rejected before microphone access.
3. Denied and missing microphone states expose accessible fallback.
4. Empty and oversized recordings are rejected before submission; tracks stop.
5. Supported capture produces a preview and multipart request with MIME, CSRF, and request marker, without Authorization.
6. Reset and replacement clear state and release tracks/object URLs.
7. Pagehide/navigation stops active recording and revokes the active preview URL.
8. A late microphone permission result after reset cannot start stale recording.
9. Provider failure remains visible and does not report transcription success.

Recorded transport was POST `multipart/form-data` with `recording.webm`, `audio/webm;codecs=opus`, a CSRF header, and a request marker. Playback was exercised. Evidence records two tracks stopped across replacement/navigation and confirms recorder inactivity and URL revocation.

Artifacts: [machine-readable results](evidence/p8/media-results.json), [preview and transcript](evidence/p8/recording-preview-and-transcript.png), and [provider error](evidence/p8/transcription-provider-error.png). Fake media and mocked API evidence is distinct from live speech-provider/physical-device evidence; those were not run.

## 2026-10-13 combined closeout

The current fake-media regression suite passed 16 checks, including interleaved pending permissions, stale recorder callbacks, error/empty/oversize terminal states, cleanup and retry. The actual Django selected-template voice page passed 12 deterministic journey checks with desktop/mobile no-overflow results. It uses shipped scripts and a synthetic session+CSRF boundary; microphone, transcription, extraction and TTS APIs were intercepted. Hosted route evidence separately proves filled save/read/delete persistence and cleanup. No physical microphone or live provider was used.

P8-R1 through P8-R6 are closed within these boundaries; physical-device/live-provider acceptance is explicitly NOT RUN and belongs to P9. Machine results: evidence/p8/closeout-20261012/media-results.json and docs/pages/evidence/w7/closeout-20261012/voice-integration-results.json. Full commands and fixture limits: ../pages/P7_P8_CLOSURE_REPORT.md.

## 2026-10-13 independent session review

The [review](../pages/P7_P8_SESSION_REVIEW_2026-10-13.md) recorded P7 findings SR-1 through SR-4 as open at that time; the later [P7 closeout](../pages/P7_SR_CLOSEOUT_2026-10-13.md) closed them. P8 deterministic results remained valid: 16 media checks at [review evidence](evidence/p8/review-20261013-regression/media-results.json) and 12 actual-page checks at [voice evidence](../pages/evidence/w7/review-20261013/voice-integration-results.json). Physical-device/live-provider checks remain NOT RUN; the synthetic lifecycle observation does not prove real BFCache restoration.
