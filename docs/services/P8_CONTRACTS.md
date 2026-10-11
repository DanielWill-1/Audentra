# P8 media bridge contracts

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
