# P7: page migration — roadmap and W1 execution brief

**Prepared:** 2026-10-11

**Status:** P7 W1 completed on 2026-10-11; W2-W7 have not started. W1 results are recorded in [P7_W1_REPORT.md](docs/pages/P7_W1_REPORT.md), [P7_W1_VERIFICATION.md](docs/pages/P7_W1_VERIFICATION.md) and [P7_W1_ASSETS.md](docs/pages/P7_W1_ASSETS.md).

**Execution boundary:** W1 only, plus the bounded P6 review corrections below. This authorized wave is complete; stop before W2.

**Authority:** The owner later instructed execution of this prompt and confirmed “finish W1, then stop.” This record covers that W1 execution only; later waves need separate briefs and authorization.
**Snapshot:** HEAD `acba956` plus existing uncommitted P5/P6 work. Preserve it.

## What P7 delivers

P7 replaces the React page bodies with Django templates and views while preserving routes, content, interactions, data rules and visual design. It uses the P6 shells, P4 Auth and P5 services. Pages move in seven waves; untouched routes retain the controlled legacy fallback. P8 supplies the media bridge required before W7.

| Wave | Routes / work | Entry and remaining fallback page count |
|---|---|---|
| W1 — current brief | /terms, /privacy, /open, /about, /security, /pricing, /industries, /features, /contact, /status, /help-center | P6; 21 → 10 |
| W2 | / and /documentation | Accepted W1; 10 → 8 |
| W3 | /login, /signup, /forgot-password, /reset-password visual/flow migration | W2/P4; count stays 8 because all four Auth routes are already excluded |
| W4 | /dashboard and its reachable flows | W3/P5; resolve Q5/Q6/Q7 preferences/team choices; 8 → 7 |
| W5 | /templates, builder/upload/share/review flows | W4/P5; resolve Q16 share-link choice; 7 → 6 |
| W6 | /scheduler, /manage-schedules, /scheduler-settings | W5/P5; resolve Q13 timezone/preferences behavior; 6 → 3 |
| W7 | /AIVoiceAutoFill, /filledtemplates, /activitylog | W6/P8/P5; retain Q21 activity route without inventing its backend; 3 → 0 |

Each later wave needs its own concrete route/file brief and applicable decisions. Do not run W2–W7 under this W1 brief. P7 as a whole is complete only when all seven waves pass. P9 remains the full parity gate.

## Read first

1. Latest user instructions; MIGRATION_STATE.md; MIGRATION_PLAN.md P7, decision register and correction register.
2. docs/rendering/P6_REVIEW.md, P6_REPORT.md, P6_VERIFICATION.md, P6_ROUTE_OWNERSHIP.json, P6_ASSET_INVENTORY.md, P6_ROLLBACK.md and archived P6_IMPLEMENTATION_PROMPT.md.
3. docs/parity/P1_ACCEPTANCE.md, route-manifest.json, flows.md and reference-inventory.json.
4. Original src/App.tsx, src/components/Header.tsx and Footer.tsx; the eleven W1 sources listed below; tailwind.config.js, src/index.css, relevant new pages/ designs and page-screenshots/.
5. migration/django/ config/urls.py, apps/core/legacy.py, apps/core/views.py, templates/base*.html, templates/fragments/, static/js/shell.js, config/tailwind.config.cjs and static scripts.
6. P4 Auth middleware/session contracts and P5 reports. Reuse accepted services later; W1 needs no application schema changes or hosted writes.

## Bounds

- Native Windows, no Docker, deployment, commit/push, history cleanup, paid provider calls or credential actions.
- Application code belongs in migration/django/; W1 evidence in docs/pages/ and docs/pages/evidence/w1/.
- Preserve original src/, server/, scripts/, public/, new pages/, page-screenshots/, configuration and dist/client in place. Do not overwrite historical references.
- Use locked Python dependencies, vendored HTMX and pinned standalone Tailwind. No new SPA framework, broad proxy, generic CMS or dependency upgrades.
- Keep P4/P5 identity, CSRF, data-access, timezone, sharing and Storage rules. No email, subscription, payment, monitoring, team, preferences or activity backend is introduced by W1.
- Preserve source copy, legal text, license text, prices, sample labels, destinations and section order. Record source defects and accessibility differences. Do not silently rewrite mixed Audentra/VoiceForm Pro branding or unsupported source marketing claims.
- Django and legacy sessions remain independent. Keep private values server-side; no client Supabase SDK or token bridge.

## 1. Correct the bounded review findings

Before W1 route cutover:

