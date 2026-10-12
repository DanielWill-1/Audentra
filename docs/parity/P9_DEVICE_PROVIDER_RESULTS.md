# P9 device and provider results

**Status:** NOT RUN. The P9 initial route inventory used no device, microphone, camera, or live provider. P7/P8 fake-media and intercepted-provider results remain deterministic-only evidence.

| Check | Result | Required evidence |
|---|---|---|
| Desktop browser/device | NOT RUN | Device/OS/browser version, secure context, permission allow/deny/no-device, recorder MIME, actual blob bytes/metadata, playback, stop/reset/repeat, errors, navigation and back/forward restoration. |
| Mobile browser/device | NOT RUN | Same checks on a real mobile browser, including background/foreground and layout/keyboard behavior. |
| Actual microphone/recorder lifecycle | NOT RUN | Real permission flow, MIME support, captured bytes, empty/oversize handling, track release, preview/TTS audio and real navigation/BFCache observation. |
| Live transcription/extraction/TTS | NOT RUN | Requires an explicitly selected existing provider and authorized spend. Preserve P3 request, model, prompt, input and MIME semantics; record sanitized payload/result, transcript/field correctness, audio output and failure feedback. |

Use the [P8 device checklist](../services/P8_DEVICE_CHECKLIST.md). Do not infer device or provider acceptance from fake MediaRecorder objects, API interception, local mock responses or P8 session tests.
