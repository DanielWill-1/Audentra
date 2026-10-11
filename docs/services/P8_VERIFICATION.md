# P8 verification

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
