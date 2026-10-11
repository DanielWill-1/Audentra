# P6 review and P7 handoff

**Reviewed:** 2026-10-11  
**Snapshot:** HEAD acba956 plus the existing uncommitted P5/P6 working tree.  
**Scope:** Code/evidence review, isolated test rerun and preparation of P7's W1 brief. Runtime implementation was not changed.

## Review findings

### R1 — medium: normal tests require ignored compiled output

`migration/django/tests/test_p6_legacy.py:12–13` reads `.state/p6-legacy-build/index.html` at module import, and its asset test at line 249 reads the scratch CSS. That folder is ignored. The 115-test suite passes in this workspace because the preserved bundle copy exists, but ordinary test collection is not reproducible in a clean workspace without it.

This finding follows from the unconditional file reads and ignore rules; this review did not delete/move the scratch build to simulate absence.

**Required disposition before W1 cutover:** Use small deterministic synthetic document/asset fixtures and isolated digest records for mocked transport tests. Keep real-build/browser proof separate with an explicit setup. Verify ordinary test collection and the full suite without scratch Vite artifacts. Do not commit a compiled bundle or silently skip protocol tests.

### R2 — medium: malformed upstream redirects escape error handling

`migration/django/apps/core/legacy.py:278` parses the upstream Location with urljoin/urlsplit and reads its port. Values such as `http://[invalid` and `http://127.0.0.1:invalid/about` raise ValueError. Both cases were reproduced directly under isolated settings. The catch at line 446 covers HTTPX/network errors but not this parse error, so a malformed upstream redirect can escape as a Django server error instead of the promised sanitized denial.

**Required disposition before W1 cutover:** Catch malformed URL parsing in the redirect validation boundary, reject it locally and retain no-follow behavior. Add mocked upstream cases proving a sanitized error and no second upstream request. No broad exception suppression or expanded redirect destinations.

Both findings remained open at the time of this review. Their subsequent disposition is recorded below.

## Dated disposition — P7 W1 (2026-10-11)

W1 completed the two bounded corrections before routing the eleven pages to Django:

- **R1 closed:** Mocked transport tests now use deterministic in-memory document/assets and fixed digests. `test_p6_legacy.py` no longer reads ignored `.state/p6-legacy-build` during test collection. The complete 127-test suite passed while that directory was temporarily moved out of `.state/`, then it was restored. The separately required compiled-browser proof used the explicit loopback preview bridge.
- **R2 closed:** Malformed redirect parsing is rejected locally and the HTTPX `RemoteProtocolError` path returns a sanitized error. Mocked malformed/invalid redirect cases verify that no second upstream request is issued.

W1 also added explicit page owners and reduced the effective legacy page fallback count from 21 to 10. A selected `/features` rollback was exercised against the reviewed compiled JavaScript/CSS assets at desktop and mobile sizes; the ownership test verifies 10 → 11 → 10 and rejection of encoded paths and POST before upstream access. See the [W1 report](../pages/P7_W1_REPORT.md), [verification](../pages/P7_W1_VERIFICATION.md), and [rollback browser record](../pages/evidence/w1/django/rollback-results.json).

This disposition closes R1/R2 for the W1 cutover. W2 and later waves remain separate work and are not covered by this review.

## What P6 delivered

- Reusable base/public/app templates, header/footer/sidebar/mobile navigation, messages/modal/pager/icon fragments.
- Local shell JavaScript for native dialog focus containment, Escape/backdrop closing, focus restoration and mobile drawer behavior.
- Lucide SVG symbols with license, existing design tokens, pinned standalone Tailwind integration and app-local template scanning.
- Explicitly gated loopback DEBUG shell fixtures, separate from product page ownership.
- Disabled-by-default fixed-origin fallback for 21 manifest public/application paths; all four Auth paths excluded, reset-password locally unavailable.
- Exact four-file legacy asset inventory and reviewed document digest; GET/HEAD, raw-path validation, credential/header stripping, bounded bodies/timeouts, redirect restrictions, origin/marker checks and manifest digest lock.
- Route/assets/rollback documentation and prior desktop/mobile browser evidence.

At the review snapshot, product page bodies remained React implementations. The app shell fixture did not prove authenticated dashboard/data parity. The prior actual fallback browser pass proved the preserved bundle's document/assets load, not a fresh current-source Vite build. W1 has since migrated eleven public page bodies; the dashboard/data and later waves remain out of scope.

## Current verification versus prior evidence

| Check | This review |
|---|---|
| Full isolated Django/Python suite | 115 passed in 5.27s |
| Django system check | Passed; no issues |
| Malformed redirect helper reproduction | Both malformed host/port cases raised ValueError, confirming R2 |
| Browser results/artifact record | Inspected existing Chromium 148.0.7778.96 results at 1440×900 and 390×844; not rerun |
| Ruff/mypy/Tailwind/collectstatic | Prior P6 passes reviewed; not rerun during this documentation-only handoff |
| Hosted Auth/data/Storage/provider operations | None |

Existing browser JSON records public/app shells, modal/drawer checks, P4 invalid-form HTMX swap, actual legacy homepage and all four exact assets with successful proxy markers. Historical screenshots and source references remain preserved.

## P7 readiness work

At the review snapshot, the route lock required every public/application owner to be legacy-fallback, and the test setting P6_DJANGO_OWNED_ROUTES rendered only a DEBUG fixture. W1 has since added real explicit page owners and computed the effective remaining fallback patterns; see the dated disposition above.

The original W1 target was eleven public pages and a fallback reduction from 21 to 10; W1 has since achieved that target. W2 is planned to move the other two public pages, leaving eight application pages. W3 Auth parity does not change the fallback count because those four routes were excluded from P6.

At review time, P6's fresh Vite compile had the recorded esbuild temporary-cleanup limitation and the W1 current-source visual references were still to be captured. W1 later captured current React output from the loopback Vite development server separately from the preserved compiled fallback; see the [W1 source evidence](../pages/evidence/w1/legacy/) and [dated disposition](#dated-disposition--p7-w1-2026-10-11).

**Handoff:** The [executed W1 brief](../pages/P7_W1_IMPLEMENTATION_PROMPT.md) is archived; root [prompt.md](../../prompt.md) now covers all remaining P7 waves and P8 under the owner's combined-scope request. [P6_IMPLEMENTATION_PROMPT.md](P6_IMPLEMENTATION_PROMPT.md) archives the executed P6 scope. The later [W1 review](../pages/P7_W1_REVIEW.md) assigns four test/evidence corrections to that master preflight without reopening P6's closed findings. P1 accepted reference exceptions, P3 live provider/device evidence and P4 recovery/production/credential follow-ups remain unchanged.
