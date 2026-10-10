# P3: Python speech and extraction services beside the legacy app

> Archived on 2026-10-10 before preparing P4. This preserves the executed P3 scope; use [P3_REVIEW.md](P3_REVIEW.md) for the later review findings and [root prompt.md](../../prompt.md) for the next implementation brief.

## Status and authorization

Updated on 2026-10-10 after the owner requested P3 implementation. **P2 is complete and reviewed; P3 implementation is active.** This brief authorizes P3 only; it does not authorize P4 or later phases.

Read [P2_REVIEW.md](../foundation/P2_REVIEW.md), [P2_REPORT.md](../foundation/P2_REPORT.md), [the archived P2 scope](../foundation/P2_IMPLEMENTATION_PROMPT.md), MIGRATION_STATE.md and MIGRATION_PLAN.md. P1's accepted exceptions and owner-reported P0 completion stand. Do not reopen P0/P1 or rerun the hosted role bootstrap.

The existing hosted Supabase target is approved development/testing, with no production and no Docker. P2 established restricted django_app and django_data connections and Django-owned sessions/migration state. It did not provision public application tables, Storage or application RLS. P3 requires no application database or Auth identity.

## Result and preservation

Implement Python STT, TTS, extraction and field matching under migration/django/. Add contract-compatible Django endpoints, retaining legacy JSON/base64 transcription and adding multipart alongside it. Give the existing React service an explicit opt-in transport switch so the same voice page can use Django while Express remains available for comparison and rollback.

Keep src/, server/, scripts/, public/, new pages/, page-screenshots/, Node manifests/lockfiles and Vite/TypeScript/Tailwind configuration in their original locations. Retain migration/parity/ and docs/parity/. Copy logic into the new implementation; do not relocate or delete originals. Preserve them through P9 and the P10 soak. Runtime retirement is gated on P11; design, schema history and comparison evidence remain retained afterward.

No page redesign, route-wave port, reverse proxy, recorder rewrite, schema/Storage change or Auth flow is included. Multipart becomes the browser recorder contract in P8; legacy base64 removal remains P11.

## Read and establish the source contract first

Inspect applicable AGENTS.md instructions, git status and existing edits. Preserve user work. Read:

- MIGRATION_STATE.md, MIGRATION_PLAN.md, docs/parity/P1_ACCEPTANCE.md and docs/parity/route-manifest.json.
- P3, P4, validation and transitional-mechanism sections in docs/python-migration-plan.md; this brief and the consolidated plan resolve older conflicts.
- migration/django/config/, apps/core/, apps/db/, tests/, scripts/, pyproject.toml, uv.lock and README.md.
- server/index.ts, server/routes/transcription.ts and server/routes/tts.ts: these are the mounted routes to port.
- src/services/ai.ts, src/config/api.ts, and normalizeKey/applyExtractedDataToForm in src/pages/AIVoiceAutoFill.tsx.
- package.json, vite.config.ts and the speech/extraction callers, to establish URLs, payloads and return values.

Do not port the unmounted server/routes/transcribe.ts, src/lib/aiVoiceService.ts, unused extractDataFromText, or browser audio-player code into Python.

Before coding, create docs/services/P3_CONTRACTS.md recording source paths/revision, request/response shapes, defaults, validation, browser fallbacks and intentional safety differences. List exact legacy transport edits; a line-count estimate does not define scope.

Current-source corrections:

1. Both speech helpers hard-code http://localhost:3001 and send JSON without credentials.
2. P0 already makes GROQ_API_KEY undefined in browser configuration. Current extraction therefore takes its existing mock branch; it does not make a working live Groq call. Preserve this behavior when the Django switch is off. When on, call server extraction without a browser key check blocking it.
3. TTS returns audioContent **and metadata**, and accepts optional voice/options even though the browser currently sends only text.
4. The client limit is 10 * 1024 * 1024 **base64 characters**, not 10 MiB decoded bytes. The Express JSON envelope limit is 20 MB. Record exact units and multipart equivalence.
5. P2 has session tables and SessionMiddleware but no authenticated principal, AuthenticationMiddleware or login flow. A stored Django session alone is not proof of authentication.

## Implement only this scope

### 1. Services and provider configuration