1. **Portable fallback tests.** tests/test_p6_legacy.py currently reads ignored .state/p6-legacy-build/index.html at module import and the ignored CSS file inside a test. Replace ordinary mocked transport tests with small deterministic synthetic document/asset fixtures and isolated reviewed digest records. Keep real-bundle/browser verification separate with an explicit setup step. The normal full test suite must collect and pass when no scratch Vite build exists; do not solve this by committing a compiled bundle, silently skipping ordinary tests or weakening production digest checks.
2. **Malformed redirect handling.** apps/core/legacy.py:_redirect_target raises ValueError for malformed upstream Location URLs, which _fetch does not catch. Return a bounded sanitized denial for invalid host/port/URL parsing without following the redirect. Add focused mocked-upstream cases with zero second upstream requests.
3. Retain all existing path, method, credential/header, asset, size, timeout, Auth-exclusion and manifest-drift protections. Avoid unrelated P6 refactoring.

Record these corrections and their verification in the W1 report and add a dated disposition to P6_REVIEW.md.

## 2. Build real route ownership

P6_DJANGO_OWNED_ROUTES is a DEBUG/preview-only synthetic fixture switch. It must not become the production ownership mechanism.

The current runtime inventory loader and loopback legacy preview hard-code every public/application route as legacy-fallback and discard the owner after validation. Adapt these narrowly for reviewed Django page ownership:

- Keep the original 25-path manifest digest/category contract. Preserve its route list; migrating a page changes its owner, not the route manifest.
- Maintain an explicit exact W1 Django route/view registry and reviewed ownership records. Validate that each Django-owned row has a real registered view and that no Auth/reserved/unknown route can be assigned to fallback.
- Generate effective fallback patterns only for the ten untouched public/application paths after W1. Merely shadowing all 21 legacy patterns while claiming the fallback count decreased is insufficient.
- Keep the four Auth exclusions and existing Django account/API/health precedence. /reset-password remains local denial until its separately scoped W3 recovery decision.
- Add a bounded, exact per-route rollback mechanism for migrated W1 pages. A reviewed setting or explicit ownership change may switch selected W1 routes back to the approved legacy origin. Validate its subset; request/query/header data must never select an owner or host.
- Keep rollback recoverable when Django page code is present. Roll back one real W1 route in a test: effective fallback count 10 → 11 → 10, verify the marker/content and restore intended ownership.
- Update the runtime lock, docs ownership and preview runner together. Test invalid owners, missing views, manifest drift and preview isolation.
- Actual W1 pages must render with DEBUG=False, previews disabled, fallback disabled or upstream unavailable. A preview fixture is not a migrated page.

Use the simplest explicit routing model that supports these cases. Keep source asset serving separate from page ownership.

## 3. Record the W1 source/flow baseline

| Route | Original source | Behavior to preserve |
|---|---|---|
| /terms | src/pages/Terms.tsx | Full legal wording, headings, dates and links |
| /privacy | src/pages/Privacy.tsx | Full notice/retention table, TOC anchors, public fingerprint block and clipboard feedback |
| /open | src/pages/Open.tsx | Complete rendered Apache license text, attribution, repository/license links |
| /about | src/pages/About.tsx | Content sections, project links and contact link |
| /security | src/pages/Security.tsx | Existing content/cards/claims; migration does not implement claimed infrastructure |
| /pricing | src/pages/Pricing.tsx | Plans, values, FAQ and currently inactive CTA controls |
| /industries | src/pages/Industries.tsx | Industry sections and existing inactive CTA |
| /features | src/pages/Features.tsx | Content, illustrative preview and working destination links |
| /contact | src/pages/Contact.tsx | Current contact information, mailto/tel links and content; no contact-form backend |
| /status | src/pages/Status.tsx | Static sample services/incidents, Sample Page label and inactive subscription controls |
| /help-center | src/pages/HelpCenter.tsx | Sample Data label; title search + category filtering, count and no-match state; article/voting/quick-action controls are currently inactive |

Inspect every source before porting. Source headings must agree with the manifest or receive an explicit documented discrepancy. Inactive source buttons must not gain fake success, email delivery, checkout, monitoring or article APIs. Preserve existing behavior and record defects rather than inventing missing products.

Historical screenshots are manual references. Mobile and /open historical references are missing, and some current pages differ from historical copies. Capture the current React W1 pages at 1440×900 and 390×844 before cutover, including interactive filter/copy states. Save new references separately.

A direct loopback Vite development origin may be used for current-source reference captures; that does not authorize forwarding source/HMR endpoints through Django. Attempt any fresh compiled build only into checked ignored scratch storage. If esbuild cleanup still fails, record it and distinguish the old preserved bundle used for fallback from current-source captures. Do not claim current-source parity from the old bundle.

## 4. Port the eleven page bodies

