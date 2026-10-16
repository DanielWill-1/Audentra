# P10 Wave 3: Privacy and Security Review

**Reviewed:** 2026-10-17  
**Status:** Wave 3 application review and controls are complete for the local release candidate and were owner-reviewed. On 2026-10-17, the owner confirmed Groq ZDR is disabled for the active organization; consent and privacy copy now disclose that state. This is an owner attestation, not a console capture. The owner also said Google will not be used and instructed leaving the tracked Google service-account key unchanged. Its prior exposure remains unresolved; P4 Supabase credential retirement and production deployment controls remain open.  
**Scope:** Current P10 Django runtime, its React source/fallback pages, and checked-in Supabase development controls. No production deployment or external account setting was changed.

## Data flow and retention

| Data | Current path | Application storage and controls |
|---|---|---|
| Recorded audio | After current-version consent: browser → authenticated Django /api/transcribe route → Groq Whisper Large V3 Turbo → transcript returned to browser | VoiceForm does not save audio as a form record. Django accepts up to 7.5 MiB; uploads over 2.5 MiB may be temporarily buffered to disk by Django. The owner confirms ZDR is disabled; Groq may retain inference inputs/outputs for reliability or abuse monitoring for up to 30 days. |
| Typed or transcribed answer, conversation, form fields, current draft | After current-version consent: browser → Django /AIVoiceAutoFill → Groq GPT-OSS 120B → field-checked draft returned to browser | Chat history is sent with each request but is not stored as a separate application database record. Current draft values remain in the browser/request until the user saves. |
| Assistant speech | After current-version consent: assistant reply text → Django → Groq Orpheus → generated audio returned to browser | The generated audio is not saved as a completed-form record. |
| Saved form values and templates | Django services → Supabase PostgreSQL under the authenticated user's RLS context | Saved records have no application expiry and remain until deleted. Individual filled-form deletion exists. Provider backups and retention are separate. |
| Uploaded template files | Django → private Supabase template-files bucket | Owner/share authorization applies. P9 read-only acceptance verified the development bucket is private, has a 20 MiB limit, and uses the expected MIME allowlist. |
| Account and session | Supabase Auth identity; Django session stored in the configured default database | Session records may contain Supabase auth tokens. The absolute session lifetime is 14 days. Production settings mark the session cookie HttpOnly/Secure and the session/CSRF cookies Secure. |
| Application logs | Django application/framework loggers | The P10 logging filter removes variable message content, exception details, and stack data before local console/file logging. Hosting, reverse-proxy, database-provider, and provider logs are outside this filter. |

## Claim disposition

| Earlier public statement | Finding | Wave 3 disposition |
|---|---|---|
| Local-only inference, air-gapped operation, or zero upstream egress | The configured P10 speech, chat, and TTS paths call Groq over HTTPS. | Replaced in the Privacy, Security, Home, and Documentation copy with the actual cloud data path. |
| Audio exists only in RAM and is cryptographically wiped; zero retention | Django may spool larger accepted audio uploads to a temporary file. Groq's reliability/abuse retention setting is organization-controlled. | Replaced with temporary-buffer and provider-retention disclosure. |
| End-to-end encryption, TLS 1.3, AES-256 at rest, client-managed keys/BYOK | These guarantees are not established by the application code. BYOK is outside the current release. | Removed from the public security claims and replaced with verified request/session controls. |
| No third-party model training | No account-level setting or contract was inspected that would support this blanket promise. | Removed as a guarantee. The notice links to Groq's current data controls. |
| Blockchain verification, immutable hashes, multi-node verification | No corresponding implementation was found in this application. | Removed from security/pricing/status copy. |
| HIPAA/HITECH, GDPR/CCPA, SOC 2, ISO 27001, or a 99.99% uptime guarantee | No applicable certification, BAA, legal review, audit report, or live availability monitor is established by this repository. | Removed from public claims. The status page now states that live monitoring is not connected. |
| __aud_demo_sid is the only cookie; no cookies are set | The Django runtime uses an audentra_session cookie and a CSRF cookie. | Replaced with a description of essential session/CSRF cookies and production cookie settings. |
| Published PGP key, named disclosure inbox, and under-24-business-hour response | The PGP block and response target were not verified. | Removed. The Security page points to the existing Contact page without stating a response-time commitment. |