Use small synchronous service functions and injectable provider adapters. Retain the uv-managed Python 3.12/Django LTS foundation and current Tailwind major version. Add only necessary Python dependencies to migration/django/pyproject.toml and uv.lock after checking official SDK compatibility.

Proposed new paths, relative to migration/django/:

- apps/speech/: services.py, views.py, urls.py, backends/google.py and backends/mock.py.
- apps/ai/: services.py, schemas.py, views.py, urls.py, backends/groq.py and backends/mock.py.
- apps/voice/services.py: pure field normalization/matching.
- apps/api/: narrow request-boundary and credential-validation helpers, including auth.py.
- tests/unit/, tests/contract/ and tests/fixtures/{google_stt,google_tts,groq}/.

Use explicit mock/provider settings. Deterministic mocks are the default for tests and local contract work; select live providers deliberately. Preserve the existing extraction mock response behind USE_MOCK_AI. A configured live provider failure must not silently become a successful mock. No new providers, workers, queues, persistent conversation state or service framework.

Google credentials are server-only, using an explicit resolved path or GOOGLE_APPLICATION_CREDENTIALS. Do not recreate or copy a service-account key into the repository. Groq uses server-only GROQ_API_KEY and a fixed/allowlisted provider endpoint, never a request-supplied URL. No provider key may use a VITE_ variable.

Read private configuration only as needed; never print credentials, database URLs or sensitive provider payloads. Do not rotate credentials or alter cloud accounts in P3.

Check availability of historical model llama3-70b-8192 against official provider documentation at implementation time and preserve it in source-derived fixtures. The owner selected Groq `openai/gpt-oss-120b` after checking current model documentation; use it as the live model setting while preserving the legacy prompt and sampling parameters. Keep live calls disabled unless deliberately enabled with private server credentials; do not silently change the selected model or prompt. Continue mock/contract work if live credentials are unavailable.

### 2. HTTP contracts and parity

| Endpoint | Request | Success response |
|---|---|---|
| POST /api/transcribe and /api/transcribe/ | Legacy JSON {audio: data URL, mimeType}; also multipart with audio file and mimeType | {transcript: string} |
| POST /api/tts and /api/tts/ | JSON {text, voice?, options?} | {audioContent: base64, metadata: {textLength, audioSize, voice, encoding}} |
| POST /api/ai/extract and /api/ai/extract/ | JSON {userInput, formFields, currentFormData, conversation} | {response: string, extractedData: object} |

Support both slash forms directly so POST does not depend on a redirect. Preserve /healthz; all 25 page routes stay in React.

STT preserves the **mounted** route's MIME encoding map, optional sample rates (WebM/Ogg 48000, WAV/x-WAV 16000), en-US, automatic punctuation, first alternative per result, newline joining, and empty-result fallback "Transcription failed". The browser's unused encoding map is not the provider contract.

Preserve comma/base64 checks and the client size limit. Check body types, malformed JSON/base64, empty files, MIME metadata and size before calling providers. Match the multipart decoded-size cap to the legacy base64 cap and test boundaries. Unknown formats follow the recorded contract; record any intentional safety rejection. Enforce the 20 MB envelope limit: FILE_UPLOAD_MAX_MEMORY_SIZE is a buffering threshold, not a hard limit. No persistent audio or Storage upload.

TTS preserves 5000-character validation, whitespace collapse, **JavaScript ASCII** character-strip semantics, terminal punctuation, voice/audio defaults and JavaScript falsy-default behavior. Record edge cases, including punctuation-only cleaning and the browser's existing over-limit truncation quirk. Do not repair quirks incidentally. Preserve metadata and known provider status mappings; omit raw exception details from responses.

Extraction preserves the exact system prompt, generated field descriptions/current-data formatting, message order, conversation filtering/role conversion, temperature 0.3, max_tokens 2048, top_p 0.9 and stream false. Preserve strict JSON parsing, the greedy brace-regex fallback, then raw-response/empty-extraction fallback, plus the current failure/mock responses. Keep optional TTS, audioUrl construction and playback in the browser; the extraction endpoint must not duplicate its TTS call.

Port field matching as a pure function: ASCII alphanumeric stripping, lowercase, first field matching by id **or label**, unmatched keys ignored, existing data copied, later extracted entries applied in order. Keep component matching in place until its page migration.

