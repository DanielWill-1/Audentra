# P7 W1 verification

**Date:** 2026-10-11  
**Scope:** W1 only. W2-W7, P8, deployment and legacy removal were not started.

## Automated checks

The full Django test suite passed with the ignored compiled fallback bundle temporarily moved out of `.state/`. This proves ordinary test collection and tests do not depend on that generated bundle; the bundle was restored after the run.

| Check | Result |
|---|---|
| `python -m pytest -q -p no:cacheprovider` (Python 3.12, test settings) | 127 passed in 5.51s, with `.state/p6-legacy-build` absent |
| `python manage.py check` | No issues |
| mypy over `apps` and the changed settings/URL modules | No issues in 66 source files |
| Ruff over `apps config tests scripts/p6_legacy_preview.py` | All checks passed |
| Node syntax checks for `p7_browser_check.cjs` and `p7_capture_react.cjs` | Passed |
| `scripts/build_static.ps1` after the final W1 template/icon changes | Passed; pinned Tailwind 3.4.17 digest verified |
| `python manage.py collectstatic --noinput` | 1 file copied; 7 already current (including the new Lucide license notice) |
| `git diff --check` | Passed; Git reported only configured LF-to-CRLF notices |

The exact Tailwind SHA-256 is recorded in [P7_W1_ASSETS.md](P7_W1_ASSETS.md). No hosted data writes were part of W1.

## Current React source and Django page captures

The current React pages were captured from the loopback Vite development server before cutover at 1440x900 and 390x844. The source screenshots, HTML and measurements are in [legacy evidence](evidence/w1/legacy/), with summary metrics in [capture-results.json](evidence/w1/legacy/capture-results.json).

The Django run used `DEBUG=False`, previews disabled, legacy fallback disabled and no rollback routes. All eleven routes returned successfully at both target viewports (22 captures). There were no console errors, failed requests, missing captured local link destinations, missing source text tokens, or horizontal overflow. Local page/static assets returned 200 and Hanken Grotesk loaded. Normalized page text matched in 20 of 22 captures; the only difference in the remaining two is the added visible `Search` submit button on Help Center, documented as an intentional accessible/progressive-enhancement improvement. No pixel-parity score is claimed; approved numeric tolerances and masks do not exist.

The source React Help Center overflowed horizontally by 155 pixels at 390px. The Django Help Center has no horizontal overflow and stacks its categories and results on mobile.

Browser evidence and state checks:

- [Django route, text, link, font and asset results](evidence/w1/django/browser-results.json)
- [Privacy clipboard success](evidence/w1/django/privacy-copy-success.png) and [denial](evidence/w1/django/privacy-copy-denied.png)
- [Privacy keyboard TOC navigation](evidence/w1/django/privacy-desktop.png)
- [Help Center default](evidence/w1/django/help-center-default.png), [combined search/category](evidence/w1/django/help-center-search-category.png), and [no results](evidence/w1/django/help-center-no-results.png)

Automated route tests also cover category-only results, no-match/reset, slash aliases, sensitive query rejection, unsupported methods, encoded-path denial and the local `/reset-password` 404.

## Compiled fallback rollback

The selected `/features` route was rolled back through the real, preserved P6 compiled bundle using the explicit loopback preview bridge. Desktop and mobile browser captures show the React root, reviewed page heading, successful JavaScript/CSS requests with `X-Legacy-Proxy: 1`, and no console errors, failed requests or overflow. See [rollback browser results](evidence/w1/django/rollback-results.json) and [desktop](evidence/w1/django/features-rollback-desktop.png)/[mobile](evidence/w1/django/features-rollback-mobile.png) screenshots.

The browser-only rollback preview used `DEBUG=True` because this fixed-origin bridge permits HTTP only for loopback in DEBUG. The regular Django page run above used `DEBUG=False`. The ownership test proves the effective fallback page count changes 10 → 11 → 10 and is restored. It also proves encoded rollback paths and POST requests are rejected before any upstream request.

## Limits and next boundary

The compiled fallback proof is separate from the current-source Vite baseline. The pre-existing fresh Vite production-build cleanup limitation remains documented in the P6 evidence; no claim is made that a new production bundle was built. W1 does not implement the claims or inactive controls shown on marketing/status/help pages as backends. The anonymous shared public header remains a W3 integration follow-up.

## 2026-10-12 regression disposition

The complete [W1 review corrections](P7_W1_REVIEW.md#dated-disposition--2026-10-12) now pass. A fresh Django browser run captured 22 viewports and six interactions in [post-wave-review-20261012](evidence/w1/post-wave-review-20261012/django/). It reused the preserved React source references. The current route-ownership rollback test also covers the protected `/dashboard` path and restoration; its transport response is synthetic MockTransport evidence, separate from the preserved compiled `/features` browser proof. Aggregate test/build/browser evidence is in [P7_VERIFICATION.md](P7_VERIFICATION.md).

W1's functional implementation is delivered. The later [W1 review](P7_W1_REVIEW.md) found four assertion/evidence gaps without reproducing a runtime failure. They are assigned to root [prompt.md](../../prompt.md), which now covers all remaining P7 waves plus P8 continuously when execution is requested. W2-W7/P8 have not started; the original W1-only brief is archived.
