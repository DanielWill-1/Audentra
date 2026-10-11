# P8 report: Browser media bridge

**Review correction — 2026-10-12 02:03:54 IST:** Implementation exists, but P8 closeout is incomplete. Reproduced recorder races and playback/codec/actual-page/checklist gaps supersede an unconditional completion reading; see [P8 review](P8_REVIEW_2026-10-12.md).

**Disposition:** Implemented and deterministically browser-verified on 2026-10-12. P8 is a separate prerequisite package within the P7 execution; it is not an eighth P7 wave.

The voice-form page uses a small local `MediaRecorder` bridge for permission handling, codec capability selection, capture, preview/playback, reset, and cancellation. It does not relabel unsupported audio. New recordings are sent as same-origin `multipart/form-data` to the existing `/api/transcribe` contract with the audio blob and `mimeType`; CSRF and the request marker are present, and no Authorization bearer header is sent by the browser.

The implementation stops microphone tracks on stop/reset/navigation/error, revokes replaced/discarded object URLs, releases recorder/chunk/playback state, rejects oversized/empty recordings before submission, and prevents late permission results from starting stale capture. The server continues to accept the existing P3 JSON/base64 contract until the later P11 removal gate.

All 12 Playwright checks passed with deterministic fake media devices/recorder and mocked same-origin API responses. This proves the browser/service boundary and resource handling. It does not prove live-provider transcription, codec behavior on a physical device, or production deployment behavior; carry those limits into P9.

See [contracts](P8_CONTRACTS.md), [verification](P8_VERIFICATION.md), and [evidence](evidence/p8/media-results.json).
