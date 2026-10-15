# Active task: finish current P9 closeout

**Updated:** 2026-10-15. **Current authorization:** P9 only, under the owner scope update below. P10 is outside this sprint; do not edit P10 artifacts or begin P10 implementation/readiness work.

## Current P9 result

The `p9-full-20261014-0723-utc` run's full three-mode aggregate, attempt 46, passed deterministic source/Django checks across all 25 manifest routes at desktop and Chrome mobile-viewport sizes. The route asset inventory, default-state screenshot review, bidirectional focus attempt 17, 37 hosted route/RLS/Storage checks with cleanup, the visible read-only P5 schema comparison, and desktop microphone evidence are recorded. Before the paused media cleanup patch, 177 pytest tests, Django check, mypy, Ruff, JavaScript syntax, pinned CSS build and collectstatic checks passed.

All 25 route-level P9 rows pass, including `/help-center` under the P9-D9 responsive disposition using existing Chrome mobile-viewport evidence. The P1 route manifest's `full_state_matrix_verified: false` remains unchanged; restricted hosted Storage metadata is pending a nonprivileged Supabase connection. AI Voice local acceptance passes 16 synthetic journeys across desktop and Chrome mobile-viewport sizes; recording/live-provider work is paused for future Scope 11, physical mobile is excluded, and physical edge cases/audibility are for owner manual review. See [P9 report](docs/parity/P9_REPORT.md), [verification](docs/parity/P9_VERIFICATION.md), [matrix](docs/parity/P9_ACCEPTANCE_MATRIX.md), [device/provider results](docs/parity/P9_DEVICE_PROVIDER_RESULTS.md) and [schema acceptance](docs/parity/P9_SCHEMA_ACCEPTANCE.md).

## Owner scope update (2026-10-15)

- Pause further recording/lifecycle and live Google STT/TTS checks until the owner implements Google STT/TTS; revisit these in future Scope 11. The active-recording cleanup patch remains unverified and paused.
- Do not test a physical mobile device for current P9. Existing Chrome mobile viewport/emulation coverage remains in scope.
- The owner will manually review physical recording edge cases and preview audibility. Do not claim those as agent tests or passes.
- Keep protected-route `Cache-Control: no-store`. The real Chromium navigation check verified that this prevents BFCache restoration while full reload returns a usable recorder. Treat this as the expected security-preserving behavior for current scope; do not weaken security to force BFCache.
- Continue the read-only Storage metadata investigation only through an owner-authorized nonprivileged method. Schema attempt 05 still returned no bucket metadata; never use service-role/admin credentials or mutate Storage settings.

## Instructions

1. Complete remaining P9 work within the revised scope, update the evidence links and reconcile the route/state matrix before reporting closeout.
2. Do not run the paused recording/provider or owner-manual physical checks. Do not use privileged credentials for Storage metadata.
3. Keep `/help-center`, hosted Storage metadata, and unresolved route/role/state/visual work visible; do not claim full P9 acceptance from the deterministic subset. BFCache behavior is verified with `no-store` retained and full reload working.
4. Do not edit P10 documents or perform P10 work. Preserve the original React/Express/reference files and historical evidence. No deployment, commit/push, production mutation, credential retirement or legacy cleanup is authorized.

The current P9 handoff is [HANDOFF_2026-10-14_P9_CLOSEOUT.md](HANDOFF_2026-10-14_P9_CLOSEOUT.md).
