# P7 W7 verification

**Run:** 2026-10-12, isolated synthetic identity/data fixture, Playwright Chromium 148.0.7778.96.

- Six captures cover `/AIVoiceAutoFill`, `/filledtemplates`, and `/activitylog` at 1440×900 and 390×844. All returned HTTP 200 with zero overflow, unexpected console errors, failed requests, React root, or React bootstrap.
- Django route tests exercise extraction-result matching by field ID/label and prevent saving before review. The deterministic end-to-end route test submits synthetic multipart audio through `/api/transcribe`, extracts and reviews a field, delegates save, renders the filled list, and delegates deletion. A separate test proves an unrelated verified principal cannot extract or save against an unreadable template.
- [P8 media verification](../services/P8_VERIFICATION.md) passed all 12 deterministic fake-media checks, including permission/error states, multipart, preview/playback, and cleanup.
- Browser data is synthetic. The integrated route test stubs provider/service boundaries and creates no hosted record. No live transcription provider, physical microphone, hosted W7 route write, or server-backed activity ledger was exercised.

Evidence: [browser results](evidence/w7/post-wave-review-20261012/django/browser-results.json), [voice desktop](evidence/w7/post-wave-review-20261012/django/voice-autofill-desktop.png), [filled forms mobile](evidence/w7/post-wave-review-20261012/django/filled-templates-mobile.png), and [activity desktop](evidence/w7/post-wave-review-20261012/django/activity-log-desktop.png). Current-source reference screenshots are under [legacy](evidence/w7/post-wave-review-20261012/legacy/).
