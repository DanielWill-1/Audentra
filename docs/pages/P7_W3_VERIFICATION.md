# P7 W3 verification

**Run:** 2026-10-12. Eight browser captures cover four Auth routes at 1440×900 and 390×844.

- Login, signup, and the unavailable recovery page returned HTTP 200. Reset returned its intentional local HTTP 404 and rendered the reset-link explanation.
- All captures have zero horizontal overflow and zero failed requests. The only browser console diagnostic is the expected main-document 404 for `/reset-password`.
- The displayed source-vs-Django differences are deliberate P4 decisions: recovery delivery is unavailable, OAuth is inactive, and copy explains the development boundary. Login headings also use the Django shell wording. See [captured comparisons](evidence/w3/post-wave-review-20261012/django/browser-results.json) and [P7 differences](P7_DIFFERENCES.md).
- Regression coverage includes verified/missing/unverified/provider-unavailable principals, CSRF, profile identity, and allowed/blocked `next` destinations in `tests/test_p7_application.py`; Auth service behavior remains covered by the P4 suite.

Evidence: [browser results](evidence/w3/post-wave-review-20261012/django/browser-results.json), [login desktop](evidence/w3/post-wave-review-20261012/django/login-desktop.png), [signup mobile](evidence/w3/post-wave-review-20261012/django/signup-mobile.png), [recovery desktop](evidence/w3/post-wave-review-20261012/django/forgot-password-desktop.png), and [reset mobile](evidence/w3/post-wave-review-20261012/django/reset-password-mobile.png). Synthetic fixture settings do not call hosted Auth.

## 2026-10-13 combined P7/P8 closeout

Recorded browser run: PASS. Full P7 acceptance is reopened by [review](P7_P8_SESSION_REVIEW_2026-10-13.md) for uncovered source-parity requirements; W6 also has a reproduced settings bug. The current W3 run recorded 8 route/page captures and 6 exercised interactions using actual Django application. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w3/closeout-20261012/django/ The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
