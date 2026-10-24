# Handoff: P9 local functionality and P10 deployment preparation

> **Superseded for current execution:** The owner later instructed us to finish and report P9, then wait for explicit approval before P10. The current handoff is [HANDOFF_2026-10-14_P9_CLOSEOUT.md](HANDOFF_2026-10-14_P9_CLOSEOUT.md). This file remains the earlier local-readiness scope review.

**Date:** 2026-10-14. **Review baseline:** `main`, HEAD `3d16649`; clean before this documentation update. This handoff supersedes the earlier future-scope instruction to stop after P9 with only a P10 proposal. Historical P7/P8 and P9 kickoff evidence remains valid within its recorded boundaries.

## Owner target

The owner requested a document review, a revised P9 prompt if needed, and a path to finish implementation through P10 so the application fully functions locally and is deployable. Actual deployment is the owner's later decision. Local operation uses Django on native Windows with the existing hosted Supabase development project and existing configured Google/Groq services. Preserve accepted unavailable features and the original source/reference folders.

## Existing results and remaining work

P7 SR-1 through SR-4 are closed and P8 deterministic acceptance is complete. P9 has only the initial 25-route manifest/ownership/resolver pass; all end-to-end route rows, P9 hosted data/schema/security/rollback and real device/provider acceptance remain open. No new tests, HTTP/database requests, provider calls or acceptance passes were made by this review.

Follow the [root prompt](../../prompt.md), [revised P9 brief](../parity/P9_IMPLEMENTATION_PROMPT.md) and [P10 preparation brief](../deployment/P10_IMPLEMENTATION_PROMPT.md). The [P10 ledger](../deployment/P10_READINESS.md) records reviewed gaps: production settings reject enabled speech services; the dependency set has no production server entry point; the service boundary/limiter needs a supported deployment topology; real speech credentials and functionality remain unverified. Nonempty database/Supabase settings were found, but no nonempty Django Groq key or Google credential-path setting was found in the file/process environment. No values were printed; machine ADC/access was not established.

## Receiving session

1. Refresh actual branch/HEAD/status, relevant digests, tool versions and environment boundaries. Preserve current edits.
2. Use a fresh P9 evidence run. Parameterize the inventory helper's hardcoded run ID before rerunning; preserve kickoff evidence. Complete equivalent source/Django route/state captures and actual-page journeys at both viewports, negative controls and visual review.
3. Verify ordinary session/CSRF and hosted development persistence/RLS/private Storage with tracked synthetic fixtures and exact cleanup. Perform the read-only schema acceptance and representative rollback checks. Repair only verified defects.
4. Verify real desktop recording and the existing live providers when device/credential/spend prerequisites are available. Keep missing mobile/provider checks NOT RUN and report the gate; mocks do not prove real voice.
5. Continue independent P10 runtime/configuration/server/static/runbook work without a phase-transition stop. Record local functionality, P9 acceptance and P10 preparation separately. Critical local failures or missing real voice evidence prevent a fully functional pass; unrun certification is not an approved exception.

## Later deployment

Prepare deployment/recovery/monitoring/soak operations concretely for review. Publishing, production data/schema/secret changes, DNS/traffic switching and production soak are deferred to a later owner instruction. Host/domain, production Auth policy and secrets ownership remain recorded decisions. P11 requires later deployed verification/soak and zero transitional usage evidence. No commit/push or legacy retirement is included in the current brief.
