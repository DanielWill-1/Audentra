# P6: shared rendering shells and controlled legacy fallback

**Archive:** Executed P6 brief copied from root prompt.md on 2026-10-11. Current root [prompt.md](../../prompt.md) prepares P7 W1; [P6_REVIEW.md](P6_REVIEW.md) records later review findings. Implementation file paths in this archive refer to the repository root.

**Prepared:** 2026-10-11
**Status:** Implemented at the owner's request on 2026-10-11; see [P6_REPORT.md](../rendering/P6_REPORT.md) and [P6_VERIFICATION.md](../rendering/P6_VERIFICATION.md).
**Authority:** The owner authorized P6 implementation after the earlier review-only readiness pass. This prompt remains the P6 scope and acceptance record.
**Snapshot:** P6 implementation is in the existing uncommitted working tree. Preserve all P1–P5 and local environment state.

## Objective and readiness

Complete P6's reusable Django rendering infrastructure and controlled fallback so P7 can migrate routes individually. Build base/public/app templates, shared fragments, accessible navigation/modal behavior, icons/static integration and reversible route ownership. Full product page bodies remain P7 work.

The [readiness review](../rendering/P6_READINESS_REVIEW.md) records inspected evidence. P6's P2/P1 prerequisites and the session's additional P5 closure gate are met. This is readiness for development work, not full application parity or production readiness.

| Phase | Accepted status | Evidence still carried forward |
|---|---|---|
| P1 | Finalized with owner-accepted exceptions | Missing mobile, /open and successful authenticated references; numeric tolerances/full state and flow matrix remain later gates. |
| P2 | Complete and reviewed | Preserve isolated tests, restricted state/data aliases and pinned standalone Tailwind. |
| P3 | Implementation and bounded code corrections closed | Live Google/Groq and device/browser voice verification remain open for voice/P9. |
| P4 | Revised development Auth accepted | Email recovery, production confirmation policy and exposed-key retirement remain separate work. |
| P5a/P5b | Complete for development | 65 hosted shared-pooler checks, A/B/A identity/data isolation, rollback/recovery, client reuse and exact cleanup passed; latest isolated suite: 95 passed. |

The completed [P5 closure prompt](../data/P5_CLOSURE_PROMPT.md) is archived. Do not repeat hosted probes, schema provisioning, credential operations or provider calls just to start P6.

## Read first

1. Latest owner instructions; MIGRATION_STATE.md; P6/P7 gates and correction register in MIGRATION_PLAN.md; HANDOFF_P5_P6.md (old P5 closure instructions are historical).
2. docs/rendering/P6_READINESS_REVIEW.md and docs/parity/P1_ACCEPTANCE.md, route-manifest.json, flows.md and reference-inventory.json.
3. Under migration/django/: config/urls.py, settings, core views, account URLs/templates/middleware, templates/base.html, config/tailwind.config.cjs, assets/tailwind.input.css, scripts/build_static.ps1, scripts/check_static.py and README.md.
4. Original src/App.tsx, Header/Footer, Dashboard and other app layouts, shared modal components, tailwind.config.js, src/index.css, index.html, relevant new pages/ designs and page-screenshots/.
5. P4/P5 contracts and reports for shared template/session/route boundaries. Current consolidated scope supersedes illustrative code and stale completion claims in docs/python-migration-plan.md.

## Preserve scope

- Native Windows; existing development project/data intact; no Docker, paid services, deployment, commit/push or history cleanup.
- Runtime additions belong in migration/django/; evidence in docs/rendering/ or docs/parity/. Keep original src/, server/, scripts/, public/, new pages/, page-screenshots/ and legacy configuration in place; preserve dist/client.
- Use installed, locked dependencies, vendored HTMX and pinned standalone Tailwind. Small purposeful JavaScript is sufficient; the older plan does not mandate Alpine or upgrades.
- Preserve current Audentra copy, tokens and layout hierarchy. Document necessary accessibility differences; no unsolicited redesign.
- No P7 page bodies, P8 recorder, teams/preferences/activity backend, anonymous sharing, timezone/access-rule changes, token bridging, credential retirement or production Auth policy changes.
- Django-rendered shells keep Supabase tokens server-side. Do not expose private environment values or real account/row data.

## Files and outputs

Extend templates/base.html with base_public.html and base_app.html; add only needed header/footer/sidebar/mobile navigation/messages/modal/pager fragments. Build local shell icons/SVG partials with provenance, local JavaScript, and the existing Tailwind input/config.

Put fallback routing/transport coherently under apps/core/, with explicit config/urls.py/settings changes and an asset inventory. Reuse installed HTTPX; do not scaffold a generic proxy framework.

