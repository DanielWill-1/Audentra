# P1 acceptance and P2 handoff

**Date:** 2026-10-10  
**Status:** Finalized; owner accepted with exceptions  
**Next brief at P1 close:** [P2 prompt](../foundation/P2_IMPLEMENTATION_PROMPT.md)

## Owner acceptance

The owner confirmed that the Supabase project currently configured in the private root .env is a development/testing ground, that there is no production deployment, that Docker is unavailable, and that the existing screenshots are accepted. The owner requested finalizing P1 and preparing P2. This latest instruction permits progression with the exceptions below; it supersedes the earlier requirement to finish every authenticated capture before P2.

P1 completion here means an accepted reference inventory, reviewed tooling and explicit carryovers. It does not mean the complete route/state/viewport matrix, live Auth, application RLS, interactive flows or hosted CI passed.

The archived [P1 implementation brief](P1_IMPLEMENTATION_PROMPT.md) preserves the original scope and gates. At this P1 handoff, root prompt.md contained P2 and P2 had not yet been implemented. This is historical evidence; see [current migration state](../../MIGRATION_STATE.md) for subsequent P2/P3 status.

## Reference review

- The accepted route contract matches all 25 routes in src/App.tsx: 13 public, four authentication and eight application paths.
- Q21 is accepted: retain /activitylog as a future feature. Its current localStorage/example behavior stays in the reference; its real backend is later scoped work.
- All 24 root-level PNG references were decoded, inventoried with dimensions and SHA-256 digests, and visually inspected together. See [reference-inventory.json](reference-inventory.json).
- All images are 1440 pixels wide, with varying full-page heights. There is no mobile reference set. /open has no existing screenshot.
- The /AIVoiceAutoFill, /scheduler, /manage-schedules and /scheduler-settings images show login screens. /filledtemplates shows a loading spinner. /templates shows a template-loading error. These are observations of historical captures, not successful authenticated page baselines.
- The historical home image has different landing-page copy from the current manifest heading. Historical screenshot source commits and browser/font versions were not recorded; the current HEAD does not establish their provenance.
- The owner accepts these assets for manual visual reference. Numeric pixel tolerances (1% changed pixels, per-channel delta 24) remain proposals for later automated comparison. No new golden matrix, approved masks or repeat-capture result has been manufactured.

Preserve page-screenshots/ and its legacy/ subfolder in place. The review contact sheet remains an ignored local artifact under reports/p1-final-review/. Future successful page captures must use the current source and synthetic states; do not reproduce loaders, errors or login screens as a successful application page.

## Testing environment review

The CLI link was corrected to match the hosted target in .env after the earlier metadata restoration reverted it to the tracked reference. Supabase CLI 2.109.0 can query this project's database through its Management API without Docker or a direct database password.

A read-only catalog query found **zero public application tables and zero Storage buckets**. No application rows were read, no Auth account was created, and no database/bucket/policy change was applied. See [testing-schema-summary.json](testing-schema-summary.json). Application RLS cannot be verified against an empty app schema.

The private, ignored root .env now contains PARITY_TARGET_KIND=staging and matching target URL, exact host allowlist and anon key. In this harness, staging includes the owner's hosted development/testing target. Values were not printed or committed. CLI entry points load literal PARITY_ settings privately; existing process settings take precedence. Elevated fixture credentials, test identity and fixture-write acknowledgement remain unset.

Historical migrations still lack the initial DDL for template_shares, template_reviews and filled_templates. A historical migration references the first two without creating them, so the complete history is not a proven fresh-install baseline. Storage bucket template-files and its policies are also not provisioned by the repository. Do not blindly push this migration history into the empty testing project. Application schema reconciliation/provisioning remains P5a; application ownership and Storage RLS proof remain P5b.

## Code review and verification

The review corrected the stale test that expected Q21 to remain pending, normalized the decision status to the capture gate's accepted value, required row IDs during fixture schema preflight so cleanup has a recorded identifier, and added private PARITY_ environment loading with explicit-process-value precedence.

The full capture and comparison commands remain strict: missing Auth/data fixtures, reviewed matrix goldens or accepted numeric tolerances do not become a passing full-parity result merely because P1 has been accepted for handoff.

| Check | Final result | Meaning |
|---|---|---|
| Python parity suite | 27 passed, 2 skipped | Route coverage, fixture safety, private configuration and comparator behavior checked. Both browser smoke checks skipped; no live Auth evidence |
| Private parity configuration | Passed | Target origin/anon settings match the legacy Vite configuration; no writes |
| Hosted schema catalog query | Passed | Reachable testing database; app tables and buckets absent |
| Screenshot review | 24 PNGs readable and visually reviewed | Desktop historical references; /open and mobile coverage absent |
| Legacy lint | Failed: 194 errors, 15 warnings | Existing untouched legacy debt |
| Additional TypeScript checks | Failed: app 4092 diagnostics; node and server 21 each | App configuration lacks JSX support, causing many cascading errors; node/server checks overlap. These were separate --noEmit checks, not an npm-build success |
| Legacy Vite build into ignored scratch folder | Failed | Initial subprocess permission failure; retry transformed 1593 modules but failed when esbuild could not remove its Windows temporary file. Existing dist output was preserved |
| Hosted GitHub workflow | Not run | Environment/secrets and full capture remain deferred |
| Django implementation | Not started | This handoff prepares P2 only |

The workflow action release pins were checked against the official release pages: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0), [setup-python v7.0.0](https://github.com/actions/setup-python/releases/tag/v7.0.0), and [upload-artifact v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2). This does not establish a successful workflow run. The existing lint gate remains intact.

## Accepted carryovers

| Item | Owning phase / gate |
|---|---|
| Django runtime connectivity, restricted roles and Django-only bookkeeping | P2, on the confirmed hosted testing project; no Docker prerequisite |
| Identity and authenticated page readiness | P4 development Auth passed with fresh hosted accounts under the owner's 2026-10-11 scope. Email recovery is a separate later limitation; old-account/React compatibility gates are superseded. Key retirement still needs approval; see [P4 report](../auth/P4_REPORT.md) |
| Empty app schema; missing table definitions; fresh-install baseline; Storage configuration | P5a, using verified contracts and an explicitly recorded reference/rebuild decision |
| User-scoped application queries, populated fixture assertions and Storage/RLS negative checks | P5b and data route waves; heading-only readiness is insufficient for populated-page acceptance |
| Fresh public/mobile references and /open; reconcile historical/current source differences | P6/P7 before the affected route cutovers |
| Full deterministic matrix, numeric threshold/masks, repeat captures, interactions and provider/device evidence | Continuous route-wave checks and final P9 |
| Legacy lint/type/build findings | Separately scoped legacy maintenance or recorded coexistence limitations; not incidental P2 fixes |
| Hosted capture environment and CI evidence | Optional hosted execution setup when desired; full automation evidence required before final parity claims |

These carryovers are accepted for starting P2. They must remain visible through implementation and cannot be relabeled as completed checks. P9 and P10 still require full accepted parity and soak evidence before P11 can retire legacy runtime files.

## P2 brief choices

The next brief selects the existing plan's defaults for Django state (dedicated django schema), no operational admin, and a standalone Tailwind build compatible with the legacy tokens. It specifies separate restricted state and metadata connector roles to make the two database aliases concrete. These are P2 brief choices; the owner did not separately answer every historical Q12/Q19/Q20 product question.

All new application code goes under migration/django/. Preserve src/, server/, scripts/, public/, new pages/, page-screenshots/ and the existing Node/Vite configuration through complete verification and soak.

