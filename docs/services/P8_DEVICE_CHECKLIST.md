# P8 physical-device and provider checklist

**Status:** NOT RUN. Physical microphone/device checks and live speech-provider requests are reserved for P9 release acceptance. This checklist is prepared for that gate; no device or live-provider success is claimed here.

**Deterministic evidence already available:** the refreshed fake-media run is [media-results.json](evidence/p8/closeout-20261012/media-results.json), and the actual Django voice-page journey is [voice-integration-results.json](../pages/evidence/w7/closeout-20261012/voice-integration-results.json). Both intercept browser media/provider APIs. They do not count as physical-device or live-provider results.

## Record for each device run

| Field | Record |
|---|---|
| Run ID and date | `NOT RUN` |
| OS and device model | `NOT RUN` |
| Browser and exact version | `NOT RUN` |
| Page origin and secure-context result | `NOT RUN` |
| Account fixture and template ID | Synthetic P9 fixture; record exact IDs in the P9 evidence artifact |
| Viewport | Desktop `1440×900`; mobile `390×844` or the device's measured CSS viewport |
| Microphone permission / available inputs | `NOT RUN` |
| `MediaRecorder` support and selected MIME | `NOT RUN`; record `MediaRecorder.isTypeSupported()` and the captured Blob's actual MIME separately |
| Provider mode | `NOT RUN`; record provider/model and whether the request was live or intercepted, without recording credentials |
| Evidence directory | `docs/services/evidence/p8/p9-device-<run-id>/` |

## Physical-device matrix

| Scenario | Expected result | Evidence to capture | Mocked vs real | Status |
|---|---|---|---|---|
| Secure context and browser capability | The page identifies secure-context, `getUserMedia`, `MediaRecorder`, and supported MIME availability before capture. Unsupported capability leaves typed entry available. | Browser/version, origin, console, selected MIME, capability state, desktop/mobile screenshots | Real page and device; no provider required | **NOT RUN — P9** |
| Permission granted | One recording attempt owns its stream; Record/Stop controls follow recorder state; stopping releases every track. | Permission state, track states before/after stop, short recording and status screenshots | Real microphone/device | **NOT RUN — P9** |
| Permission denied | Accessible explanation appears, no track remains live, and typed entry remains usable. | Permission result, status and console capture | Real browser permission; provider not required | **NOT RUN — P9** |
| No microphone or device removed | Accessible unavailable-device state appears; no stale success or upload occurs. | Device inventory before/after, request log, status screenshot | Real device; provider not required | **NOT RUN — P9** |
| Supported recorder MIME | The browser's actual Blob MIME and filename are sent in multipart form without relabeling; the server accepts only the established P3 contract. | `isTypeSupported()` results, Blob MIME/size, sanitized request headers and response | Real recorder; provider may be intercepted for this case | **NOT RUN — P9** |
| Preview playback | A completed recording can be previewed audibly; replacing or discarding it releases the prior preview URL. | Human audible check, URL lifecycle observations, screenshot | Real recording and playback | **NOT RUN — P9** |
| TTS playback and replacement | Valid speech plays audibly; a replacement stops prior audio; rejected playback or invalid response stays visible. | Human audible check, request/response outcome, status screenshot | Real audio output; run once with intercepted response and once with approved live provider in P9 | **NOT RUN — P9** |
| Stop, reset, repeat | Stop and reset release the current attempt exactly once; repeated attempts use fresh streams and do not receive stale events. | Track/recorder state across two attempts, console and request log | Real recorder; lifecycle tests remain deterministic separately | **NOT RUN — P9** |
| Background and return | Backgrounding, tab visibility changes, and returning to the page do not leave a live microphone after the documented stop/navigation boundary. | Visibility transitions, permission indicator, track state, screenshot | Real browser/device | **NOT RUN — P9** |
| Navigation during capture or pending permission | Leaving the page invalidates the attempt, stops its tracks, and suppresses late transcript/audio success. | Navigation timing, track state, request log, console | Real browser/device; deterministic late-response regression remains separate | **NOT RUN — P9** |
| Empty recording | The page reports the empty capture, restores controls, and sends no transcription request. | Blob size, request count, status screenshot | Real recorder; provider not required | **NOT RUN — P9** |
| Oversized capture | The configured byte cap is enforced before upload; controls recover and no transcript is shown. | Byte count, cap, request count, status screenshot | Real recorder; provider not required | **NOT RUN — P9** |
| Provider failure | The failure is visible, typed entry remains available, and no transcript success is fabricated. | Sanitized provider status, request ID if available, screenshot | Live provider failure only if deliberately available; otherwise mark intercepted | **NOT RUN — P9** |
| Transcript correctness | The rendered transcript matches the returned response and can be edited before extraction/review. | Sanitized request/response fixture, transcript screenshot, edited review values | Intercepted response for repeatability; live provider sample separately labeled | **NOT RUN — P9** |
| Mobile layout and focus | At `390×844`, dialogs and controls remain reachable by touch/keyboard, focus stays visible, and the page has no horizontal overflow. | Full-page and first-fold screenshots, viewport/scroll widths, console | Real mobile browser/device | **NOT RUN — P9** |

## Evidence rules

Record expected and actual outcomes for every row. Keep screenshots, sanitized headers, MIME/byte observations, console/request failures, and cleanup results under the run directory above. Mark each case `PASS`, `FAIL`, or `BLOCKED`; never convert an intercepted provider/media result into a real-device claim. Do not include access tokens, private audio, or account credentials in the artifacts. Any live-provider attempt requires the P9 acceptance scope and its stated approval; this P8 closure does not make one.