Transport validation may reject malformed/oversized requests. Form/business validation stays **log-only through P3–P9**; diagnostics must not expose payloads, coerce values or enforce new required-field rules.

### 3. Local boundary and P4 credential seam

P3 does not require user authentication. Bind development to 127.0.0.1:8000 and keep services disabled for public exposure. Loopback access plus exact Origin checks and narrow CORS form the boundary; CORS alone does not restrict non-browser clients.

- Use actual Vite origins http://localhost:5173 and http://127.0.0.1:5173. Another origin requires explicit configuration. No wildcard/suffix matching, null origin or arbitrary reflection.
- Reject missing/disallowed Origin on service POSTs. Check Referer's parsed origin consistently when present. CLI checks supply an allowed Origin explicitly. Validate Host; do not trust forwarded origin/IP headers in this no-proxy phase.
- OPTIONS accepts only allowed origins/methods/headers and does not require the POST marker. Add Vary: Origin where appropriate. Do not enable credentialed CORS for the unauthenticated P3 browser path.
- Require X-Internal-Api-Token matching configured INTERNAL_API_TOKEN on service POSTs. Its browser counterpart is public configuration, **not a secret or authentication**. Record P11 removal and legacy-contract usage counts without logging tokens/audio/transcripts.
- Add bounded local per-client request limiting and finite provider timeouts. No Redis, database rate-limit tables or automatic retries multiplying paid calls. Document limits and test 429.
- Keep CSRF middleware globally enabled. Document/test any narrowly necessary P3 service-view exemption; do not exempt pages or future authenticated session writes globally.

Implement the planned reusable apps/api/auth.py helpers without P4 workflows. Verify any supplied Supabase bearer server-side against configured GoTrue or verified JWKS claims. Reject malformed, expired/forged tokens or unavailable verification; no decoded-only JWT acceptance or fallback to anonymous success for an invalid supplied bearer.

The future session branch depends on a trusted authenticated principal supplied by P4. Test that seam with an injected principal and reject mere session existence/self-asserted session fields. **Do not create/hydrate SupabaseUser, implement login/token storage/refresh, or claim working session authentication in P3.** Record the difference between helper tests and P4 end-to-end authentication. Attaching the legacy browser bearer and enforcing valid-session-or-bearer authentication belong to P4. Session-authorized writes require CSRF protection when P4 activates them. The public marker never satisfies authentication.

### 4. React transport edits

The only legacy application code editable in P3 is src/services/ai.ts:

- Add explicit public opt-in flag/base URL for Django services; default stays on existing Express/P0 mock behavior. Provide an obvious rollback setting.
- When enabled, route STT/TTS to Django with unchanged JSON, and extraction to /api/ai/extract/ with its four inputs. Send the public marker. Preserve exported signatures, return values, fallbacks and optional TTS/audio handling.
- Leave recorder conversion, validation, component matching, audio-player helper and unused exports in place. Changes to the old browser-provider request path must be limited to the replacement extraction transport; preserve its reference prompt/configuration in source-derived fixtures/docs.
- Keep provider credentials out of client imports/bundles. Do not re-enable GROQ_API_KEY in src/config/api.ts. No page, AuthContext, Supabase-helper or auth-component edits.

Document public settings such as VITE_USE_DJANGO_SERVICES, VITE_DJANGO_API_BASE_URL and VITE_INTERNAL_API_TOKEN. Secrets stay in ignored migration/django/.env; server names/defaults go in its .env.example. No secret propagation through Vite.

## File allowlist and exclusions

New implementation/tests/fixtures belong in the named packages under migration/django/. New evidence belongs in docs/services/P3_CONTRACTS.md and docs/services/P3_REPORT.md. Temporary build outputs/logs remain ignored.

Existing edits are limited to:

- migration/django/config/urls.py, config/settings/{base,dev,prod,test}.py, pyproject.toml, uv.lock, .env.example and README.md, as needed for these services/checks.
- migration/django/tests/test_foundation.py for regression coverage; retain P2 checks/test isolation.
- src/services/ai.ts for the transport edits above.
- Root .env.example for the named **public** settings only; .gitignore for narrowly necessary generated artifacts.
- MIGRATION_STATE.md, MIGRATION_PLAN.md, prompt.md and README's migration paragraph; short status/correction notes in docs/python-migration-plan.md, docs/security-remediation.md, docs/tables.md, docs/parity/README.md and docs/prompt.md.

