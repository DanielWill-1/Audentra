# P10 readiness ledger

**Updated:** 2026-10-14. **Status:** Reference prepared; P10 implementation/readiness verification NOT RUN and awaits explicit owner approval after P9. The earlier `main`/`3d16649` baseline predates P9 execution. See [P9 closeout handoff](../../HANDOFF_2026-10-14_P9_CLOSEOUT.md) for current authorization and evidence.

**Owner target:** Fully functional local Django application using the existing Supabase development project and existing speech providers, with a deployable runtime/configuration package. Deployment is a later owner decision. See the [P10 task](P10_IMPLEMENTATION_PROMPT.md) and [P9 task](../parity/P9_IMPLEMENTATION_PROMPT.md).

| Requirement | Current result | Evidence / remaining work |
|---|---|---|
| P9 end-to-end routes and supported workflows | INCOMPLETE | Deterministic 25-route browser subset and 37 hosted checks passed; full route-matrix sign-off remains open. See [P9 verification](../parity/P9_VERIFICATION.md). |
| Real local sessions/data/RLS/Storage/schema acceptance | PARTIAL IN P9 | Hosted route/session/RLS/Storage checks passed and visible schema matches P5; bucket privacy/limits metadata remains unavailable. |
| Supabase/database configuration presence | PRESENT, NOT CONNECTIVITY VERIFIED | Read-only private setting-presence review; no values emitted and no connection attempted. |
| Real local microphone and existing live speech/extraction | PARTIAL | Desktop capture/stop/reset/navigation subset passed with no provider calls. Live STT/extraction/TTS were not run because the owner said no paid calls yet. |
| Production-compatible voice/service policy | OPEN | [Production settings](../../migration/django/config/settings/prod.py) reject enabled services; [boundary](../../migration/django/apps/api/boundary.py) requires loopback. Design and verify the supported private-upstream/public-ingress topology. |
| Production server/start/stop/static asset package | OPEN | [Dependencies](../../migration/django/pyproject.toml) include no production server; documented command is `runserver`. |
| Rate limits and trusted-proxy behavior | OPEN | [Limiter](../../migration/django/apps/api/throttling.py) is process-local; test the chosen topology and spoofing denials. |
| Production-style local server and deployment checks | NOT RUN | Verify DEBUG=False, assets, ordinary sessions/CSRF, TLS/cookies, restart and rollback with linked artifacts. |
| Local/deployment/recovery runbooks and final package | NOT RUN | Implement files named in the P10 brief and validate their local steps. |
| Physical mobile browser certification | NOT RUN | Hardware evidence still needed; preparation is not a device acceptance exception. |
| Production host/domain/users/secrets/Auth-policy decisions | DEFERRED BY OWNER | Record concrete options/prerequisites for the later deployment decision; Q1/Q15/Q17. |
| Actual deployment, production checks and soak | DEFERRED BY OWNER | User's 2026-10-14 instruction; no production result is claimed. |
| P11 retirement | NOT STARTED | Requires later deployed verification/soak and its separate authorization. |

After explicit P10 approval, execution must record a fresh run ID, actual environment/HEAD/digests, command ledger and direct artifact links. Do not mark any row PASS solely because its prompt/runbook was written. Current outcomes: P9 acceptance **incomplete**; P10 preparation **not implemented and awaiting approval**; deployment **deferred by owner**.