## Controls supported by current code and evidence

- Authenticated application routes use server-verified Supabase identities. Supabase data operations run with transaction-scoped user claims and SET LOCAL ROLE authenticated.
- The P5 schema defines owner-scoped policies for filled_templates; the P5 hosted isolation probe is recorded in MIGRATION_STATE.md. P9 read-only schema acceptance confirms the reviewed development project has RLS enabled across its six application tables and matching policies.
- The development Storage bucket is private and has the accepted size/MIME limits, as recorded in [P9 schema acceptance](../parity/P9_SCHEMA_ACCEPTANCE.md).
- The Django service boundary enforces authentication/CSRF rules, allowed-origin checks, body-size limits, and a per-process request limiter. It does not provide a distributed rate limit.
- Provider requests use server-side credentials and fixed HTTPS Groq endpoints.
- Application logging is sanitized by migration/django/config/p10_logging.py.

## External facts and owner decisions still required

1. **Groq data controls:** The owner confirms the active Groq organization has ZDR disabled (2026-10-17); this state was not independently captured from the console. Groq says inference inputs/outputs are not retained by default, but may be logged for reliability troubleshooting or abuse investigations for up to 30 days, or longer if legally required. Usage metadata is always collected and does not include customer prompts or outputs. Groq says retained customer data is stored in United States GCP buckets. [Groq data controls](https://console.groq.com/docs/your-data).
2. **End-user cloud policy:** The owner selected an explicit one-time opt-in before cloud AI processing. The notice now states ZDR is disabled and summarizes Groq's possible retention. Consent policy version `p10-cloud-ai-v2` requires existing browser users to review and accept the updated disclosure again. The browser stores the accepted version in local storage; provider-bound requests carry it, and Django blocks requests without it. Users can withdraw consent from the voice form. The server does not maintain an account-level consent ledger.
3. **P4 credential retirement:** P4 records `revocation_completed=false`. Automatic approval review rejected revoking the existing Supabase project secret and disabling legacy anon/service-role keys because unknown external CI/application consumers could break. GitHub CLI/access was unavailable, so those external secrets were not updated. No P4 credential was changed in this wave. Treat this as a pre-deployment security gate; see [P4 report](../auth/P4_REPORT.md).
4. **Tracked Google service-account key:** The repository's P0 evidence reports a `service-account.json` private-key blob remains tracked/reachable in local refs and has no rotation completion evidence. No key contents were inspected or printed in this review. Keep it as a separate pre-deployment security gate; see [migration state](../../MIGRATION_STATE.md) and P0 remediation history.
5. **Production deployment:** The host, proxy/access logging, backup retention, database/storage settings, and applicable provider agreements are not established here. Groq's documented retained-data location is US GCP, but this does not establish the hosting or database region for a deployment. Development evidence does not certify production.
6. **Account lifecycle:** Users can delete individual saved form records, but this Django app has no self-service account deletion flow. Deleting an application row does not establish provider-backup deletion timing.

## Changed files

- Replaced the React and Django Privacy and Security pages with code-grounded data-flow and control descriptions.
- Corrected related Home, Pricing, Industries, Documentation, and Status claims in both the source pages and the active Django-rendered copies.
- Added a versioned browser opt-in for cloud chat, transcription, and TTS, with matching Django request checks and a withdrawal control.
- At initial Wave 3 implementation time, no provider settings, credentials, database schema, or production service were changed and no test suite was run. The final P10 audit later ran the full Django suite and Ruff; see the [W5 release-candidate review](P10_W5_RELEASE_CANDIDATE_REVIEW.md). No live provider or production setting was changed during closeout.
