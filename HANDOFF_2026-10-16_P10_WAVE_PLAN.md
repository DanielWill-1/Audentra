# P10 wave-plan handoff

**Updated:** 2026-10-16. **Branch/HEAD:** `main` / `62159c601dedad226b3988c58d26baa4a8274888`. **Status:** planning updated; expanded P10 implementation has not started.

## Decisions from this session

- P9 remains complete within the owner's revised scope.
- P10 is the final local-first product and release-candidate stage before deployment. Local Windows + local Supabase CLI is the primary target; the hosted instance is a demo.
- The former Scope 11 speech and recording work is now included in P10 Waves 2–3. P11 continues to mean later legacy-runtime retirement after deployed verification and soak.
- Wave 4 must implement backend privacy/security controls that make the site's existing promises technically real. Do not remove or edit site claims during this planning pass; map each claim to controls and evidence. A certification, BAA, contract, selected data region, or organizational audit must have its own evidence and cannot be marked complete from backend code alone.
- Wave 5 combines the prior performance/error wave with local-first hardening and the release-candidate gate.
- Physical mobile testing remains excluded. Keep the existing Chrome mobile-viewport evidence. Physical recording edge cases and audibility are for the owner to review manually.
- Use a bounded retry policy: one targeted diagnostic retry after a reproducible failure, then record and pause for owner feedback or a documented fallback.
- No app code, site copy, provider setting, hosted resource, or production service was changed in this planning session.

## Current five-wave plan

1. **Issue intake and site fixes:** capture the concrete website issues the owner will report, reproduce and fix accepted items, and plan a safe synthetic-data demo account/reset path. No speculative website bug list was invented.
2. **Speech provider and live STT/TTS:** inspect existing Google adapters and evaluate Google, Groq, and a viable local option for quality, latency, cost/limits, privacy, and setup. Select and implement the provider with server-only credentials and truthful failure behavior.
3. **Recording and voice lifecycle:** after Wave 2, verify the paused active-recording cleanup patch, stop/reset/navigation cleanup, end-to-end voice request, timeout/failure recovery, and playback handoff. Physical device and audibility checks remain manual.
4. **Backend privacy/security:** inventory data flows and claims across the browser, Django, Supabase, logs, providers, hosting, and backups; implement applicable retention, deletion/export, access, encryption/key, configuration, and provider controls; verify settings and claims individually.
5. **Performance, errors, local-first hardening, and release candidate:** measure the user's reported roughly three-second load, optimize the actual bottlenecks, make errors actionable and sanitized, default local runs to local Supabase, separate local and hosted-demo data, and prepare an owner-reviewable pre-deploy release candidate. The brief records provisional local performance targets to measure against a reproducible baseline.

The full sequence and acceptance evidence are in the [P10 implementation brief](docs/deployment/P10_IMPLEMENTATION_PROMPT.md). The [readiness ledger](docs/deployment/P10_READINESS.md) now distinguishes the new plan from the previously completed prep run.

## Evidence and open points

- The 2026-10-15 run `p10-20261015-runtime-01` remains a valid pass for the Waitress/WhiteNoise runtime, configs, static serving, preflight, service boundary, checks, and runbooks. It used the configured hosted development Supabase target, so it does not establish local Supabase as the app's default or expanded P10 completion. Its evidence is linked from the [readiness ledger](docs/deployment/P10_READINESS.md).
- The repo did not confirm a seeded hosted demo login during the prior review. No live Auth user list was inspected. Wave 1 needs a safe, resettable, synthetic demo-account approach; credentials must not be committed.
- P4's credential-revocation/rotation record is still unresolved in the current ledger. Wave 4 must include its status in the security gate; any live credential changes require a separate explicit owner instruction.
- The earlier privacy-page review found claims describing a Frankfurt-hosted Whisper.cpp/Redis/CloudWatch deployment that does not match the current Django/Supabase/provider implementation. Security/pricing pages also contain claims such as encryption, blockchain, and formal certifications that require direct control or external evidence. Wave 4 owns the claim-to-control review; site copy is unchanged by this handoff.
- Groq's current official docs list speech-to-text and speech-generation endpoints. Its current STT documentation lists a 25 MB free-tier upload limit. Its data documentation describes ZDR for inference customer inputs/outputs, while still collecting usage metadata and identifying the U.S. as the location for retained customer data. These terms and limits must be rechecked against the actual account before selection: [Groq STT](https://console.groq.com/docs/speech-to-text), [Groq TTS](https://console.groq.com/docs/text-to-speech), [Groq data controls](https://console.groq.com/docs/your-data).
- Cloud inference sends audio or text outside the local machine. If local-only processing is required for a claim or use case, a local provider must be evaluated or that provider must be disabled for that path.
- The actual production host/domain/TLS proxy is still unselected. P10 completion is not deployment authorization. Production traffic, credentials, migrations, and soak remain deferred; P11 is not started.
- Preserve the owner-approved `Cache-Control: no-store` behavior and the P1 `full_state_matrix_verified: false` value; neither changed in this session.

## Files updated

- `docs/deployment/P10_IMPLEMENTATION_PROMPT.md` — expanded P10 charter, five waves, provider/privacy notes, acceptance criteria, and stop rule.
- `docs/deployment/P10_READINESS.md` — separates the 2026-10-15 historical preparation pass from expanded P10, now planned.
- `MIGRATION_PLAN.md` and `MIGRATION_STATE.md` — align current P10/P11 status and ownership boundaries.
- `prompt.md`, `docs/prompt.md`, and `HANDOFF_2026-10-15_P10_PREPARATION.md` — label the prior preparation record as historical and link to this plan.
- This handoff records today's decisions and next step.

## Worktree and verification

The worktree already contained many unrelated P9/P10 changes before this documentation update. They were preserved. The branch remains `main` at HEAD `62159c601dedad226b3988c58d26baa4a8274888`; this session did not commit or change application code. No app tests were run. Documentation diffs and relative links should be reviewed before implementation begins.

## Next step

The owner sends the website issues they encountered. Add those exact issues to Wave 1's backlog with reproduction details, then start only the approved wave work from the active P10 brief.