Prefer a small pages app with views/URLs and app-local templates, for example apps/pages/views.py, urls.py and templates/pages/*.html. Add it to settings only as needed.

- Extend base_public.html; reuse shared header/footer/icons. Add page-specific blocks only when required. No copy of React mounting/bootstrap logic.
- Preserve semantic section hierarchy, readable legal/license wrapping, current desktop grids/spacing and source-specific styles. Copy only required missing tokens from tailwind.config.js, including headline-h2/mobile families and sizes where used.
- Add local Lucide symbols with retained license/provenance for W1 icons. Keep decorative icons hidden from assistive technology.
- Render public anonymous navigation consistently. Current P4 middleware authenticates only selected account paths, so do not assume request.user is verified on arbitrary public routes or trust raw session/token flags. Record signed-in public-header integration as an explicit W3 follow-up unless a later brief expands that scope.
- Privacy: copy the exact displayed source block; show success only after clipboard write succeeds, handle denial accessibly and clear transient feedback. Keep TOC links and focus usable.
- Help Center: preserve source title-only, case-insensitive search combined with category selection. A normal GET form must work without JavaScript; optional HTMX enhances results/count and selected state with bounded local rendering. Validate category/query inputs, autoescape query text and test empty, matching, no-match, combined and reset states.
- Preserve full document navigation into untouched legacy pages. Do not HTMX-swap an SPA document into a Django fragment.
- Fix clipping/overflow and unlabeled inputs where needed, recording them as bounded accessibility differences. In particular inspect Help Center's fixed sidebar layout on mobile.
- Preserve canonical slashless W1 routes with deliberate local slash aliases. GET/HEAD work; reject unsupported write methods locally. Keep malformed/encoded paths from reaching upstream.
- Public rendering needs no hosted Auth, database, Storage, provider or external-write probe. Use synthetic/mocked states in tests.

## 5. Verification and evidence

Produce docs/pages/P7_W1_REPORT.md, P7_W1_VERIFICATION.md, P7_W1_ROUTE_OWNERSHIP.json and P7_W1_ASSETS.md. Include a per-route content/interaction/difference table and source/build provenance.

Required evidence:

- All eleven actual Django page routes render full content with DEBUG=False and preview/fallback off; no React root/bootstrap/bundle or X-Legacy-Proxy marker.
- Runtime/documented owners agree: 11 migrated public pages, ten effective fallback pages, four Auth exclusions; assets/previews are separate.
- Unmigrated routes retain exact fallback behavior. Unknown/reserved/encoded paths and unsupported methods yield zero upstream calls. Existing Auth/API/health/CSRF regressions remain green.
- Legal/license text and destinations remain intact; no missing sections or invented endpoints.
- Help Center search/category/count/no-match/reset work with normal requests and HTMX where added. Query input is escaped. Privacy clipboard success/denial, anchor navigation, keyboard/focus and navigation destinations work.
- Screenshots and inspected comparisons for all eleven routes at both viewports, plus meaningful interaction states, under evidence/w1/legacy/ and evidence/w1/django/. Record font loading, overflow, console/request failures and intentional differences. Existing proposed pixel tolerances/masks remain unapproved; do not manufacture a numeric parity pass.
- Effective per-route rollback and restoration demonstrated with actual page ownership and approved compiled fallback.
- Full isolated pytest suite, Django check, focused Ruff/mypy including new modules/helpers, pinned static build/token checks, collectstatic and git diff --check pass.
- Ordinary automated tests pass without ignored legacy build output. Real compiled-bundle browser proof has a documented setup and remains distinct from synthetic protocol tests.

Use the established native runner from migration/django/:

~~~powershell
$storePython = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe'
$env:PYTHONPATH = (Resolve-Path .\.venv-p2\Lib\site-packages).Path
$env:DJANGO_SETTINGS_MODULE = 'config.settings.test'
& $storePython -m pytest -q -p no:cacheprovider
& $storePython manage.py check
& $storePython -m mypy apps config/settings/base.py config/urls.py
.\scripts\run_ruff.ps1 check apps config tests
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build_static.ps1
& $storePython manage.py collectstatic --noinput
~~~

Include newly added scripts in the focused checks and use loopback browser runners. Follow tool escalation policy if a required command is sandbox-blocked; blocked checks remain blocked.

## Acceptance and stop

W1 is complete when all eleven real page bodies, source interactions, desktop/mobile evidence, owned-route/fallback counts, review corrections and per-route rollback pass. The results and limits are recorded in the linked W1 report and verification record; do not infer a numeric pixel-parity score.

Update MIGRATION_STATE.md, MIGRATION_PLAN.md, docs/prompt.md, this prompt and the P6 review dispositions with actual results. Preserve P1 accepted reference exceptions, P3 live speech evidence and P4 recovery/production/security follow-ups.

Stop after W1. Report its completed routes, differences, checks, fallback count and next W2 scope. Do not start later waves, P8, deployment or legacy removal under this brief.