Add focused tests/scripts and produce docs/rendering/P6_ROUTE_OWNERSHIP.json, P6_ASSET_INVENTORY.md, P6_VERIFICATION.md, P6_REPORT.md and a rollback runbook. Preserve existing Auth views and data services.

## Implementation sequence

### 1. Inspect and record the baseline

Record HEAD/dirty files, checks, Django-owned URLs, manifest categories, methods and source assets. The current base.html is a P2 token fixture; P4 uses a separate inline-styled account base. Neither is the completed P6 shell.

Confirm manifest/source agreement: 25 routes, four Auth, 13 public and eight app pages. Inspect current app layouts rather than assuming every page shares Dashboard's sidebar. Use historical screenshots as accepted manual references, not successful authenticated goldens.

### 2. Build shared shells and accessible fragments

Create reusable document/head/static blocks, public Header/Footer and the supported app navigation/sidebar/mobile drawer. Preserve distinct layout needs.

Render empty/synthetic shell fixtures separately from product route ownership. Prefer test-only loopback fixtures; development preview URLs must be gated off in production, excluded from fallback and unable to bypass real app authentication.

Integrate existing account templates with shared document/static primitives only as needed. Preserve existing forms/URLs, CSRF, auth-main HTMX targeting/history protections and POST logout. Full Auth page parity is W3.

Implement semantic navigation, visible focus, skip link and selected state. One reusable modal must have initial focus, an inert background, Tab containment, Escape/backdrop policy and focus restoration. Test repeated open/close, reduced motion and fragment swaps without duplicate listeners.

Use full document navigation when entering legacy pages; do not HTMX-swap an SPA document into a Django fragment.

### 3. Finish static/icon integration and legacy asset preparation

Copy source tokens needed by the shell, including voice, subtle surfaces, margins, fonts and spacing; audit conflicts rather than changing values silently. Extend Tailwind globs to shared and app-local templates and local JavaScript. Preserve the executable/hash and meaningful CSS-token checks.

Inventory shell/fallback fonts, images, CSS URLs and icons with source/license provenance. Match Lucide paths/stroke/color, label meaningful icons and hide decoration from assistive technology. Defer page-only icon migration to P7 while recording its inventory.

Build/collect into ignored project output. For actual fallback browser checks, prefer a scratch compiled Vite build plus loopback preview with exact public asset filenames. Override root build output into a checked scratch directory under migration/django/.state/; use the existing CLI/runner workaround as needed. Never overwrite dist/client with npm run build.

Vite dev mode requires source modules/HMR. Do not solve asset loading with arbitrary /src/, /node_modules/, filesystem or WebSocket forwarding. A fake upstream proves transport tests only; a real legacy document and its assets must load before closing P6.

### 4. Define route ownership and methods

Produce a table derived from the manifest:

| Route group | Treatment |
|---|---|
| Existing Django account/Auth/API/health URLs | Django-owned, preserving precedence and behavior. |
| /login, /signup, /forgot-password, /reset-password | Excluded from fallback. Handle slash aliases deliberately using existing Django views; unsupported reset remains a bounded local denial. No invented recovery endpoint. |
| 13 public + eight app manifest paths | Eligible legacy pages until P7 explicitly assigns Django ownership. Verify GET/HEAD; no guessed SPA POST forwarding. |
| Required public legacy assets | Separate exact allowlist from a reviewed build inventory. |
| Unknown paths/reserved namespaces | Local denial, zero upstream requests. |

Preserve case, especially /AIVoiceAutoFill. Define trailing-slash behavior once. Validate raw/decoded path handling and reject malformed/ambiguous encodings, dot segments, double slash/backslash and encoded namespace bypasses.

Shell fixtures do not count as migrated product pages. Initial eligible fallback count is 21 if the manifest is unchanged; track Auth exclusions and assets/preview separately. Detect manifest/ownership drift instead of silently forwarding new paths.

### 5. Implement bounded forwarding

Fallback has a separate enable setting and exact LEGACY_ORIGIN. Missing/invalid configuration fails closed with sanitized output. Origin has no credentials, path, query or fragment; HTTP is loopback-development-only, and any future deployed origin requires explicit HTTPS configuration. Request input must never choose a host or arbitrary URL.

