# P10: local-first release candidate before deployment

**Updated:** 2026-10-16. **Status:** P9 is complete within the owner's revised scope. The earlier P10 local-runtime preparation sub-sprint passed on 2026-10-15; that evidence remains valid for those deliverables. The owner has now expanded and replanned P10 as the final local-first product and release-candidate stage before deployment. The expanded P10 work is planned and has not started. See the [current handoff](../../HANDOFF_2026-10-16_P10_WAVE_PLAN.md) and the [historical preparation ledger](P10_READINESS.md).

## 1. Objective and authority

Finish the application as a fast, reliable product that runs locally first. A hosted installation is a demonstration instance, not the primary product or data environment. P10 ends with an owner-reviewable, deploy-ready release candidate. It does not publish the application or authorize production data changes; deployment is a separate owner decision.

P9 is complete within the owner's 2026-10-15 scope: 25 route-level rows, 37 hosted route/security checks, schema acceptance, and private Storage metadata are recorded in the [P9 report](../parity/P9_REPORT.md) and [acceptance records](../parity/P9_SCHEMA_ACCEPTANCE.md). The P1 manifest's separate full-state flag remains unchanged. P9 exclusions and manual items remain in force unless stated below.

The 2026-10-15 P10 run implemented and checked the Windows Waitress/WhiteNoise runtime, local and production-style configuration, static serving, service boundary, preflight, logging, and runbooks. It used the configured hosted development Supabase target and did not implement an offline/local Supabase-backed product mode, live speech, the expanded privacy work, or the new performance/error work. Its evidence is a completed preparation sub-sprint, not evidence that the expanded P10 passes.

The former **Scope 11 voice work is brought into P10** as Waves 2 and 3 below. P11 still means later legacy-runtime retirement after deployment verification and an agreed soak; it is not the voice scope.

## 2. In-scope boundaries

- Local Windows operation and local Supabase CLI (`supabase start`) become the primary development/demo path. The local application must not silently use a hosted or production database.
- The hosted installation is a demo target using synthetic/demo data and a separately selected demo account strategy. Never put demo credentials or real-user data in source control.
- Implement a real speech-to-text/text-to-speech path after evaluating the existing Google plan against Groq and any viable local option. Groq is a candidate, not yet the selected provider.
- Resume the paused recording lifecycle work only after the selected speech provider is integrated. The active-recording navigation-cleanup patch remains unverified until that wave.
- Keep the privacy/security statements on the site as the requirements to satisfy. Wave 4 maps each statement to a backend, provider, infrastructure, or operational control and attaches evidence. Do not mark an external certification or contract as satisfied by code alone.
- Improve page-load and route-transition performance, error clarity, and the quality of the local-first release candidate in one merged final wave.
- Reuse existing Chrome mobile-viewport evidence. Physical mobile testing is excluded. The owner will manually review physical recording edge cases and audibility; these are not agent acceptance gates.
- Keep the protected-route `Cache-Control: no-store` policy. Preserve the P9 owner-managed scope and avoid unrelated migration/refactor work.

## 3. P10 waves and exit criteria

