> Archived P1 implementation brief. P1 was accepted with exceptions on 2026-10-10; see [P1_ACCEPTANCE.md](P1_ACCEPTANCE.md). At archive time, root prompt.md held the P2 brief; [root prompt](../../prompt.md) now tracks the latest phase. Historical completion gates below are retained as evidence and do not override the owner acceptance.

# P1: behaviour and UI baseline

## Handoff and scope

P1 review/planning was completed first. The owner reports P0 done; accept that for the handoff without claiming independent verification. Earlier P0 blocker records describe an older snapshot. Do not restart P0 recovery based solely on those records.

The user requested execution of this bounded P1 task on 2026-10-10. Implement the P1 work below and finish all independent work even if an environment or decision blocks captures. This authorization covers P1 only; it does not authorize P2, production writes, hosted setting changes, commits, pushes or deployment.

### Owner steering recorded 2026-10-10

- Q21 is answered: retain `/activitylog` as a future product feature. Keep its current route and feed in the 25-route baseline; record today's localStorage/example behavior. P1 does not implement the real activity backend.
- Work on Supabase is limited to Postgres, Storage and RLS in a confirmed isolated local or staging environment. The linked hosted project must not be changed until its isolation is confirmed. Do not guess DDL for tables whose definitions are absent from the repository.
- Defer creating/configuring an Auth test account and signed-in captures until the legacy website baseline is working. This sequencing does not waive the authenticated P1 exit gates; P1 remains incomplete until those gates are resumed and passed.
- GitHub's protected `parity-test` environment is deferred. It is needed only for the hosted GitHub capture job, not for local setup.

P1 records how the existing React/Vite and Express application looks and behaves before migration. Complete P1 before proposing P2.

## Separate folders and preserved originals

The user requires additive migration work in new folders. Keep the existing application and reference folders in their original locations until the entire migration is finished, accepted and verified through P9 and the P10 soak. P1 completion or completion of one page wave does not permit cleanup of the old files.

- migration/parity/ owns new P1 scripts, dependencies, tests and synthetic fixtures.
- migration/django/ is reserved for P2 and later Python application code, configuration, templates, static assets and application tests. Do not create or implement it during P1.
- docs/parity/ owns new route manifests, flow documentation, reviewed baselines and comparison reports.

Keep src/, server/, scripts/, public/, new pages/, page-screenshots/ and the existing Node/Vite configuration available in place so the old stack can run and be revisited for content, design, behaviour and data comparisons. Do not move them into legacy/, rename them, overwrite original screenshots or replace old application files with migrated code. Copy reference content into the new implementation where needed and record source paths and revisions.

Minimal existing-file changes allowed by a phase brief, such as ignore entries or placeholder settings, must preserve original behaviour and have a recorded diff. Folder creation does not authorize another phase. Existing SQL migration history remains append-only. Completed P0 credential/data removals are not restored by this preservation rule.

Before retiring old runtime files at P11, prove full parity, finish the accepted soak, retain a clean recoverable reference and document the cleanup scope. Keep design references, historical screenshots, documentation and comparison evidence after runtime retirement.

## Read first

Read MIGRATION_STATE.md, MIGRATION_PLAN.md, the P1 and parity sections of docs/python-migration-plan.md, README.md, package.json, src/App.tsx, scripts/screenshot.js, src/contexts/AuthContext.tsx, the Supabase client configuration, and the page/service code needed to enumerate reachable flows.

Inspect existing tests, CI, fixtures and working-tree changes before adding files. Preserve user edits. Update the planning records with the new P1 status while retaining dated historical evidence.

## Basic review findings

- src/App.tsx currently declares 25 routes: 13 public content routes, four authentication routes and eight application routes. Preserve exact spelling and case, including /AIVoiceAutoFill and /open.
- scripts/screenshot.js discovers routes from App.tsx, captures only 1440 x 900, and never creates a signed-in session. Its fallback omits /open. Preserve this script and page-screenshots/ as historical references.
- A successful SPA document response does not prove that a page rendered. Signed-in captures need route-specific content assertions so a blank page or login page cannot pass as an application screen.
- Activity and several preferences/team flows use localStorage or example data. Record their present behaviour without implementing replacement features.
- No Python parity harness or CI workflow was found during this review. The existing Supabase RLS SQL test remains a separate P0 artifact.
- Historical migrations lack definitions for template_shares, template_reviews and filled_templates. That is a provisioning gap, not evidence that the live tables are absent.

