# P10 Wave 4: Website review

**Updated:** 2026-10-17. **Branch/HEAD:** main / d9480aec5273. **Status:** Main-journey audit complete and one blocker fixed. W5 now provides the reusable local demo account/reset workflow; no additional route-specific issue list was reported.

## Scope

The owner selected an audit of the main journey. The review covers the existing read-only public route/link check and an isolated keyboard-driven browser journey through the Django voice form. No hosted account or data was used, and no live Groq request was made.

The worktree already contained uncommitted P10 Wave 1–3 changes. Those changes were preserved. Wave 4 added a CSS fix for the consent overlay and updated the synthetic browser audit to match the current page behavior and assert the consent and chat-reset flows.

## Finding and fix

The first-use cloud-processing consent dialog appeared on the selected-form page, but accepting it did not actually uncover the voice controls. Its `hidden` attribute lost to Tailwind's `.flex` display rule, leaving the modal as a pointer-blocking overlay. The stylesheet now explicitly hides a consent panel carrying the `hidden` attribute. The browser audit confirms that the modal blocks access before opt-in, closes after acceptance, and makes no microphone or AI calls before consent.

## Main-journey evidence

The Chromium audit ran against the actual Django page and shipped JavaScript. Browser microphone, transcription, extraction, and TTS were deterministic mocks; form save/list/delete used the disposable browser fixture middleware and temporary SQLite, not hosted persistence. It passed 18 journey checks with no browser errors:

- The first-use consent modal blocks the page. Accepting it saves the policy version; no microphone request or AI request occurs before acceptance.
- Recording recovers from microphone denial, missing microphone, empty audio, and over-limit audio. Keyboard Record, Stop, and Transcribe produce a synthetic transcript with the expected request protections.
- Chat updates matching form fields, ignores a duplicate while busy, preserves a manually edited value across a later response, and handles required-field validation.
- Return to chat preserves the draft and conversation. Reset chat clears the conversation while keeping the reviewed form values. Save and delete update the synthetic fixture.
- Spoken replies replace stale requests, expose playback-blocked feedback, reject invalid audio, and cancel stale work on page navigation.
- Desktop (1440×900) and mobile viewport (390×844) showed no horizontal overflow. Physical-device recording and audibility were not exercised.

Evidence: [browser journey results](../pages/evidence/p10-w4-20261017/voice/voice-integration-results.json), [desktop screenshot](../pages/evidence/p10-w4-20261017/voice/voice-review-desktop.png), [mobile screenshot](../pages/evidence/p10-w4-20261017/voice/voice-review-mobile.png), [synthetic saved form screenshot](../pages/evidence/p10-w4-20261017/voice/filled-list-populated-mobile.png). Media recovery screenshots are in the same folder.

The CSS build completed with Tailwind 3.4.17 and its static-token check passed. The focused synthetic browser audit passed. The full project test suite was not run.

## Public route/link check

The local app's landing page and same-origin links were checked read-only:

- Public pages `/`, `/about`, `/documentation`, `/features`, `/login`, `/open`, `/privacy`, and `/terms` returned HTTP 200.
- Protected pages `/AIVoiceAutoFill` and `/dashboard` redirected to authentication as expected without a signed-in session.
- CSS, JavaScript, icon, and favicon assets linked from the landing page returned HTTP 200.

No broken public landing-page links were reproduced.

## Remaining Wave 4 work

The owner has not supplied a separate route-specific issue list. Add any future reported issue with its route, expected result, actual result, reproduction steps, priority, and disposition. The audit found and fixed the consent-overlay issue above.

The missing reusable local demo account/reset workflow identified during this audit is now provided by Wave 5. The local Supabase setup and guarded reset use synthetic data and are covered in the [W5 release-candidate review](P10_W5_RELEASE_CANDIDATE_REVIEW.md) and [local runbook](P10_LOCAL_RUNBOOK.md). No hosted account, database, provider, or credential was changed.

The repository's tracked service-account credential is a separate inherited security issue. This W4 review did not copy its contents, remove it, or rotate it. The owner later confirmed Groq ZDR is disabled; the [Wave 3 review](P10_W3_PRIVACY_SECURITY_REVIEW.md) records the updated notice and remaining P4 credential gate.
