# P10: local-first release candidate before deployment

**Updated:** 2026-10-17. **Status:** P9 and all five P10 implementation waves are complete; the owner reviewed and accepted the local release candidate. The synthetic login/template smoke passed against a fresh local server on port 8001; the existing port 8000 process remains unresponsive and untouched. Deployment is deferred. The owner later authorized local P11 retirement without deployment or soak entry gates; see the [P11 closeout](../../HANDOFF_2026-10-17_P11_LEGACY_RETIREMENT.md), [P10 closeout](P10_W5_RELEASE_CANDIDATE_REVIEW.md), and [historical preparation ledger](P10_READINESS.md).

## 1. Objective and authority

Finish the application as a fast, reliable product that runs locally first. A hosted installation is a demonstration instance, not the primary product or data environment. P10 ends with an owner-reviewable, deploy-ready release candidate. It does not publish the application or authorize production data changes; deployment is a separate owner decision.

P9 is complete within the owner's 2026-10-15 scope: 25 route-level rows, 37 hosted route/security checks, schema acceptance, and private Storage metadata are recorded in the [P9 report](../parity/P9_REPORT.md) and [acceptance records](../parity/P9_SCHEMA_ACCEPTANCE.md). The P1 manifest's separate full-state flag remains unchanged. P9 exclusions and manual items remain in force unless stated below.

The 2026-10-15 P10 run implemented and checked the Windows Waitress/WhiteNoise runtime, local and production-style configuration, static serving, service boundary, preflight, logging, and runbooks. It used the configured hosted development Supabase target and did not implement an offline/local Supabase-backed product mode, live speech, the expanded privacy work, or the new performance/error work. Its evidence is a completed preparation sub-sprint, not evidence that the expanded P10 passes.

The former **Scope 11 voice work is brought into P10** as Waves 1 and 2 below. P11 still means later legacy-runtime retirement after deployment verification and an agreed soak; it is not the voice scope.

## 2. In-scope boundaries

- Local Windows operation and local Supabase CLI (`supabase start`) become the primary development/demo path. The local application must not silently use a hosted or production database.
- The hosted installation is a demo target using synthetic/demo data and a separately selected demo account strategy. Never put demo credentials or real-user data in source control.
- Use Groq GPT-OSS 120B for conversational extraction, Whisper Large V3 Turbo for speech-to-text, and Orpheus v1 English for text-to-speech. Keep all inference on Groq Free tier for this scope; do not add BYOK. The owner selected a one-time opt-in before cloud processing; Wave 3 implements it. The owner confirmed Groq ZDR is disabled on 2026-10-17; product copy discloses that state and possible provider retention. Orpheus is English-only, limited to 200 characters per request, and currently listed as Preview.
- Resume the paused recording lifecycle work only after the selected speech provider is integrated. The active-recording navigation-cleanup patch remains unverified until that wave.
- Keep the privacy/security statements on the site as the requirements to satisfy. Wave 3 maps each statement to a backend, provider, infrastructure, or operational control and attaches evidence. Do not mark an external certification or contract as satisfied by code alone.
- Improve page-load and route-transition performance, error clarity, and the quality of the local-first release candidate in one merged final wave.
- Reuse existing Chrome mobile-viewport evidence. Physical mobile testing is excluded. The owner will manually review physical recording edge cases and audibility; these are not agent acceptance gates.
- Keep the protected-route `Cache-Control: no-store` policy. Preserve the P9 owner-managed scope and avoid unrelated migration/refactor work.

## 3. P10 waves and exit criteria

