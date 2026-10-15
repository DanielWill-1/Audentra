# P10 local preparation handoff

**Historical handoff:** This records the completed 2026-10-15 local-preparation sub-sprint only. The owner expanded P10 on 2026-10-16; see the [current P10 wave-plan handoff](HANDOFF_2026-10-16_P10_WAVE_PLAN.md) and [active implementation brief](docs/deployment/P10_IMPLEMENTATION_PROMPT.md). The evidence below remains valid for its original scope.

**Updated:** 2026-10-15. **Branch/HEAD:** `main` / `62159c601dedad226b3988c58d26baa4a8274888`. **Run:** `p10-20261015-runtime-01`.

## Result

P9 remains complete within the revised owner scope. P10 local runtime/configuration preparation is implemented and verified; deployment/release verification remains deferred by the owner. The authoritative status is in the [P10 readiness ledger](docs/deployment/P10_READINESS.md), and the full command record is in [run evidence](docs/deployment/evidence/p10/p10-20261015-runtime-01/commands.md).

## Delivered

- Pinned Waitress 3.0.2 and WhiteNoise 6.12.0 in the locked Django environment.
- Added a production-compatible Waitress entry point restricted to loopback, with explicit thread, timeout, header, body, and proxy settings; added a distinct `local-http` profile with `DEBUG=False`.
- Added production checks for explicit host/origin/secret requirements, secure cookies, trusted-proxy policy, and owner-selected HSTS; added sanitized, no-network preflight and bounded operational logs.
- Kept P3 services disabled by default. The production profile can enable them only through a private token from the configured same-host proxy; requests still require the public marker, expected origin, normal identity, and existing limits.
- Added `/livez` process liveness and `/readyz` checks for both database aliases while preserving `/healthz` compatibility.
- Changed real AI extraction failures to surface a sanitized failure instead of successful mock/apology data.
- Added placeholder production environment configuration and local, deployment-preparation, and rollback/data-recovery runbooks.
- Added regression coverage for health behavior, proxy authorization, forwarded-proto handling, and typed provider failure.

## Verification

- `uv sync --locked` succeeded on Python 3.12.10. Installed runtime packages match the pinned versions.
- Isolated pytest: **183 passed**.
- Local Django check: **no issues**. Production `check --deploy`: only `security.W004` remains because HSTS is zero until a permanent host is selected; `security.W003` is silenced with the custom CSRF middleware rationale.
- Full `ruff check .`: pass. P10-scoped `ruff format --check`: pass for 14 changed runtime/test files. Repository-wide formatter inspection still reports 12 files outside this P10 scope; they were left untouched. Mypy: **96 source files, no issues**.
- Local Waitress HTTP checks passed for public/login pages, liveness, both-alias readiness, anonymous protected-route redirect, static response, upload cap, and disabled-service denial. Service rate limiting returned 429 on request 31 and reset after process restart.
- Production-profile HTTP checks returned a Secure CSRF cookie, readiness and static 200s, 403 for missing/incorrect private token, and 401 for a synthetic correct token after normal anonymous authorization.
- Local and synthetic production preflight passed with no network calls. `collectstatic` left 18 files unchanged and post-processed 48.

## Owner-managed and deployment gates

- The `p7_media.js` microphone navigation-cleanup patch remains unverified and owner-managed. Do not retest or repair it here. Recording/lifecycle and live Google STT/TTS work resume after the owner's implementation in future Scope 11.
- The owner will manually review physical recording edge cases and audibility. No physical mobile test was run; existing Chrome mobile viewport evidence is retained.
- The production-profile check used synthetic host/secret/token values and a fixed HTTPS WSGI scheme over loopback HTTP. It verified the Secure cookie policy but was not an HTTPS handshake and did not exercise a selected proxy product.
- Existing P9 session/login/refresh/logout evidence is reused. The P10 run checked server readiness and limiter reset after restart, but did not replay a signed-in session across a new Waitress process or exercise rollback from a prior release; those require the selected data/session configuration and release/proxy target.
- Host/domain, proxy/certificate, HSTS duration, production Auth policy, external secret store, deployment, production migrations, traffic change, soak, and P11 retirement remain deferred. No live provider calls, production writes, credential changes, commit, or push occurred.
- The P1 manifest's `full_state_matrix_verified: false` remains separate and unchanged.

## Evidence files

- [Initial metadata](docs/deployment/evidence/p10/p10-20261015-runtime-01/metadata.json)
- [Final metadata](docs/deployment/evidence/p10/p10-20261015-runtime-01/final-metadata.json)
- [Initial source/config digests](docs/deployment/evidence/p10/p10-20261015-runtime-01/source-config-digests.json)
- [Final source/config digests](docs/deployment/evidence/p10/p10-20261015-runtime-01/final-source-config-digests.json)
- [Commands and outcomes](docs/deployment/evidence/p10/p10-20261015-runtime-01/commands.md)
- [Production and local HTTP results](docs/deployment/evidence/p10/p10-20261015-runtime-01/production-profile.json)
- [Cleanup record](docs/deployment/evidence/p10/p10-20261015-runtime-01/cleanup.json)

The pre-existing P9/P5 worktree edits were preserved. The local static build and logs remain under ignored `migration/django/.state`; the runtime processes are stopped. No commit or push was made.
