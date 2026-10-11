# P7 complete page migration and P8 media bridge — master execution brief

**Updated:** 2026-10-12
**Status:** Complete. P7 W1–W7, W1 review corrections, P8, all 25 local route owners, aggregate reports and final verification were completed on 2026-10-12. The aggregate gate passed 145 tests, Django/mypy/Ruff/static checks, 50 desktop/mobile captures, 14 interactions, 12 deterministic media checks, and the hosted W5/W6 route probe with exact fixture cleanup. See [P7_REPORT.md](docs/pages/P7_REPORT.md) and [P7_VERIFICATION.md](docs/pages/P7_VERIFICATION.md).
**Scope:** One continuous task covering the seven P7 waves and the required P8 bridge. Keep the existing seven P7 wave names; P8 is a separate phase, not W8.
**Authority:** The owner authorized the complete all-wave brief. This execution record documents completion; P9–P11 remain separate phases and are not authorized here.
**Snapshot:** HEAD acba9564752f1c121b81d17f59fca4d3f2b9b0f8 plus the existing uncommitted P5/P6/P7 work. Preserve all of it.

**Execution evidence:** Current source HEAD remained `acba9564752f1c121b81d17f59fca4d3f2b9b0f8`; the pre-existing dirty tree was preserved. Final owner/view inventory is [P7_ROUTE_OWNERSHIP.json](docs/pages/P7_ROUTE_OWNERSHIP.json), and documented source-to-Django boundaries are in [P7_DIFFERENCES.md](docs/pages/P7_DIFFERENCES.md). Live speech/device, P9 release acceptance, P10 deployment/soak and P11 legacy retirement remain open.

## Objective and execution order

Finish P7's actual page migration and P8's browser media bridge using Django templates/views, the P6 shells, P4 development Auth and P5 data services. Preserve source content and reachable behavior within the revised development contracts. Build real application flows, not headings, shell fixtures or pages that silently depend on the React bundle.

Execute in this order: W1 regression hardening → W2 → W3 → W4 → W5 → W6 → P8 → W7 → aggregate verification. Check and document each stage, then continue immediately. The stage boundaries are verification checkpoints, not approval stops.

| Work package | Routes or work | Effective fallback page count after completion |
|---|---|---:|
| W1 — already implemented; harden regression checks | /terms, /privacy, /open, /about, /security, /pricing, /industries, /features, /contact, /status, /help-center | 10 |
| W2 | / and /documentation | 8 |
| W3 | /login, /signup, /forgot-password, /reset-password; public/app Auth integration | 8; all four Auth routes remain excluded from fallback |
| W4 | /dashboard and reachable overview, Team, Settings and modal flows | 7 |
| W5 | /templates; builder, uploads, CRUD, sharing, reviews and existing exports | 6 |
| W6 | /scheduler, /manage-schedules, /scheduler-settings | 3 |
| P8 — before W7 | Browser capture, codec handling, multipart transport, preview/playback and cleanup | 3 |
| W7 | /AIVoiceAutoFill, /filledtemplates, /activitylog | 0 |

P7 has 25 manifest paths: 13 public, four Auth and eight application routes. Auth routes have deliberate local implementations or unavailable-recovery states and never become legacy fallbacks. Do not invent another P7 wave or expand this task to P9–P11.

## Read and establish the baseline