| Wave | Work | Exit evidence |
|---|---|---|
| **1 — Speech and conversational form filling** | Use Groq GPT-OSS 120B for the chat/extraction path, Whisper Large V3 Turbo for transcription, and Groq Orpheus v1 English for spoken replies. Support both typed and recorded user answers in the same natural conversation: ask a relevant follow-up, validate values against field types/options/constraints, update only valid draft fields, and leave final save to the user. Keep credentials server-side, use only the strict Free tier, and exclude BYOK. Wave 3 enforces the owner-selected one-time opt-in before cloud processing. | Configuration and truthful error handling are recorded. A synthetic live smoke is allowed only after confirming the Groq organization is on Free tier. No real or personal data is sent. Evidence records model IDs, Free-tier limits, statuses, and whether transcript/audio are retained; no secret or user content appears in logs. |
| **2 — Recording and voice lifecycle** | After Wave 1, verify the paused active-recording cleanup fix and browser-to-Django-to-Groq flow, stop/reset/navigation cleanup, upload semantics, timeout and cancellation behavior, playback handoff, and recovery after provider errors on supported desktop browsers. Reuse current Chrome mobile viewport evidence only. | Focused lifecycle evidence shows recording tracks are stopped on stop/reset/navigation, upload and playback work with the selected providers, and failures remain recoverable. Physical-device behavior and audibility remain owner manual review. |
| **3 - Backend privacy and security controls** | Inventory all data paths and product privacy/security claims. Enforce one-time opt-in and implement applicable access, retention, data-boundary and logging controls. Include P4 credential status; do not change live credentials without separate owner instruction. | The claim-to-control matrix links statements to code, configuration or evidence. Synthetic-account evidence covers retention/deletion/export and access. Groq plan and ZDR status are owner-confirmed; public copy states ZDR is disabled. Record provider-documented data location, and defer selected deployment-region evidence until a host is chosen. External certification, BAA, contract or audit requirements remain explicit gates. |
| **4 — Website issues** | Capture the concrete site issues the owner reports, add them to a prioritized backlog, reproduce each on the local app, and fix the accepted items. Include the main demo journey and a safe, repeatable synthetic-data demo-account/reset setup. Do not invent a speculative issue list. | Each owner-reported issue has reproduction steps, a disposition, and a result. Demo account/data is synthetic, resettable, and kept out of tracked secrets. |
| **5 — Performance, errors, local-first hardening, and release candidate** | Measure the reported roughly three-second page load reproducibly on the local stack, profile cold start separately from warm route navigation, and optimize the largest actual costs. Make validation, auth, network, provider, storage, and server errors actionable without exposing secrets, stack traces, or private data. Make local Supabase the default, provide safe local seed/reset and startup checks, separate local/demo configuration, and reconcile existing runbooks with the actual local-first setup. | Record machine, browser, route, cold/warm state, and repeated before/after measurements. Provisional target: local warm navigation median ≤800 ms and p95 ≤1.5 s, with first page load after services are ready ≤1.5 s; confirm feasibility against a recorded baseline before optimizing and seek owner approval before weakening the target. Local workflow starts from a clean state, connects only to local Supabase by default, persists across restart, and has a reproducible reset. Error cases are understandable and sanitized. Targeted app, security, voice, and migration checks pass. The final checklist separates local release-candidate status, demo-host status, and still-deferred deployment. |

### Provider decision: Groq

The selected Wave 1 providers are Groq GPT-OSS 120B for chat/extraction, Whisper Large V3 Turbo for STT, and Canopy Labs Orpheus v1 English for TTS. BYOK is outside this scope. Use the Groq Free plan only; the API key does not prove the organization’s plan, so verify the plan in the console before any live smoke. If the account is not on Free, stop before sending inference requests.

The current Groq rate-limit documentation lists Free-tier base limits of GPT-OSS 120B at 30 requests/minute and 1,000/day, Whisper Large V3 Turbo at 20/minute and 2,000/day with audio-second quotas, and Orpheus at 10/minute and 100/day. STT uploads are limited to 25 MB on Free tier. Orpheus accepts at most 200 characters per request, supports English only for this model, and is marked Preview. Exact organization limits may differ or change; do not upgrade or fall back to a paid plan for this scope. The implementation chunks spoken replies to fit the Orpheus request limit and surfaces provider quota errors without retrying automatically.

