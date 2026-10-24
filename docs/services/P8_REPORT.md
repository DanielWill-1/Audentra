# P8 report: Browser media bridge

**Current status (2026-10-13):** P8-R1 through P8-R6 are closed for deterministic browser, service, and development-session acceptance. The final media regression passed 16 checks, and the actual selected-template page passed 12 journey checks. The older 2026-10-12 incomplete-review note below is historical and is superseded by the combined closeout. Physical-device and live-provider checks remain NOT RUN and are assigned to P9. See [16-check media results](evidence/p8/closeout-20261012/media-results.json), [12-check actual-page results](../pages/evidence/w7/closeout-20261012/voice-integration-results.json), the [current handoff](../handoffs/HANDOFF_2026-10-13_033145_IST.md), and [device checklist](P8_DEVICE_CHECKLIST.md).

**Review correction — 2026-10-12 02:03:54 IST:** Implementation exists, but P8 closeout is incomplete. Reproduced recorder races and playback/codec/actual-page/checklist gaps supersede an unconditional completion reading; see [P8 review](P8_REVIEW_2026-10-12.md).

**Disposition:** Implemented and deterministically browser-verified on 2026-10-12. P8 is a separate prerequisite package within the P7 execution; it is not an eighth P7 wave.

The voice-form page uses a small local `MediaRecorder` bridge for permission handling, codec capability selection, capture, preview/playback, reset, and cancellation. It does not relabel unsupported audio. New recordings are sent as same-origin `multipart/form-data` to the existing `/api/transcribe` contract with the audio blob and `mimeType`; CSRF and the request marker are present, and no Authorization bearer header is sent by the browser.

The implementation stops microphone tracks on stop/reset/navigation/error, revokes replaced/discarded object URLs, releases recorder/chunk/playback state, rejects oversized/empty recordings before submission, and prevents late permission results from starting stale capture. The server continues to accept the existing P3 JSON/base64 contract until the later P11 removal gate.

All 12 Playwright checks passed with deterministic fake media devices/recorder and mocked same-origin API responses. This proves the browser/service boundary and resource handling. It does not prove live-provider transcription, codec behavior on a physical device, or production deployment behavior; carry those limits into P9.

See [contracts](P8_CONTRACTS.md), [verification](P8_VERIFICATION.md), and [evidence](evidence/p8/media-results.json).

## 2026-10-13 closeout disposition

P8-R1–R6 are closed for the deterministic browser, service and development-session boundaries. Recorder resources are attempt-owned and stale events/permissions cannot affect newer attempts; asynchronous errors and terminal states clean up and remain accessible. TTS request/audio replacement and navigation cancellation suppress stale playback. MIME parameter normalization is deliberate, captured bytes retain their real MIME, MP4 is not advertised as supported capture, and legacy JSON remains covered.

The updated fake-media suite passed 16 checks. The actual selected-template Django page and shipped scripts passed 12 journey checks at desktop and mobile sizes using intercepted media/STT/AI/TTS endpoints and a synthetic browser session. Session+CSRF, missing/expired session, origin/marker and revoked-template boundaries are also covered. Hosted filled persistence is recorded separately in the W5 hosted route results; no provider call was made. P8-R6's [device checklist](P8_DEVICE_CHECKLIST.md) explicitly assigns real device/live-provider execution to P9 and marks it NOT RUN. See [P8 verification](P8_VERIFICATION.md) and [P7/P8 closure report](../pages/P7_P8_CLOSURE_REPORT.md).

## 2026-10-13 independent session review

The [review](../pages/P7_P8_SESSION_REVIEW_2026-10-13.md) recorded P7 findings SR-1 through SR-4 as open at that time; the later [P7 closeout](../pages/P7_SR_CLOSEOUT_2026-10-13.md) closed them. P8 deterministic results remained valid: 16 media checks at [review evidence](evidence/p8/review-20261013-regression/media-results.json) and 12 actual-page checks at [voice evidence](../pages/evidence/w7/review-20261013/voice-integration-results.json). Physical-device/live-provider checks remain NOT RUN; the synthetic lifecycle observation does not prove real BFCache restoration.