| Wave | Work | Exit evidence |
|---|---|---|
| **1 — Issue intake and site fixes** | Add the concrete website issues the owner reports to a prioritized backlog, reproduce each one on the local app, and fix only the accepted items. Include the main demo journey and a safe, repeatable demo-account/data setup in this review. Do not invent a replacement issue list before the owner supplies it. | Each owner-reported issue has reproduction steps, a disposition, and a result. Demo account/data is synthetic, resettable, and kept out of tracked secrets. |
| **2 — Speech provider and live STT/TTS** | Inspect existing Google STT/TTS adapters and credentials without exposing secret values. Compare Google with Groq and a local inference option against accuracy/voice quality, latency, cost/free-tier limits, language support, size limits, uptime, setup burden, privacy/retention, and local-network requirements. Pick the smallest viable path, keep provider choice configurable where the current design supports it, and implement truthful provider errors with server-only credentials. | A recorded provider decision and current settings/limits; live STT and TTS smoke evidence with explicit consent and a synthetic test clip/text; no mock-success substitution in real mode; no secret or audio content in logs. Any failed external check gets one bounded diagnostic retry, then is recorded and paused for owner feedback or a fallback decision. |
| **3 — Recording and voice lifecycle** | After Wave 2, resume the paused active-recording cleanup fix and verify the browser-to-backend-to-provider flow, stop/reset/navigation cleanup, request cancellation or timeout behavior, playback handoff, and failure recovery on supported desktop browsers. Reuse current Chrome mobile viewport coverage only. | Focused lifecycle and end-to-end evidence shows no owned media tracks left active after stop/reset/navigation, correct upload/provider request semantics, and recoverable visible errors. Physical-device behavior and audibility remain owner manual review. |
| **4 — Backend privacy and security controls** | Inventory all data paths and every privacy/security claim shown by the product: browser, Django/session, Supabase Auth/Postgres/Storage, logs, backups, speech/extraction providers, hosting/region, and support access. Implement the backend/data controls required by each claim: least-privilege access and RLS, encryption and key handling appropriate to the actual processing model, retention and deletion, account data export/deletion where promised, configurable provider/data settings, consent and clear external-data boundaries, sanitized logs, and provider retention controls such as ZDR where available. Verify the actual selected Supabase/provider settings; document the data that still leaves the local machine when a cloud model is enabled. Include the outstanding P4 credential-revocation/rotation status in the gate; do not change live credentials without the owner's explicit operational instruction. | A claim-to-control matrix links each statement to code/configuration, provider/contract or operational evidence, and a reproducible check. Retention/deletion/export and access boundaries have evidence on synthetic accounts/data. ZDR is verified in the actual provider organization and tested against the relevant endpoints before any ZDR claim is considered met. Any statement needing certification, BAA, contractual terms, selected region, or an organizational audit is identified as an external gate and remains unverified until evidence exists. This planning change does not edit or remove site copy. |
| **5 — Performance, errors, local-first hardening, and release candidate** | This wave merges the previous performance/error wave with the former local-first/release-gate wave. Measure the reported roughly three-second page load reproducibly on the local stack, profile cold start separately from warm route navigation, and optimize the largest actual costs. Improve user-facing validation, auth, network, provider, storage, and server errors so each is actionable without exposing secrets, stack traces, or private data. Make local Supabase the default data target, provide safe local seed/reset and startup checks, separate local/demo configuration, and confirm the hosted demo uses isolated synthetic data. Reconcile the prior P10 runbooks and preflight with the actual local-first setup. | Baseline and before/after timing evidence records machine, browser, route, cold/warm state, and repeated measurements. Provisional target: local warm navigation median at or below 800 ms and p95 at or below 1.5 s, with first page load after services are ready at or below 1.5 s; confirm feasibility against a recorded baseline before optimizing and seek owner approval before weakening the target. The local workflow starts from documented clean state, connects only to local Supabase by default, persists across restart, and has a reproducible reset. Error cases are understandable and sanitized. Targeted app, security, voice, and migration regression checks pass. The final checklist clearly separates local release-candidate status, demo-host status, and still-deferred actual deployment. |

### Provider evaluation note: Groq

Groq's current documentation describes STT endpoints and Whisper Large v3/Turbo models, and a TTS speech endpoint with English and Arabic voice models. The published STT page currently lists a 25 MB free-tier upload limit; plan limits and pricing can change, so confirm them from the account and docs at implementation time. See [Groq STT](https://console.groq.com/docs/speech-to-text) and [Groq TTS](https://console.groq.com/docs/text-to-speech).

