# Phase review and P4 handoff

**Date:** 2026-10-10  
**Revision:** main, b66efbb plus uncommitted P1/P2/P3/P4 work  
**Result:** The three bounded P3 code findings below were corrected during P4 implementation and covered by the current 74-test suite. Live Google/Groq provider checks remain open for later voice/P9 verification. See [P4_REPORT.md](../auth/P4_REPORT.md) for current execution evidence.

## Phases so far

| Phase | Reviewed status | Evidence and limits |
|---|---|---|
| P0 | Complete per owner report | Accepted for progression; credential rotation, remote history and provider operations were not independently repeated in this review |
| P1 | Finalized with owner-accepted exceptions | [Acceptance](../parity/P1_ACCEPTANCE.md): 25-route manifest, reviewed harness and 24 historical desktop screenshots; historical 27 passed / 2 skipped. Mobile, /open, successful authenticated goldens and the full visual/flow matrix remain carryovers |
| P2 | Complete and reviewed | [Report](../foundation/P2_REPORT.md), [review](../foundation/P2_REVIEW.md): native Django, restricted database roles/aliases, dedicated django-schema sessions/bookkeeping and standalone Tailwind. Its foundation tests also pass within the current 44-test suite |
| P3 | Bounded code findings corrected; live-provider evidence pending | [Implementation report](P3_REPORT.md), [contracts](P3_CONTRACTS.md), original findings and correction verification below |
| P4 | Development Auth verified; exposed-key retirement approval pending | [P4 report](../auth/P4_REPORT.md); fresh hosted SDK/HTMX and PostgreSQL proof, no SMTP/legacy-account gate |
| P5a/P5b | Not started | Schema/Storage reconciliation, then user-scoped data access/RLS proof |
| P6/P7/P8 | Not started | Rendering/fallback, route waves, browser media bridge |
| P9/P10/P11 | Not started | Full parity, deployment/soak, then legacy retirement |

Original source/design/screenshots remain in place. No P0 work was reopened. P4 code changes remain inside its bounded file scope.

## Original findings and corrections

### P3-R1: Google STT retains automatic SDK retries (high)

**Location:** migration/django/apps/speech/backends/google.py, transcribe().

The adapter passes timeout but omits retry. The installed google-cloud-speech 2.41.0 recognize() uses the SDK default sentinel, and its transport wraps recognize with retries for DeadlineExceeded/ServiceUnavailable and a 5000-second retry deadline. A per-attempt timeout does not enforce the brief's no-retry policy or its bounded live call count. No real retry/provider call was triggered during this review.

**Correction applied:** both RPCs explicitly disable retries, retain finite timeouts, and close per-request clients/transports on success and failure. Current `test_speech.py` regressions inspect actual call arguments and cleanup. No live speech call has been made.

### P3-R2: Python Google errors map to the wrong TTS HTTP status (medium)

**Location:** migration/django/apps/speech/backends/google.py, synthesize().

The code reads GoogleAPICallError.code and maps only gRPC integers 3/8/16. The installed Python exceptions expose HTTP codes there. Offline mocks raising the actual SDK exception classes reproduced:

| Exception | Python SDK code | Current Django status | Mounted Express status to preserve |
|---|---|---|---|
| InvalidArgument | 400 | 502 | 400 |
| ResourceExhausted | 429 | 502 | 429 |
| Unauthenticated | 401 | 502 | 401 |

**Correction applied:** normalize actual SDK exception classes and their HTTP/gRPC statuses. Adapter/view tests use the SDK exception classes and verify sanitized output. Unrecognized provider failures keep the documented generic mapping.

### P3-R3: TTS's 5000-character guard differs from JavaScript (medium)

**Location:** migration/django/apps/speech/services.py, clean_tts_text().

JavaScript string.length counts UTF-16 code units; Python len(str) counts Unicode code points. A synthetic string of 3000 supplementary-plane emoji has JS length 6000. The unchanged mounted Express validateTextInput() rejected it as over limit; Django accepted it and cleaned it to ".". This permits requests the source rejects and violates the recorded direct endpoint limit.

**Correction applied:** the pre-cleaning guard now counts JavaScript UTF-16 code units and tests supplementary Unicode at the boundary. Cleaning/truncation behavior and metadata semantics remain covered.

## Evidence corrections and P4 integration results

