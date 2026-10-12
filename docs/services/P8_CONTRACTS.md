# P8 media bridge contracts

**Current status (2026-10-13):** The deterministic P8 media, service, and actual-page contracts are closed under fake-media and synthetic-session coverage. See the [P8 report](P8_REPORT.md), [verification](P8_VERIFICATION.md), and [current handoff](../../HANDOFF_2026-10-13_033145_IST.md). Real-device and live-provider checks remain NOT RUN in P9. The review note below records the earlier state.

**Review correction — 2026-10-12 02:03:54 IST:** These are intended contracts; full lifecycle/codec compliance is not yet established. See [P8 review](P8_REVIEW_2026-10-12.md) for reproduced defects and required proof.

## Browser capture

- Detect `MediaRecorder` and supported MIME types before requesting microphone access; report unsupported browsers/codecs without pretending to record.
- Request microphone access only after the user action. Handle denied/missing devices, empty capture, cancellation, repeated recordings, late permission resolution, and provider failures as visible states.
- Stop all tracks and release recorder/chunks on stop, reset, error, and page navigation. Revoke old preview object URLs when replacing or discarding audio.
- Preview uses the captured blob and its actual MIME type. `audio/webm;codecs=opus` was the supported synthetic fixture used in the passing run.

## Transport and service boundary

- Send the audio blob and `mimeType` using same-origin `FormData` to `/api/transcribe`; do not manually set the multipart boundary.
- Keep Django CSRF and the reviewed request marker. Do not attach a bearer token from browser storage.
- Reuse P3 request/audio limits and server MIME validation before provider access. Existing JSON/base64 input remains accepted until P11 has zero-use evidence.
- A returned transcript is only a draft. The user reviews field values before a filled record is saved through P5.

## Evidence limit

The browser test fakes `MediaDevices`/`MediaRecorder` and intercepts the same-origin API. It does not call a paid/live provider and does not use a physical microphone. Provider, device/codec, and deployment parity remain P9 acceptance work.

## 2026-10-13 verified disposition

The browser recorder owns each attempt's stream, recorder and chunks; MIME parameters are normalized only for provider configuration, while the captured blob metadata and bytes stay unchanged. WebM/Ogg Opus fake-provider mapping and byte limits are asserted, unsupported MP4 capture is not advertised, and the existing JSON/base64 client remains supported. Recorder and TTS requests/playback have explicit cancellation and stale-result suppression. Actual-page/session+CSRF evidence is distinct from mocked provider results. Physical-device and live-provider rows in P8_DEVICE_CHECKLIST.md remain NOT RUN for P9.
