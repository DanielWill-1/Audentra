# P10 wave-plan handoff

**Updated:** 2026-10-17. **Status:** All five P10 waves have evidence and the owner reviewed/accepted the local release candidate. A post-restart synthetic login smoke timed out at email validation and remains a verification follow-up. Groq ZDR is owner-confirmed disabled and disclosed in the updated notice. P0 Google service-account rotation and P4 Supabase credential retirement remain external pre-deployment gates; deployment is not approved. Wave 4 main journey passed and Wave 5 supplies the local demo/reset workflow. No additional route-specific issue list was reported.

## Decisions from this session

- P9 remains complete within the owner's revised scope. The 2026-10-15 P10 local-runtime preparation run remains valid for its recorded deliverables.
- P10 follows the owner-approved order: **1) speech and conversational form filling, 2) recording lifecycle, 3) privacy/security, 4) owner-reported website issues, 5) performance and release candidate.**
- The assistant should feel like a person helping complete a form. It accepts typed or spoken answers, asks relevant follow-up questions, validates values against form fields and options, updates a draft, and leaves review/save to the user.
- Wave 1 uses Groq GPT-OSS 120B for chat/extraction, Whisper Large V3 Turbo for speech-to-text, and Canopy Labs Orpheus v1 English for text-to-speech. BYOK is outside this scope.
- The owner confirmed the Groq organization is on Free tier and ZDR is disabled. Do not upgrade or use a paid fallback. The owner selected a one-time opt-in before cloud processing; its version was advanced to `p10-cloud-ai-v2` with the updated retention disclosure. The owner reports the old exposed Groq key was revoked. The updated key in `migration/django/.env` was accepted by Groq for chat, transcription, and Orpheus TTS. The root `.env` still has a different Groq key; Django loads `migration/django/.env`.
- Orpheus is English-only, limited to 200 characters per request, and listed as Preview. The implementation splits long replies into requests that fit the limit.
- Physical mobile testing remains excluded. Keep existing Chrome mobile viewport evidence. Physical recording edge cases and audibility are for the owner to review manually.
- The owner manually reviewed the local release candidate and reported it is working as expected on 2026-10-17. This closes W1/W2 and final RC owner review within the agreed local scope. Physical-device testing remains excluded.
- Keep the protected-route Cache-Control: no-store policy. No deployment, production change, or credential rotation is authorized by this handoff.

## Current five-wave plan

1. **Speech and conversational form filling:** complete Groq configuration and safe provider handling; validate typed and spoken answers; perform a small synthetic live check only after confirming Free-tier account status.
2. **Recording lifecycle:** verify the paused active-recording cleanup patch, stop/reset/navigation cleanup, upload/provider flow, playback handoff, timeouts, and failure recovery.
3. **Privacy/security:** inventory product claims and data flows, implement applicable controls, verify provider retention settings, and enforce the selected one-time end-user cloud processing opt-in.
4. **Website issues:** audit the owner-selected main journey, record and fix reproducible issues, then handle any additional route-specific issues the owner reports. The audit fixed a consent overlay that stayed visible after opt-in; the public route/link check found no broken links. The reusable local demo account/reset workflow is now supplied by Wave 5. No additional route-specific issue list was reported. See [the Wave 4 review](../deployment/P10_W4_WEBSITE_REVIEW.md).
5. **Performance and release candidate:** measure the reported page-load delay, optimize actual bottlenecks, improve sanitized errors, harden local-first operation, and prepare a reviewable release candidate.

Acceptance evidence and exact boundaries are in the active P10 implementation brief at docs/deployment/P10_IMPLEMENTATION_PROMPT.md. The readiness ledger at docs/deployment/P10_READINESS.md preserves the completed 2026-10-15 preparation run separately.

## Provider limits and data handling

