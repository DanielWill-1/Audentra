# P7 W3 assets and provenance

Auth forms and views remain in `migration/django/apps/accounts/`; the protected and public shells are `templates/base_app.html` and `templates/base_public.html`. P4 session middleware, session storage, CSRF, and provider client are reused. Application view access checks derive authority from the verified `SupabaseUser` and fail closed.

React/Vite reference screenshots and markup are preserved under [evidence/w3/legacy](evidence/w3/legacy/). Synthetic, no-network Django captures are under [evidence/w3/post-wave-review-20261012/django](evidence/w3/post-wave-review-20261012/django/). Recovery implementation does not accept or forward reset tokens.

## 2026-10-13 combined P7/P8 closeout

Recorded browser run: PASS. Full P7 acceptance is reopened by [review](P7_P8_SESSION_REVIEW_2026-10-13.md) for uncovered source-parity requirements; W6 also has a reproduced settings bug. The current W3 run recorded 8 route/page captures and 6 exercised interactions using actual Django application. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w3/closeout-20261012/django/ The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