No edits to server/, Node manifests/lockfiles, src/config/api.ts, pages/components, legacy build configuration, screenshots, historical SQL or supabase/bootstrap/. No hosted DDL/grants, bootstrap/migration writes, seeding, Storage/RLS setup, Auth identity/dashboard changes, deployment, commits or pushes. No P4/P5/P6/P7/P8 implementation.

## Checks and evidence

The future P3 implementation request authorizes focused checks below. Use config.settings.test and disposable local fixtures; pytest must never create/drop/flush the hosted project. Mocks must need neither credentials nor network. Existing P1 UI fixtures are not recorded speech/provider goldens.

1. Add labelled source-derived synthetic fixtures/mock replies. Cover MIME/sample rates, transcript joining/empty result, both STT inputs, malformed/oversized requests and slash aliases.
2. Compare request construction/response normalization with mounted Express source. Put a test-only reference harness or reproducible fixture generator under migration/django/tests/ and run it where feasible. Do not modify Express for tests. Label source-derived assertions separately from executed differential checks.
3. Test TTS validation/cleaning/defaults, ASCII/Unicode differences, falsy options, metadata and provider errors. Identical mocked bytes must yield identical base64; live calls may vary and need justified tolerances.
4. Test exact extraction prompt/messages/settings, parse fallbacks, mock/failure behavior and name/email/phone/date/selection fixtures. Test field id/label matching, punctuation/case, collisions, unmatched keys and copying.
5. Test origin/Referer/Host/marker failures, preflight, methods, rate limits, provider timeouts/sanitized errors, bearer validation and the future trusted-principal seam. Helper tests do not complete P4 Auth.
6. Check React transport with the switch off and on, including extraction despite the absent browser key. Label fake audio/provider replies. Check new client-bound source/build output for provider secrets without printing matches. Use ignored scratch build output; do not overwrite legacy dist/. Record existing broad legacy lint/type/build failures separately.
7. Run lock checks, Ruff, mypy, focused pytest, Django system/deploy checks and Tailwind/static regressions. Recheck /healthz with both live restricted aliases read-only where configured. Do not change grants to pass.

Use native PowerShell from migration/django/ with project-local UV_CACHE_DIR=.uv-cache and UV_PROJECT_ENVIRONMENT=.venv-p2, plus existing Tailwind/Ruff helpers. In this Codex Windows runner native Python DLL loading failed inside the sandbox; the same checks passed with approved execution outside it. Do not reinstall Python or change versions solely for this runner limitation.

The normal suite is mocked/offline. During authorized implementation, use configured server credentials and a short synthetic fixture for a bounded live smoke where available: at most two STT calls, two TTS calls and one Groq extraction call, with no automatic retries. This allows a reference/Django speech comparison without an open-ended provider run. Do not send personal data. Mocks cannot prove live provider parity. Record missing credentials, unavailable models, missing audio fixtures and unperformed browser/live checks separately. Finish independent work and leave required live gates pending unless the owner accepts a bounded exception.

## Completion and handoff

P3 is complete only when:

- Python services/endpoints preserve the recorded contracts, both STT inputs work, and boundary/credential-helper tests pass.
- Server-only configuration, explicit mocks, timeouts and limits are documented; no browser secret is introduced.
- React opt-in preserves signatures/default rollback behavior; original page/Express files remain available.
- P2 regressions and focused lint/type/tests pass; differential evidence is labelled mocked, source-derived or live.
- docs/services/P3_REPORT.md records files/source revision, exact commands/results, intentional differences, provider/model checks, environment, rollback and blocked or owner-accepted gates. Missing required evidence is not a passing result.
- Current state/plan/status docs agree; no next phase is implemented automatically.

Rollback: disable the React transport flag and stop only the Django process started for this work. Original Express speech and P0 mock extraction remain available. Do not drop roles/schema, delete session state or restore browser credentials.

When a choice blocks dependent work, identify the decision and continue independent in-scope tasks. Request authorization before widening file/phase bounds. Report changes, actual checks, remaining owner actions and the next phase. Prepare a P4 prompt only when requested.
