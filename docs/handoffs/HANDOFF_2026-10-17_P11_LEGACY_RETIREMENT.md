# P11 legacy retirement closeout

**Date:** 2026-10-17  
**Scope:** Local source/runtime retirement only  
**Status:** Complete; session paused at owner request

## Owner decision and boundaries

The owner authorized P11 without deployment, soak, zero-traffic, telemetry, or recovery-reference entry gates. This change makes Django the sole active application runtime in the repository. No hosted resources, credentials, production data, deployment settings, traffic, or external services were changed.

## Changes made

- Moved the former React/Vite/Express application, package manifests, build configuration, static drafts, old Node scripts, former workflow, and original README into `legacy/`. The previous README is preserved as `legacy/README.original.md`.
- Added a root README that identifies the active Django application and explains the legacy archive.
- Removed the active Django proxy/fallback to the React app and removed its retired settings and bridge files. Route ownership and historical evidence remain in `docs/`.
- Removed bearer authentication and the browser-visible request marker from active app APIs. Django session authentication and CSRF are required; requests with the retired marker or `Authorization` header are rejected.
- Restricted transcription to multipart uploads and removed the legacy JSON/base64 audio path. TTS remains JSON.
- Updated parity/browser tooling to read archived source from `legacy/`.
- Preserved route screenshots, design and parity evidence, schema history, and migration documentation in their existing evidence locations.

## Verification

- Django system check under `config.settings.local_http`: passed.
- Django regression suite: **160 passed**.
- Ruff: passed.
- Standalone Tailwind CSS build and token checks: passed.
- `collectstatic`: passed.
- Local HTTP preflight: `ok: true`, no failures, no network calls.
- Retired-symbol audit outside `legacy/`: no active references found. `git diff --check` is clean after removing an extra trailing blank line.
- Final archive check: required app source/manifests/configuration are present under `legacy/`, and their former root paths are absent.
- Final browser-asset check: no Supabase browser client or public Supabase configuration was found in active Django templates/static assets.

These checks establish the local source/runtime boundary. They do not establish deployment, hosted changes, production cutover, or production soak; none was in scope.

## Retained runtime cache and evidence

The ignored root `node_modules/` directory remains a local dependency cache; source, manifests, and runtime configuration are archived under `legacy/`. It is not tracked or used by the active Django build. Historical route and browser tooling references the archived app path.

## Session pause and restart point

- P10's five local-first waves are complete and owner-accepted; P11 local retirement is complete. Deployment and hosted changes remain out of scope.
- The worktree contains the P10/P11 changes as unstaged, uncommitted local work. No changes were staged or committed during this session; preserve them on resume.
- The ignored root `node_modules/` cache is retained. All tracked React/Vite/Express source, manifests, build configuration and the former workflow are in `legacy/`.
- No further phase work is authorized by this handoff. On resume, read this file, [MIGRATION_STATE.md](../foundation/MIGRATION_STATE.md), and [MIGRATION_PLAN.md](../foundation/MIGRATION_PLAN.md), then follow the owner's next instruction.

See [MIGRATION_PLAN.md](../foundation/MIGRATION_PLAN.md), [MIGRATION_STATE.md](../foundation/MIGRATION_STATE.md), and the [P10 release-candidate review](../deployment/P10_W5_RELEASE_CANDIDATE_REVIEW.md) for phase context.