Groq documents an opt-in Zero Data Retention control for inference endpoints, including transcription and speech generation, which disables retaining customer inputs/outputs for reliability and abuse monitoring. The same documentation says usage metadata is still collected and gives the United States as the location for retained customer data. Therefore Groq is a cloud egress path, not offline processing; confirm organization-level settings, terms, and user disclosure before selecting it. See [Groq data controls](https://console.groq.com/docs/your-data). Do not describe any provider as free, zero-retention, or local until the exact account, limits, settings, and request path have been checked.

## 4. Privacy/security claim rules

The owner asked to make the existing privacy/security promises real in the backend and not remove them during this planning update. Treat the current site statements as acceptance requirements to inventory and verify. Wave 4 must not silently convert unsupported statements into passes.

For each statement, classify the evidence needed:

1. **Application control:** prove in Django/Supabase code and tests, including RLS, per-user authorization, deletion/export, retention enforcement, encryption configuration, and auditability.
2. **Provider or hosting control:** prove from the actual account configuration, region, retention controls, TLS path, terms, and applicable contract. A source-code default is insufficient.
3. **Organizational or independent attestation:** certifications and regulated-service commitments require their own audit, scope, organization, and contractual evidence. Backend changes alone cannot establish SOC 2, ISO 27001, HIPAA/HITECH, or a BAA.

Keep each claim's status visible as **implemented and verified**, **external evidence required**, or **not yet verified**. If the data path cannot technically satisfy a claim, stop at that gate and present the exact conflict for an owner decision rather than claiming success or silently changing the copy. In particular, end-to-end encryption must match the actual key ownership and whether the server/provider can read audio or form content to process it.

## 5. Existing foundation and limits

- Reuse P9 route, Auth, data, schema, Storage, Chrome viewport and cleanup evidence where the behavior is unchanged. Do not repeat checks just to inflate counts.
- The prior P10 run is the base for the Windows launcher, Waitress/WhiteNoise, sanitized preflight, logs, request boundary, and operational runbooks. Keep its evidence immutable and supersede only results that change under local Supabase or expanded P10 behavior.
- The prior local schema alignment proves the local application schema matches the P5 baseline; it does not prove that the app currently defaults to the local Supabase endpoint or that local Auth/storage are a complete offline product mode.
- Existing P9 evidence says the `p7_media.js` navigation cleanup patch is unverified. It is assigned to Wave 3, after speech integration.
- Live Google STT/TTS was previously deferred. Under this revision, live voice work is in P10 Waves 2 and 3. The P10 report must not claim it passed until live provider evidence exists.
- Physical mobile, physical recording edge cases, and audibility are outside this P10 run. Do not add them back to automated or agent-owned acceptance.
- No production host/domain/proxy has been selected. Do not publish, change hosted credentials, apply production migrations, switch traffic, or start a production soak under this planning brief.

## 6. Work rules and final deliverables

For every implementation wave, record the starting worktree state, exact files, owner-reported issue or requirement, evidence, and remaining risks. Preserve unrelated user changes. Never print credentials, provider request content, user audio, or private data in logs/evidence.

Use a bounded retry policy for unstable providers and tools: after one reproducible failure, make at most one targeted diagnostic retry. If it still fails, record the symptom and stop that branch for owner feedback or use a documented fallback. Do not spend dozens of attempts repeating the same failure.

The eventual P10 closeout must include:

- Updated owner-issue backlog and implementation disposition.
- Speech-provider decision, server-side configuration guidance, live voice evidence, and the Wave 3 lifecycle result.
- Privacy/security claim-to-control matrix, data-flow/retention map, and controls/evidence for each claim.
- Reproducible local-first runbook for Django and local Supabase, safe seed/reset, and a separate hosted-demo setup.
- Before/after performance report and error-handling evidence.
- Focused regressions and final local release-candidate checklist.
- P10 readiness update that preserves the 2026-10-15 preparation evidence and distinctly reports: local product readiness, hosted demo readiness, and actual deployment status.
- Dated handoff with decisions, completed waves, remaining owner inputs, and the next authorized step.

P10 is complete only when all five waves have evidence and the owner has reviewed the release candidate. Actual deployment remains a later explicit action. P11 legacy retirement still requires deployed verification, the agreed soak, zero fallback/API usage evidence, and a clean recovery reference.