- npx tsc --noEmit uses the root tsconfig.json, whose include is server/**/*.ts. The P3 report's pass is a server type check, not a frontend type check. Historical frontend configuration/debt remains recorded in P1; do not repair all legacy diagnostics as part of P4. Use a focused compiled transport harness and scratch Vite build for the modified React module.
- The source-derived oracle does not execute the mounted Express process. This review executed only its extracted pure TTS validator in Node; that is a small function differential, not full Express/Django HTTP parity.
- P4 now invokes verified bearer/session identity on the service views and applies CSRF checks for session-authorized writes. The detailed request matrix and failures are recorded in [P4_CONTRACTS.md](../auth/P4_CONTRACTS.md) and the test report.
- The P4 boundary allows the configured Django origin and Authorization preflight header while retaining exact-origin matching, loopback/Host checks and the non-authenticating marker.
- P4 added source comparisons for supported prompt values, including numeric JSON serialization; no claim is made for every possible JSON value outside supported form-data shapes.
- The historical empty public schema still means P4 cannot rely on a public.users row, its trigger or profile updates. P4 uses verified GoTrue identity/metadata. Profile provisioning and company/industry persistence are P5a/P5b gates.
- The owner superseded shared-email compatibility work with clean development-only Supabase Auth on 2026-10-11. Signup confirmation is disabled with authorization. No SMTP, React account compatibility or old-user proof is required; email recovery remains separate and unavailable. See [P4_REPORT.md](../auth/P4_REPORT.md).

## Checks repeated in this review

| Check | Current result |
|---|---|
| uv lock --check --offline | Passed, 48 packages |
| scripts/run_ruff.ps1 check apps config tests | Passed |
| uv run --offline python -m pytest -q | 44 passed in 1.37s, config.settings.test with in-memory SQLite |
| uv run --offline python -m mypy config apps tests | Passed, 43 source files |
| manage.py check --settings=config.settings.test | Passed |
| Synthetic provider-error probes | Reproduced all three 502 mappings using actual SDK exceptions with mocked clients |
| UTF-16 length probe | Reproduced Python acceptance versus mounted-source JavaScript rejection |
| Installed SDK inspection | Confirmed default STT retry configuration; no provider request |
| Documentation handoff checks | 114 local Markdown links verified across 14 handoff documents; tracked diff whitespace check passed; no stale active-P3 status in current handoff notes |

Native Python first failed inside the sandbox while loading _ctypes. The same pytest/mypy/framework checks and synthetic probes passed with approved execution outside that sandbox. Ruff and the lock check passed inside it. This is the already-recorded runner limitation; no runtime reinstall was performed.

These commands used project-local UV_CACHE_DIR=.uv-cache and UV_PROJECT_ENVIRONMENT=.venv-p2. Pytest used config.settings.test; mock clients replaced provider calls for the additional probes.

Earlier scratch builds, browser-runtime checks, static checks and production-setting checks are retained as historical P3 evidence in the implementation report; they were not rerun for this documentation handoff. No actual browser-over-HTTP or live Google/Groq evidence is newly claimed. The absence of live evidence remains pending even after the code corrections pass.

## Follow-up verification during P4

| Check | Result |
|---|---|
| Full isolated Django suite | 74 passed; includes P3 regressions and P4 auth tests; in-memory SQLite |
| Ruff / MyPy / Django check / lock | Passed; MyPy covered 56 source files |
| React transport and scratch Vite builds | Passed in both switch modes; minification disabled for this runner; legacy dist preserved |
| Loopback browser smoke | Passed with synthetic GoTrue and Django servers; no hosted Auth/account flow |
| Live Google/Groq | Not run; remains a later verification gate |

The initial 44-test/check results and runner notes above are historical evidence from the review date. The correction pass also verified JavaScript-compatible serialization of supported prompt values. The live P3 provider gate remains separate from closing these code findings.

## Next execution

P3 code findings are closed. Keep live provider checks open for later voice/P9 verification. P4 development Auth/HTMX/PostgreSQL acceptance passes under the revised scope. Key retirement needs approval; see [P4_REPORT.md](../auth/P4_REPORT.md). No P5/P6 implementation began.

P4 updated only the hosted Auth redirect allowlist; it did not create an Auth account, change email templates, mutate application database/Storage/policies, deploy, commit or push.