1. Latest owner instructions, applicable AGENTS.md, MIGRATION_STATE.md and MIGRATION_PLAN.md, including the decision and correction registers. This master brief supersedes the old requirement for a separately authorized brief per wave; all other applicable bounds remain.
2. docs/pages/P7_W1_REVIEW.md, P7_W1_REPORT.md, P7_W1_VERIFICATION.md, P7_W1_ASSETS.md and P7_W1_ROUTE_OWNERSHIP.json. The executed W1 brief is archived as docs/pages/P7_W1_IMPLEMENTATION_PROMPT.md.
3. docs/rendering/P6_REVIEW.md, P6_REPORT.md, P6_VERIFICATION.md, P6_ROLLBACK.md and the archived P6_IMPLEMENTATION_PROMPT.md.
4. docs/auth/P4_REPORT.md, P4_CONTRACTS.md, archived P4_IMPLEMENTATION_PROMPT.md and the current accounts middleware/session/services.
5. docs/data/P5_REPORT.md, P5_CONTRACTS.md, P5_DECISIONS.md, P5_OPERATION_INVENTORY.md, P5_VERIFICATION.md and sanitized hosted proof. Use the current completed P5 contracts; older P5-era statements that P6 has not started are historical.
6. docs/services/P3_CONTRACTS.md, P3_REVIEW.md and the corrected speech/AI services. Keep source-derived mock evidence distinct from live provider evidence.
7. docs/parity/P1_ACCEPTANCE.md, route-manifest.json, flows.md, reference-inventory.json and the existing capture tooling.
8. Original src/App.tsx, all affected src/pages/*.tsx, src/components/, src/contexts/AuthContext.tsx, src/lib/templates.ts, src/lib/scheduler.ts, src/lib/activity.ts, src/services/ai.ts, tailwind.config.js and src/index.css.
9. migration/django/config/urls.py, apps/core/legacy.py, config/p6_route_ownership.json, config/p6_legacy_assets.json, scripts/p6_legacy_preview.py, apps/pages/, accounts/, templates_app/, scheduler/, storage/, voice/, speech/, ai/ and db/rls.py.
10. Relevant new pages/ design references and page-screenshots/. Preserve them in place.

Record current HEAD, dirty-tree state, runtime/settings, source/fixture revisions and the existing owner counts before edits. Review source files before porting each flow; historical inventories do not replace current code inspection.

## Bounds and established decisions

- Native Windows. Application code stays in migration/django/; P7 evidence in docs/pages/ and docs/pages/evidence/<wave>/; P8 evidence in docs/services/evidence/p8/.
- Preserve original src/, server/, scripts/, public/, new pages/, page-screenshots/, Node/Vite configuration, dist/client and historical references. Do not relocate, overwrite or retire the old runtime.
- Reuse locked dependencies, vendored HTMX and pinned standalone Tailwind. Prefer existing dependencies and small focused modules. No replacement SPA, generic CMS, broad proxy, unrelated refactor or blanket dependency upgrade.
- Preserve P4/P5 identity, CSRF, request-size, RLS, pooler, sharing and Storage contracts. Never use a service-role key for request data access or accept a submitted owner/user UUID as authority.
- No Docker, deployment/traffic switch, commit/push, history rewrite, credential revocation, broad account/data cleanup, paid/live provider calls, new email delivery, billing, reminder workers or operational admin under this brief.
- Minimal hosted verification may use the already-approved development project and synthetic accounts/records needed for Auth/RLS/Storage flows. Scope cleanup to exactly the generated fixture IDs/objects, preserve existing data and record cleanup results. Keep credentials and tokens out of output and evidence.
- New frontend pages use Django sessions, templates and local browser scripts. No browser Supabase SDK, provider secret, bearer-token bridge or tokens in HTML/localStorage. The retained React stack keeps its separate existing session behavior.
- Preserve source copy, legal/license wording, prices, contact destinations, section order and mixed branding. Record bounded accessibility corrections and source defects. Marketing claims and inactive controls do not authorize new backends.
- Preserve current service validation and source required-field behavior. Do not introduce unapproved stricter schema/business validation or silently change the accepted P5 data semantics.

Use these bounded continuation defaults, inherited from existing decisions rather than invented owner answers:

| Topic | Implementation boundary |
|---|---|
| Q5 preferences | Keep reviewed browser-local behavior and key/default semantics. No new preferences table or cross-account import. |
| Q6/Q7 team/demo flows | Preserve local/example interactions honestly; implement only real sharing/reviews already covered by P5. No teams, membership directory, email invites or demo-to-real conversion. Never claim an email/invite was delivered. |
| Q8/Q11 Auth | Keep the P4 remember-me/session limits and independent legacy/Django sessions; document expected re-login on application rollback. |
| Email recovery/OAuth | Recovery delivery and successful email reset remain unavailable; retain informative local states. No SMTP, Google/Azure OAuth or legacy-account compatibility gate. |
| Q13 scheduling | Preserve entered date/time and P5's UTC-derived date boundaries. Record midnight/offset/DST behavior. A new timezone product requires a separate decision. |
| Q16 sharing | Use existing-account UUID sharing and private per-request file authorization. No anonymous share-link route or fabricated usable URL. |
| Q21 activity | Retain the route, reviewed browser storage/example feed and current implemented controls. No activity database/backend or new Download/Continue/slider behavior. |

Routine implementation choices and explicit preservation defaults do not require another wave approval. If an essential flow genuinely requires a new schema/product decision outside these bounds, identify the exact choice once, ask concisely while continuing independent work, and do not infer an answer from silence. An unresolved required gate must remain explicitly incomplete.

## 1. Close W1 review gaps before advancing

W1's eleven page bodies and the P6 portable-fixture/malformed-redirect corrections are already delivered. Preserve them; do not redo their implementation.

1. W1-R1: make the browser comparison enforce content and destination expectations. Recorded differences alone are not a passing gate. Require intact source sections/order/text and local destinations, with an explicit allowlist for reviewed differences such as Help Center's added Search label. A negative control must fail when a section/destination is removed.
2. W1-R2: change the proxy-header assertion in tests/test_p7_pages.py from a bytes key to a string key. Include a positive control proving a present marker fails the no-proxy assertion.
3. W1-R3: test encoded-path and POST denial while rollback is still active, using the resolved rollback callback and upstream-call counter. Current negative probes run after override_settings exits.
4. W1-R4: distinguish expected browser rollback counts from measured ownership. Measure/attribute before, selected rollback and restored state; do not present hard-coded 10/11/10 metadata as observed runtime counts.
5. Preserve the historical evidence. Add dated review dispositions and corrected verification evidence. Full tests must still collect/pass without ignored compiled build output; keep synthetic transport tests independent of real bundle setup.

## 2. Extend route ownership, Auth and shared integration

- Keep the original 25-path manifest/digest/category contract. Change reviewed owners, not manifest paths, merely to declare completion.
- Extend the actual view registry and owner validation to the new public/application views. Keep protected application views separate from the public static-page factory where their principal/data boundary requires it.
- Update runtime ownership, documented snapshots, URL configuration, rollback subset validation, and the compiled preview runner together. scripts/p6_legacy_preview.py currently has a W1-specific route whitelist and must evolve with the actual registered owners.
- Generate only remaining fallback page patterns. After the last wave, normal operation has zero page fallbacks and no React bootstrap/bundle in migrated responses.
- Keep all four Auth paths excluded from fallback. Preserve existing health/API/account precedence and separate page/action/static/asset routing. Unknown/reserved/encoded paths and unsupported methods must not reach upstream.
- Extend verified-principal resolution deliberately: the current P4 middleware only authenticates selected account paths. Every protected page/action must derive authority from a verified Django session, fail safely for missing/expired/provider-unavailable sessions and enforce object access through P5.
- Integrate signed-in public navigation from verified state; never infer a user from raw session flags. Keep public pages usable anonymously and avoid unscoped data access.
- Preserve manifest slashless GET routes with deliberate slash aliases. Register form/action POST routes explicitly so a write is not redirected by APPEND_SLASH. Validate next/return destinations locally and reject open redirects.
- Use ordinary forms plus local HTMX fragments where useful, with consistent full-page fallbacks, CSRF, accessible errors and safe redirects. Never swap a full legacy SPA document into a Django fragment.
- Keep exact configuration-driven rollback for migrated public/application routes. No request/query/header selects an owner/host; no Auth route becomes rollback-eligible. Demonstrate representative public and protected-route rollback and restoration at the relevant checkpoints; document separate legacy re-login.
- Preserve the approved fixed origin, reviewed asset/document digests, header stripping, path/method validation, bounds/timeouts and fail-closed behavior. Keep the proxy disabled by default; retain rollback code/reference assets through the later P11 gate.

## 3. W2 — Home and Documentation

Sources: src/pages/Home.tsx, src/pages/Documentation.tsx, Header.tsx and Footer.tsx.

Port full bodies, sections, diagrams/example markup, code blocks, destinations and current interactive states into the public shell. Keep intended target-architecture documentation copy distinct from shipped runtime behavior. Documentation code-copy controls must copy the exact displayed block, report success only after clipboard success, handle denial accessibly and clear transient feedback.

Capture both current-source React pages and Django counterparts at 1440×900 and 390×844; check code wrapping/scrolling, keyboard navigation, clipboard states and all destinations. Preserve W1 regressions. Owner count becomes 13 public Django pages and eight legacy application fallbacks.

## 4. W3 — Auth pages and navigation

Sources: Login.tsx, Signup.tsx, ForgotPassword.tsx, ResetPassword.tsx; reuse apps/accounts/ forms/views/services/session contracts.

Migrate the current visual layout, labels, form states and usable navigation onto the accepted P4 flows: email/password signup/login, persistent-sign-in choice, verified session, logout and authenticated password change. Keep development confirmation behavior and profile initialization within accepted P4/P5 contracts.

Forgotten-password/reset pages must have explicit safe local unavailable/invalid-link states with a login path. A deliberate rendered 404/denial for reset is acceptable under the revised no-email-recovery scope; a missing view or fake successful recovery is not. Update ownership validation if its local-denial implementation changes; never forward recovery tokens through the legacy bridge.

Verify full-page and HTMX form errors, CSRF rejection, next-path safety, expired/refreshed sessions, double submission, logout, no-store/referrer policy and protected-route behavior. No OAuth activation or old-account migration. Integrate verified signed-in navigation for public/app shells without weakening anonymous public rendering. All four Auth paths remain local/excluded; fallback stays eight.

## 5. W4 — Dashboard and reachable flows

Sources: Dashboard.tsx; components/Dashboard/, Stats/, Team/ and applicable Settings views. Read the complete source control inventory in docs/parity/flows.md.

Port Home/Team/Settings views, mobile drawer, overview/cards, refresh, recent browser activity, upcoming events, quick actions and all reachable dialogs. Use profile/template/scheduler selectors for contracted real data. Implement empty/populated/error states and links into later migrated routes while preserving full navigation to routes still on fallback.

Keep preferences local within the continuation defaults. Preserve Team/example modal behavior with honest demo/unavailable outcomes for unimplemented membership/email operations. Real share/review interactions must use accepted P5 services; do not add a team or email backend from mock UI.

Check each modal's open/close, keyboard/focus, validation and actual result; verify owner-derived requests and denied cross-user IDs. Test signed-out, signed-in empty/populated, loading/error and mobile states. Fallback becomes seven.

## 6. W5 — Templates, builder, uploads, sharing and reviews

Sources: Templates.tsx; components/TemplateBuilder/ and applicable Team share/review components; src/lib/templates.ts. Reuse apps/templates_app/ and apps/storage/.

Implement list/grid, bounded search/category/sort, empty/error states, create/edit/duplicate, visibility, confirmed deletion and existing exports. Port the builder stepper, manual/upload methods, field add/reorder/remove, required-field errors and real save/edit results. Inspect actual source parsing behavior for JSON/CSV/PDF/XLS/XLSX; preserve supported paths and honestly report source limitations rather than pretending every selected format was parsed.

Use the existing private template-files bucket, allowlist/size/path rules and request-verified credentials. Do not return a public file URL. File download/replacement/delete must enforce current permissions, including access revocation and the P5 cacheNonce contract. Surface partial cleanup failures without broad deletion.

Build reachable UUID-based share/revoke/hide/role flows and review queue/request/content/status flows through P5. Respect viewer/editor/admin/owner capabilities and reviewer/owner-only visibility; never grant an admin arbitrary edit/review access. Adapt source recipient entry to the accepted UUID contract and document that difference. The anonymous generated share-link feature stays unavailable; copying a fabricated URL is not an implemented share flow.

Verify successful persistence and failure states with at least two synthetic users and unrelated-user denial, plus owner/editor/viewer/admin boundary tests. Check output bytes/content for existing template exports and modal accessibility. Fallback becomes six.

## 7. W6 — Scheduling, management and settings

Sources: Scheduler.tsx, ManageSchedules.tsx, SchedulerSettings.tsx; components/Scheduler/; src/lib/scheduler.ts. Reuse apps/scheduler/ selectors/services.

Port month/week navigation, previous/next/today, selected date, create/edit/delete modals and their validation/results. Management needs search/type/status filters, sortable columns, row status/cancel/delete, selection and the existing bulk complete/cancel/export/delete controls. Validate every selected object under the verified principal; client selection is never access authority.

Port all settings tabs, local Save/Reset, bounded JSON import/export and existing defaults/per-user browser keys. Notification/calendar/integration toggles remain local settings and must not claim a connected service or delivered reminder. Handle invalid JSON/storage errors accessibly; do not import arbitrary values into server authorization or create a preferences backend.

Preserve P5 date/time semantics; test UTC/local midnight and DST/offset fixtures to expose rather than silently correct differences. Verify owner-isolated CRUD and bulk operations, filters, confirmation/error states, exported bytes, JSON roundtrip and keyboard/mobile behavior. Fallback becomes three.

## 8. P8 — Media bridge before W7

Read P3_CONTRACTS.md, corrected speech/AI services and the mounted source path in src/services/ai.ts and AIVoiceAutoFill.tsx. Do not port dead/unmounted alternative service files.

Implement a small local browser module for microphone permission/capture, supported codec selection, chunks, stop/reset, preview/playback and error/cancellation states. Use MediaRecorder support detection and the MIME types accepted by P3; report unsupported environments honestly instead of relabeling bytes.

- Stop all media tracks on stop/reset/navigation/error. Revoke replaced/discarded object URLs and release recorder/chunk/playback resources. Handle repeated recordings and cancellation/races without stale success.
- New transcription uses multipart FormData with audio and mimeType at the existing /api/transcribe contract. Reuse current audio/envelope limits; keep MIME validation and byte caps before provider access. Retain legacy JSON/base64 input server-side until P11.
- Use same-origin Django session authorization and CSRF plus the existing public request-control marker/origin policy where required. Do not expose session/provider bearer tokens or introduce a client credential bridge.
- Reuse /api/ai/extract and /api/tts contracts, existing prompts/model settings, normalization and fallback/error semantics. Provider modes stay explicitly mocked for deterministic checks; live failure must not silently become mock success.
- Preserve current preview, transcript, chat, extraction and field-review states. Retain actual existing export surfaces/payloads only; do not add an audio-upload control or filled-form export absent from current source.
- Add deterministic browser fake-media and server mock-service tests for granted/denied/no-device/unsupported/empty/oversized capture, stop/reset, multipart, playback, provider failure and resource cleanup.

Produce docs/services/P8_REPORT.md, P8_CONTRACTS.md and P8_VERIFICATION.md with media evidence under docs/services/evidence/p8/. Record transport/resource-handling differences and a physical-device checklist. Mock/fake-media proof is not live speech/provider parity; carry those real-device/provider limitations into P9 without pretending they passed. P8's implemented bridge and deterministic end-to-end boundary must pass before W7 is complete.

## 9. W7 — Voice form, filled forms and retained activity

Sources: AIVoiceAutoFill.tsx, FilledTemplates.tsx, ActivityLog.tsx; src/lib/activity.ts; the mounted src/services/ai.ts flow. Reuse P8 media, P3 services and apps/voice/ filled/selectors/services.

Voice page: select an accessible template, record/stop/play/reset, text chat, transcription/extraction, correct source key-to-first-id/label matching, editable field review, return to chat, incomplete-form feedback and submit. Preserve conversation/data semantics and source business-validation behavior. Persist a real filled row through P5 only after success; derive owner from the verified session and recheck template access on save. Keep genuine failure feedback and prevent duplicate/stale success on retries.

Filled templates: owner-scoped empty/populated/error list, snapshots/answers, confirmed delete/result and current navigation. The source has no export control; do not invent one.

Activity: retain the reviewed browser-local/example feed, refresh/search/type/date filters and row deletion. No server activity ledger or new inactive-button behavior. Preserve existing browser data without destructive migration. Any bounded account-isolation/security change to the legacy global browser key must be documented; untrusted activity metadata must never authorize record/file access or produce unsafe HTML.

Test the full template → media/chat → extraction → field review → filled save → list/delete flow with synthetic data and deterministic providers, plus unreadable/revoked-template and cross-user denials. Capture meaningful successful app states rather than only login/loading/error screenshots. Fallback becomes zero.

## 10. Verification and deliverables throughout execution

For each wave produce docs/pages/P7_W<n>_REPORT.md, P7_W<n>_VERIFICATION.md, P7_W<n>_ASSETS.md and P7_W<n>_ROUTE_OWNERSHIP.json. Put current React and Django references under docs/pages/evidence/w<n>/legacy/ and django/. Reuse or extend the established runners without overwriting W1 or historical evidence.

Required checkpoints:
- Capture current source and Django at 1440×900 and 390×844 with a recorded source/fixture revision, time and settings. Use isolated synthetic identities/data for successful protected flows. A controlled source fixture harness must be clearly labeled; do not pass off mocked/reference-only output as hosted persistence.
- Compare full content/section order, headings, destinations, fields and meaningful interactions. Enforce reviewed differences explicitly. Inspect screenshots, fonts, overflow, console errors, failed requests and keyboard/focus behavior. Numeric pixel masks/tolerances remain unapproved; do not manufacture a score.
- Render actual migrated pages with DEBUG=False, previews off and fallback disabled or unavailable. Protected views use verified synthetic/hosted identity appropriately. No React root/bootstrap or proxy marker in normal Django page responses.
- Test anonymous and expired sessions, CSRF, method/path/query denial, next-path safety, object ownership, role boundaries and HTMX/full-page errors. Use real Supabase semantics for hosted Auth/RLS/Storage checks; label mocks separately.
- Verify runtime/documented owners and real registered views after every cutover, expected fallback counts, exact representative rollback/restoration and independent-session limitations. Keep deterministic protocol tests independent of ignored bundles.
- Run meaningful tests for newly implemented flows, then the full regression suite, Django check, focused mypy/Ruff including all new helpers/scripts, JavaScript syntax checks, pinned static build/token checks, collectstatic and git diff --check. Re-run only when subsequent changes justify it.
- Check template/schedule/settings export content and actual persistence/cleanup, not just downloaded filenames or a rendered success message.

Established native fallback runner from migration/django/:
~~~powershell
$storePython = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe'
$env:PYTHONPATH = (Resolve-Path .\.venv-p2\Lib\site-packages).Path
$env:DJANGO_SETTINGS_MODULE = 'config.settings.test'
& $storePython -m pytest -q -p no:cacheprovider
& $storePython manage.py check
& $storePython -m mypy apps config/settings/base.py config/urls.py
.\scripts\run_ruff.ps1 check apps config tests scripts
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build_static.ps1
& $storePython manage.py collectstatic --noinput
~~~

Use the established locked/offline environment; choose focused lint/type scopes for newly changed scripts if old unrelated tooling has recorded failures. Follow actual tool escalation policy for blocked required commands and report the action/reason accurately. Never claim a blocked check passed.

At the end, produce docs/pages/P7_REPORT.md, P7_VERIFICATION.md, P7_ROUTE_OWNERSHIP.json and P7_DIFFERENCES.md aggregating all seven waves and the P8 dependency. Include all 25 routes, registered owner/view, Auth/protected states, content/flow checks, backend/demo/unavailable distinctions, count progression, rollback proof, source/build provenance and remaining P9/provider/device gates.

Update MIGRATION_STATE.md, MIGRATION_PLAN.md, docs/prompt.md, root prompt.md and the session handoff with actual completion evidence. Record W1 review dispositions, all subsequent wave results and P8 status. Keep earlier reports/evidence intact and never mark unfinished work complete.

## Continue and stop rules

Once execution is requested, continue through the entire table without asking permission between waves or stopping after W2/W3/etc. A completed checkpoint is the start of the next package. Resolve routine implementation issues autonomously within the established scope and keep progress updates concise.

If a required product answer, external approval or environment dependency is genuinely missing, continue independent authorized work and state the exact remaining gate. Do not use a generic decision-register entry as a reason to stop when an explicit preservation default above covers it. Do not silently expand schema, identity, email, sharing or timezone behavior to avoid the gate.

Completion requires all seven P7 waves verified, W1 review gaps closed, P8 bridge/code/deterministic tests accepted, all 25 manifest paths handled locally under the approved Auth limits, and zero normal legacy page fallbacks. An incomplete route/flow, missing successful app evidence or unresolved required decision remains incomplete even if tests elsewhere pass.

Stop after this combined P7/P8 implementation and its aggregate verification. P9 full parity/release acceptance, P10 deployment/soak and P11 legacy removal are separate phases. Preserve P1 accepted reference exceptions, P3 live provider/device limits and P4 recovery/production/credential follow-ups.