Refresh route/tooling facts before implementation; do not hardcode old counts if the source has changed.

## Entry decisions and environment

1. Carry forward the owner's P0 completion confirmation.
2. Record Q21 as answered: retain activity as a future feature. Keep all 25 current routes in the manifest; do not implement an activity table during P1.
3. First establish Postgres, Storage and RLS on a confirmed isolated local/staging target. Do not apply migrations or create buckets on the currently linked hosted project until its isolation is confirmed. Defer Auth test-account setup and signed-in captures until the legacy website baseline is working; these remain later P1 gates.
4. Confirm a verified schema reference and fixture provisioning procedure. If the missing table definitions prevent seeding, record the dependency and propose a bounded resolution. Do not invent DDL or start P5a.
5. Record Q18's visual comparison approach, masks and proposed tolerances. A proposed threshold is not an accepted threshold.

Ask only for missing decisions/access that affect the next dependent action. Continue route inventory, harness code, synthetic fixtures, offline checks and documentation while waiting. Never report blocked authenticated captures as passing.

## Implementation order

### 1. Record the baseline contract

Create docs/parity/route-manifest.json as the shared manifest. Derive its initial paths from App.tsx and check exact set equality against that source.

For each route record its category, relevant auth/data states, expected current anonymous behaviour, route-specific readiness assertions, viewports and capture identifier. Inspect page guards; do not assume every application route redirects when anonymous.

Cover public/auth pages anonymously, application pages signed in, and application pages anonymously to document current guards. Add relevant signed-in auth-page and query-driven states where the current flow requires them. Include reset-password's valid/invalid recovery states only with dedicated test identities and ephemeral sessions.

P1 checks the manifest against React and captures. Django URLconf and proxy allowlist checks are future P2/P6 work.

### 2. Prepare isolated fixtures

Use synthetic users, templates with representative form_data, shares, reviews, scheduled events, filled templates and one harmless uploaded file. Verify actual table/column/bucket definitions before preparing seeds.

Make fixture setup repeatable and scope cleanup to test-owned rows/files in the approved test environment. Do not clear tables or touch production. Fixture writes require an explicitly selected isolated target; a generic application URL does not establish that target.

Record/reset relevant localStorage deterministically between scenarios without clearing the authenticated session needed by that scenario. Keep browser contexts isolated.

Credentials come from local environment or CI secrets. Keep passwords, tokens, browser storage-state files, recovery links and real personal data out of commits, screenshots and published logs. Use elevated credentials only for test fixture setup, never in browser/application requests.

### 3. Implement Python capture and checks

Build a small Playwright-for-Python harness against the legacy Vite and Express stack. Use the existing package commands, bounded readiness waits and cleanup only for processes the harness starts.

Capture full pages at desktop 1440 x 900 and mobile 390 x 844. Fix locale/timezone and the display clock, reduce motion, disable animations, and wait for route-specific content, fonts and images. Freeze display time without invalidating Supabase token expiry, login or refresh.

Pin the browser/runtime/font environment for baseline creation and comparison. Document narrow masks for genuinely dynamic regions; do not mask whole pages, errors or missing content. Compare unmasked regions within a documented tolerance rather than requiring byte-identical PNGs.

Add meaningful checks for exact route coverage, app boot, test-account sign-in, populated signed-in route rendering, anonymous guard behaviour, and screenshot comparison. Capture console/request failures with sanitized metadata. Record existing defects instead of fixing application code.

Provider-backed voice flows may use explicitly labelled deterministic fixtures at the test network boundary. They do not prove live STT/TTS/Groq behaviour, Supabase auth or RLS. Record required live/device checks separately; do not introduce new provider code or paid live calls.

### 4. Record interactive flows

Inventory reachable modals, wizards, CRUD, sharing/review/upload, scheduling, voice and export flows from current code. For each, document fixture setup, steps, expected results and screenshot checkpoints.

