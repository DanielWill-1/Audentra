# P7 W7 report: Voice form, filled forms, and activity

**Disposition:** Implemented and locally browser-verified on 2026-10-12. The cumulative legacy-fallback count is 0.

`/AIVoiceAutoFill`, `/filledtemplates`, and `/activitylog` are protected Django pages. Voice extraction uses the existing P3 service and P5 template data; extracted values are matched to field IDs/labels and remain reviewable before a filled form is saved through P5. The saved-form list/detail/delete actions use owner-scoped P5 services. Activity remains the reviewed browser-local/example feed, not a server audit ledger.

P8's `MediaRecorder` bridge is integrated into the voice-form page before W7. The P8 fake-media suite verifies the browser-to-local multipart contract and cleanup but does not establish physical-device or live-provider parity. The activity UI retains only the source-supported browser feed/actions; no database audit service or fabricated server authority was added.

Six synthetic browser captures cover all three routes at desktop/mobile sizes. A deterministic Django route integration test carries multipart audio through the P3 transcription route, mocked P3 extraction, reviewable field output, save delegation, filled-list rendering, and delete delegation. A separate principal test confirms an unreadable template is denied before extraction or save. Source/Django headings and copy differ in sentence case and explicit development/provider boundaries; no live transcription provider or physical microphone is claimed. See [verification](P7_W7_VERIFICATION.md), [assets](P7_W7_ASSETS.md), and [route ownership](P7_W7_ROUTE_OWNERSHIP.json).