After the user opts in, Groq inference sends conversation text and recorded audio outside the local machine. Groq documents that inference inputs/outputs are not retained by default but may be logged for reliability/abuse monitoring for up to 30 days, or longer if legally required; usage metadata is always collected. The owner confirmed Groq ZDR is disabled for the active organization on 2026-10-17. Consent policy `p10-cloud-ai-v2` requires acceptance of the updated disclosure. Groq says retained customer data is stored in US GCP buckets; this does not establish the deployment region for VoiceForm hosting or Supabase. See [Groq Free-tier rate limits](https://console.groq.com/docs/rate-limits), [Groq STT](https://console.groq.com/docs/speech-to-text), [Orpheus TTS](https://console.groq.com/docs/text-to-speech/orpheus), and [Groq data controls](https://console.groq.com/docs/your-data).

## 4. Privacy/security claim rules

Wave 3 inventories the privacy/security statements shown by the product and checks each against code, provider settings, contracts, and deployment evidence. Keep claims that have support; qualify or remove claims that cannot be substantiated. Do not convert an unverified provider or organizational setting into a code-level pass.

For each statement, classify the evidence needed:

1. **Application control:** prove in Django/Supabase code and tests, including RLS, per-user authorization, deletion/export, retention enforcement, encryption configuration, and auditability.
2. **Provider or hosting control:** prove from the actual account configuration, region, retention controls, TLS path, terms, and applicable contract. A source-code default is insufficient.
3. **Organizational or independent attestation:** certifications and regulated-service commitments require their own audit, scope, organization, and contractual evidence. Backend changes alone cannot establish SOC 2, ISO 27001, HIPAA/HITECH, or a BAA.

Keep each claim's status visible as **implemented and verified**, **external evidence required**, or **not yet verified**. If a product requirement conflicts with the actual data path, show the conflict to the owner; do not claim success. Public copy may be qualified or removed when the implementation or available evidence cannot support it. In particular, end-to-end encryption must match the actual key ownership and whether the server/provider can read audio or form content to process it.

## 5. Existing foundation and limits

- Reuse P9 route, Auth, data, schema, Storage, Chrome viewport and cleanup evidence where the behavior is unchanged. Do not repeat checks just to inflate counts.
- The prior P10 run is the base for the Windows launcher, Waitress/WhiteNoise, sanitized preflight, logs, request boundary, and operational runbooks. Keep its evidence immutable and supersede only results that change under local Supabase or expanded P10 behavior.
- The prior local schema alignment proves the local application schema matches the P5 baseline; it does not prove that the app currently defaults to the local Supabase endpoint or that local Auth/storage are a complete offline product mode.
- Existing P9 evidence says the `p7_media.js` navigation cleanup patch is unverified. It is assigned to Wave 2, after speech integration.
- Live Google STT/TTS was previously deferred. Under this revision, live voice work is in P10 Waves 1 and 2. The P10 report must not claim it passed until live provider evidence exists.
- Physical mobile, physical recording edge cases, and audibility are outside this P10 run. Do not add them back to automated or agent-owned acceptance.
- No production host/domain/proxy has been selected. Do not publish, change hosted credentials, apply production migrations, switch traffic, or start a production soak under this planning brief.

## 6. Work rules and final deliverables

For every implementation wave, record the starting worktree state, exact files, owner-reported issue or requirement, evidence, and remaining risks. Preserve unrelated user changes. Never print credentials, provider request content, user audio, or private data in logs/evidence.

Use a bounded retry policy for unstable providers and tools: after one reproducible failure, make at most one targeted diagnostic retry. If it still fails, record the symptom and stop that branch for owner feedback or use a documented fallback. Do not spend dozens of attempts repeating the same failure.

The eventual P10 closeout must include:

- Updated owner-issue backlog and implementation disposition.
- Speech-provider decision, server-side configuration guidance, live voice evidence, and the Wave 2 lifecycle result.
- Privacy/security claim-to-control matrix, data-flow/retention map, and controls/evidence for each claim.
- Reproducible local-first runbook for Django and local Supabase, safe seed/reset, and a separate hosted-demo setup.
- Before/after performance report and error-handling evidence.
- Focused regressions and final local release-candidate checklist.
- P10 readiness update that preserves the 2026-10-15 preparation evidence and distinctly reports: local product readiness, hosted demo readiness, and actual deployment status.
- Dated handoff with decisions, completed waves, remaining owner inputs, and the next authorized step.

P10 is complete only when all five waves have evidence and the owner has reviewed the release candidate. Actual deployment remains a later explicit action. The owner's later 2026-10-17 decision authorizes local P11 legacy retirement without deployment, soak, telemetry, or recovery-reference entry gates; see the [P11 closeout](../../HANDOFF_2026-10-17_P11_LEGACY_RETIREMENT.md).