- Forward only exact eligible pages and verified methods. Reserved namespaces include /api, /auth, /admin, /static, /media, health/account actions and previews. Test encoded variants and lookalikes. Existing owned URLs retain their normal responses; assert zero upstream calls.
- GET/HEAD page forwarding sends no body. Other methods receive local 405 while existing Django POST actions continue working.
- Keep ordinary queries as data to the fixed origin; reject token/recovery callback parameters and never log query values.
- Allow only necessary request headers. Strip Authorization, Django cookies/CSRF material, untrusted forwarded headers, hop-by-hop and Connection-nominated fields; set Host/forwarding metadata deliberately.
- Strip upstream Set-Cookie and inappropriate connection headers. Do not install upstream cookies as Django state. Match response encoding/length to the bytes returned; HEAD has no body.
- Disable automatic redirect following. Permit/rewrite only reviewed destinations within allowed ownership; reject unreviewed origins/paths.
- Use finite timeouts and size limits; close responses/clients and sanitize unavailable/oversize/error responses.
- Refuse self-targeting origins and alias/marker loops. Set X-Legacy-Proxy: 1 on forwarded responses and log only safe path/status fields so usage is measurable.

Asset routing stays distinct from page fallback: exact inventoried public files, verified GET/HEAD, traversal/private/source-file denial and reviewed MIME/cache behavior. A filename extension is not an allowlist.

### 6. Verify coexistence, design and rollback

Capture current shell chrome/fixtures and actual fallback loading at manifest desktop 1440×900 and mobile 390×844. Preserve historical images, record source differences/missing states and do not treat proposed pixel tolerances as approved.

Check public/app fixture navigation, mobile drawer, modal keyboard/focus, static loading and existing normal-form/HTMX behavior. Compare public shell variants without migrating their bodies.

Django and legacy sessions remain independent. Django login does not authenticate the legacy SPA; protected legacy pages may require a separate legacy-origin login. No token bridge; an upstream login/loader/error is not authenticated page parity.

Make ownership reversible without deleting templates, moving source or reverting valid data. Demonstrate a test-only Django owner for a real manifest route, switch it to legacy and restore intended P6 ownership. Test disabled fallback, unavailable upstream and per-route rollback, including legacy re-login expectations.

## Required verification

Use isolated test settings, fake SDKs and loopback upstreams; no hosted Auth/data/Storage/provider write is necessary.

- Existing full Django regression suite and meaningful new rendering/fallback checks.
- Positive GET/HEAD forwarding, route counts, queries, unknown/reserved namespaces, method denial and raw/encoded bypasses, with upstream call counts.
- Header/cookie/encoding/redirect behavior, timeout/oversize failures, self/alias/marker loops, exact asset routing, disabled mode and rollback.
- Retained Auth/API/health, CSRF, identity/query-guard behavior and slash handling.
- Actual browser evidence at both viewports for shells/assets/navigation and modal focus/Escape/restoration, plus P4 form/HTMX regression behavior.
- Framework check, focused Ruff/mypy, pinned static build/token/collection checks and git diff --check. Record unrelated legacy/P4-probe typing debt separately.

From migration/django/, using the existing native runner:

~~~powershell
$storePython = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe'
$env:PYTHONPATH = (Resolve-Path .\.venv-p2\Lib\site-packages).Path
$env:DJANGO_SETTINGS_MODULE = 'config.settings.test'
& $storePython -m pytest -q -p no:cacheprovider
& $storePython manage.py check
& $storePython -m mypy apps config/settings/base.py config/urls.py
.\scripts\run_ruff.ps1 check apps config tests
~~~

Include new helpers/scripts in focused checks. Reuse static helpers and record an equivalent pinned-binary workaround if needed. Browser fixtures stay isolated from hosted settings. Follow tool network/process escalation policy; blocked checks are not passes.

## Acceptance and handoff

P6 closes only when shared shells/fragments/static integration, browser/keyboard proof, exact page/asset allowlists, protocol/denial/loop checks, retained Auth/API boundaries and rollback all pass. Missing mandatory browser or real asset evidence leaves P6 partial.

Report actual files, route owners/counts, sanitized environment, screenshots/checks, rollback steps, differences and carryovers. Update state and this brief with actual execution status.

P7, P8, deployment and legacy removal remain separate tasks. This P6 prompt does not authorize later-phase work.

## Execution result

P6 implementation completed on 2026-10-11. Shared public/app shells, fragments, static/icon integration, manifest-locked legacy fallback and exact assets are implemented. The full isolated suite, Django check, focused Ruff/mypy, pinned Tailwind build, static collection and desktop/mobile browser checks passed; see the linked execution report for exact evidence and limitations. Product page bodies remain P7 work. A fresh Vite bundle rebuild was blocked by an esbuild temporary-directory cleanup error, so browser proof used the preserved `dist/client` bundle copied to ignored scratch storage and verified by exact digest.