Automate stable flows where practical. Record manual/device/provider-dependent steps and inaccessible flows explicitly. Do not adopt historical modal/wizard counts without checking reachability.

Keep an existing-defect backlog and intentional-difference register. Q5/Q6 preferences/team decisions remain pending for their later phase and do not block capturing current behaviour.

### 5. Add a bounded CI workflow

Add one P1 workflow with legacy lint/build, Python parity checks and the capture/comparison job. Use the same pinned visual environment as golden generation and upload sanitized reports/diffs.

Record existing lint/build failures without unrelated fixes. Separate offline checks from fixture-dependent captures. Required captures must fail or be explicitly blocked when credentials, schema, golden images or environment setup are missing; skipped captures cannot count as a green full-parity result.

Provide one documented command for fixture setup, legacy startup and matrix capture, plus commands for checks/comparison. CI configuration is in scope; changing hosted secrets/project settings or pushing/publishing is a separate external action.

## File boundaries for P1 implementation

New files may be limited to:

- migration/parity/scripts/capture_baseline.py, migration/parity/scripts/compare_screenshots.py and migration/parity/scripts/seed_parity.py
- migration/parity/requirements.txt with only pinned capture/check dependencies
- migration/parity/tests/e2e/conftest.py, migration/parity/tests/e2e/test_route_matrix.py, migration/parity/tests/e2e/test_legacy_smoke.py and migration/parity/tests/e2e/test_visual_parity.py
- migration/parity/fixtures/ for synthetic fixtures and fixture documentation
- docs/parity/route-manifest.json, README.md, flows.md and differences.md
- docs/parity/baseline/ for reviewed golden images
- docs/parity/reports/ for generated reports
- .github/workflows/parity.yml

Existing-file edits are limited to MIGRATION_STATE.md, MIGRATION_PLAN.md and prompt.md for status; the migration-status paragraph in README.md; short status/scope corrections in docs/python-migration-plan.md and docs/security-remediation.md so earlier planning claims do not contradict this handoff; .gitignore for generated reports/session artifacts while preserving existing edits; and .env.example for necessary placeholder-only P1 test settings without replacing legacy configuration. Do not otherwise edit application code, dependencies, SQL, historical evidence or Git refs.

Adapt a proposed filename to an existing equivalent after inspection and record why. Keep helpers small; do not build a general testing framework.

Application pages/components/services, scripts/screenshot.js, page-screenshots/, package.json, production data and Git refs stay outside P1 implementation. The owner's later Supabase steering permits only necessary Postgres/Storage/RLS setup on a confirmed isolated local/staging target; any SQL change must be append-only, scoped to that setup, and must not invent the missing table definitions assigned to P5a. No Django foundation, page port, auth replacement, broader schema reconciliation, activity implementation/removal, service migration, legacy relocation or deployment.

## Completion evidence

P1 can be marked complete only when:

- Q21 is recorded and the accepted manifest matches actual React routes.
- A verified isolated Supabase fixture environment supports the required Postgres, Storage and RLS states; after the legacy website baseline is working, it also supports real test-account sign-in and the required authenticated states.
- The complete route/state matrix renders expected content at both viewports; anonymous behaviour is recorded separately.
- Repeat captures in the pinned environment meet accepted visual thresholds and masks.
- Reachable interactive flows have automated checks or explicit manual scripts and screenshot checkpoints, with remaining failures resolved or specifically accepted.
- The CI workflow and documented commands run successfully; any unavailable hosted CI run remains clearly unverified.
- Sanitized reports identify source HEAD, environment, fixture revision, versions, route/state coverage, results, known defects and pending decisions.
- Existing application/reference folders remain in place and runnable; reports map each capture or migrated comparison to its original source path/revision. No old runtime folder is removed during P1.

If a gate is blocked, deliver the independent artifacts, name the exact missing input and owner, and leave P1 incomplete. Do not invent screenshots, silently shrink the matrix, treat mock authentication as real Supabase evidence, or begin P2.

## Final handoff

Report changed files, completed artifacts, checks run/results, blocked or manual checks, decision status and whether P1 meets its exit criteria. Update the migration records consistently. Prepare a P2 prompt only after P1 is accepted and the user requests the next phase.
