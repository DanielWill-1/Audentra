# P10 local-preparation sub-sprint closeout (2026-10-15)

**Historical record:** P9 is complete within the revised owner scope. The P10 local runtime/configuration, security boundary, static serving, verification, and operational runbooks described below were implemented and checked in the 2026-10-15 preparation sub-sprint. On 2026-10-16 the owner expanded P10; the overall P10 is now planned and incomplete. Read the [active P10 wave plan](docs/deployment/P10_IMPLEMENTATION_PROMPT.md) and [current handoff](docs/handoffs/HANDOFF_2026-10-16_P10_WAVE_PLAN.md) for the work that remains. Do not treat this historical closeout as expanded P10 completion.

## P9 result and preserved scope

All 25 P9 route-level rows pass, including P9-D9 and the owner-accepted Chrome mobile viewport coverage. Hosted route/security checks, current Auth/session/data workflows, schema parity, and private Storage acceptance are linked from the [P9 report](docs/parity/P9_REPORT.md), [verification ledger](docs/parity/P9_VERIFICATION.md), and [schema acceptance](docs/parity/P9_SCHEMA_ACCEPTANCE.md). The P1 route manifest's separate `full_state_matrix_verified: false` stays unchanged.

The `p7_media.js` navigation cleanup remains owner-managed and unverified. Recording/lifecycle and live Google STT/TTS work wait for the owner's implementation and future Scope 11. The owner will manually review physical recording edge cases and audibility. Physical mobile tests were not run; current Chrome viewport evidence remains. Keep protected-route `Cache-Control: no-store`.

**Scope update, 2026-10-16:** The former Scope 11 voice work is now part of P10 Waves 2–3. Physical mobile remains excluded; physical edge cases and audibility remain owner manual review.

## P10 result

The pinned Windows runtime starts through Waitress with WhiteNoise static serving. `local-http` is an explicit loopback `DEBUG=False` profile. The production profile requires explicit HTTPS hosts/origins, secure cookies, a same-host trusted proxy, and a private upstream token for service endpoints. Sanitized preflight checks the environment without printing credentials or making provider calls. The limiter is process-local and its limits are documented. Local, deployment, and rollback/recovery runbooks are complete.

The aggregate check passes 183 pytest tests, Django's local system check, full Ruff lint, scoped P10 Ruff formatting, and mypy over 96 source files. Actual Waitress HTTP checks cover readiness, static assets, size/rate limits, restart behavior, Secure cookie output, and service-boundary denials. Django's deployment check reports only `security.W004` while HSTS remains zero for the unselected domain. The real external TLS proxy and HTTPS handshake have not been checked.

See the [P10 readiness ledger](docs/deployment/P10_READINESS.md), [P10 task](docs/deployment/P10_IMPLEMENTATION_PROMPT.md), and [dated handoff](docs/handoffs/HANDOFF_2026-10-15_P10_PREPARATION.md). Run-scoped evidence is under [`p10-20261015-runtime-01`](docs/deployment/evidence/p10/p10-20261015-runtime-01/commands.md).

## Next decision recorded on 2026-10-15 (superseded by the current wave plan)

The local-preparation sub-sprint was complete. The owner later replanned P10 as the final local-first stage before deployment. Its current waves and next action are in the [active P10 brief](docs/deployment/P10_IMPLEMENTATION_PROMPT.md) and [2026-10-16 handoff](docs/handoffs/HANDOFF_2026-10-16_P10_WAVE_PLAN.md). Production host selection and actual deployment still require a later owner decision. P11 retirement remains a separate phase after deployed verification and soak.
