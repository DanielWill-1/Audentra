# P7 W3 report: Auth pages and navigation

**Disposition:** Implemented and verified on 2026-10-12. The cumulative legacy-fallback count remains 8.

`/login`, `/signup`, `/forgot-password`, and `/reset-password` are locally owned under the accepted P4 development Auth contract. Login, signup, verified sessions, logout, password change, CSRF, and safe local `next` handling use the existing Django/Supabase Python SDK path. Public and application navigation derive signed-in state from the verified principal. No browser Supabase SDK or token bridge was added.

Forgot-password and reset states clearly say email recovery is unavailable. `/reset-password` deliberately returns a local 404 with a rendered explanation and links back to sign-in; it is not missing and does not claim a reset succeeded. OAuth and legacy React-session handoff remain unavailable. The three functional Auth pages are `django-auth-excluded`; reset is `local-404`. None can become a page fallback.

The route manifest remains at 25 paths. W3 adds no fallback reduction: W2's eight application fallbacks remain. Local browser captures cover four Auth routes at desktop and mobile sizes. Form/session/security behavior is covered by the P4 account tests and P7 protected-route tests; there were no Auth form interactions in the synthetic W3 capture itself.

See [verification](P7_W3_VERIFICATION.md), [assets](P7_W3_ASSETS.md), and [route ownership](P7_W3_ROUTE_OWNERSHIP.json).

## 2026-10-13 combined P7/P8 closeout

Recorded browser run: PASS. Full P7 acceptance is reopened by [review](P7_P8_SESSION_REVIEW_2026-10-13.md) for uncovered source-parity requirements; W6 also has a reproduced settings bug. The current W3 run recorded 8 route/page captures and 6 exercised interactions using actual Django application. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w3/closeout-20261012/django/ The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