Current Groq documentation lists Free-tier base limits of GPT-OSS 120B at 30 requests/minute and 1,000/day, Whisper Large V3 Turbo at 20/minute and 2,000/day with audio-second quotas, and Orpheus at 10/minute and 100/day. The Free-tier STT upload limit is 25 MB. Organization-specific limits may differ or change; check the account console before live use. [Groq rate limits](https://console.groq.com/docs/rate-limits) · [STT](https://console.groq.com/docs/speech-to-text) · [Orpheus TTS](https://console.groq.com/docs/text-to-speech/orpheus)

Groq processes audio and conversation text in the cloud after the user opts in. Groq says inference inputs and outputs are not retained by default, but may be logged for reliability or abuse monitoring for up to 30 days, or longer if legally required; usage metadata is always collected. The owner confirmed ZDR is disabled on 2026-10-17. The user-facing notice discloses this status. [Groq data controls](https://console.groq.com/docs/your-data)

## Implementation state

- The starting worktree was clean. Current code changes are local and uncommitted.
- The ignored root and Django environment files have different `GROQ_API_KEY` values. Django's active `.env` contains the updated key; the key itself was not printed. The configured model IDs match the selected chat, STT, and TTS models, and the smoke confirms the key works with each.
- Added a Groq speech adapter for transcription and WAV synthesis, provider error mapping, Orpheus reply chunking/autoplay controls, conversational prompts, and server-side draft-field validation. Wave 1 follow-up work fixes the recorder stop/data race, adds direct send from a recording, adds chat reset while preserving the draft, and accepts MP4 recordings for Whisper.
- Wave 2 hardens the media lifecycle: it stops capture at the configured size limit, bounds transcription waits, preserves retryable clips on upload failure, supports the browser's default recorder MIME when capability probing is absent, and reports clearer microphone startup errors.
- Wave 3 completed the repository data-flow review and corrected unsupported privacy/security claims in the Django pages, React source, and related public copy. A versioned browser opt-in gates cloud chat, transcription, and TTS requests in the UI and at Django provider endpoints; the user can withdraw consent. The [Wave 3 review](../deployment/P10_W3_PRIVACY_SECURITY_REVIEW.md) records the controls, owner-attested ZDR-disabled state, and P4 credential gate. Consent version `p10-cloud-ai-v2` requires acceptance of the updated notice.
- Wave 3 owner review: accepted. The owner confirmed Groq ZDR is disabled; the active organization console was not independently accessed. User-facing copy identifies that status and summarizes provider retention.
- Wave 4 audited the main Django voice journey in a synthetic browser fixture. It found and fixed a consent modal that remained on top after opt-in because Tailwind's flex rule overrode the hidden state. The 18-step keyboard flow passed at desktop and mobile viewport sizes with no browser errors; mock endpoints and temporary SQLite avoided hosted writes. The public route/link check found no broken same-origin links. No additional route-specific issue list was reported, and the reusable local demo account/reset workflow is now supplied by Wave 5. See the [Wave 4 review](../deployment/P10_W4_WEBSITE_REVIEW.md) and its linked evidence.
- Wave 5 adds a fail-closed local Supabase profile, restricted local database roles, a synthetic demo account/template, and an explicit local-only reset. Local profile isolation, reset/migration replay, readiness, safe login errors, sign-in, and the protected template workspace passed. The local release-candidate runbook and review are recorded in [P10_LOCAL_RUNBOOK.md](../deployment/P10_LOCAL_RUNBOOK.md) and [P10_W5_RELEASE_CANDIDATE_REVIEW.md](../deployment/P10_W5_RELEASE_CANDIDATE_REVIEW.md).
- The five-load cold baseline improved from 684.3 ms median / 1,999 ms p95 to 268.9 ms median / 1,440.1 ms p95. Nine warm navigations measured 19.5 ms median / 1,002.2 ms p95 against the 800 ms median / 1.5 s p95 targets. Google Fonts now loads asynchronously; the performance environment could not fetch `fonts.gstatic.com`, which accounts for an occasional slow load event. See the [before](../deployment/P10_W5_PERFORMANCE_BEFORE.json) and [after](../deployment/P10_W5_PERFORMANCE_AFTER.json) reports.
- The bounded synthetic end-to-end smoke returned HTTP 200 from GPT-OSS 120B with valid JSON and the synthetic field extracted, HTTP 200 from Orpheus with a valid WAV response, and HTTP 200 from Whisper Large V3 Turbo with the synthetic phrase recognized from the generated audio. The owner confirmed the account is Free tier; no tier change or paid fallback was used.
- The full Django regression suite passed **185 tests** across runtime, accounts, AI, speech, voice, data-layer, pages, and session-boundary coverage. The deterministic Chromium media check passed all 16 recorder lifecycle cases using fake microphone streams and mocked API responses; it did not call Groq or test physical hardware. Full Ruff, Node syntax checks, Django check, local preflight, and `git diff --check` passed.

## Current implementation files

- migration/django/apps/speech/backends/groq.py and migration/django/apps/speech/exceptions.py
- migration/django/apps/speech/services.py, views.py, and the Google adapter's shared exception import
- migration/django/apps/ai/backends/groq.py, prompts.py, and views.py
- migration/django/apps/voice/services.py
- migration/django/apps/application/views.py and templates/application/voice_autofill.html
- migration/django/static/js/p7_voice.js
- migration/django/static/js/p7_media.js
- migration/django/config/settings/base.py and scripts/p10_preflight.py
- P10 brief/readiness and migration status documents

## Historical evidence and open boundaries

The 2026-10-15 run p10-20261015-runtime-01 remains a valid pass for Waitress/WhiteNoise runtime, configuration, static serving, preflight, service boundary, checks, and runbooks. It used the configured hosted development Supabase target, so it does not establish local Supabase as the app default or pass expanded P10. Evidence remains linked from the readiness ledger at docs/deployment/P10_READINESS.md.

The owner reports that the old browser-exposed Groq key was revoked; this has not been independently verified from this environment. P4 separately records an unretired Supabase project secret/legacy API-key retirement action, rejected by automatic review due to unknown external consumers. The tracked Google `service-account.json` private-key blob is a separate P0 issue with no recorded rotation completion. No credential was changed in P10 closeout; resolve both before deployment. No production host/domain/TLS proxy has been selected. Do not publish, change hosted credentials, apply production migrations, switch traffic, start a production soak, or retire the legacy runtime under this handoff.

## Next step

P10 local implementation and owner review are complete. A later owner instruction authorized local P11 legacy retirement without deployment or soak entry gates; see [P11 closeout](HANDOFF_2026-10-17_P11_LEGACY_RETIREMENT.md). The P10 deployment deferral still applies: do not publish or change hosted resources.
