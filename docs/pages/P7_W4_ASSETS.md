# P7 W4 assets and provenance

The Dashboard view is `migration/django/apps/application/views.py`, with markup in `apps/application/templates/application/dashboard.html`. `static/js/p7_dashboard.js` reads and validates the legacy local recent-activity key and saves local preference state. It never makes browser history authoritative for a saved form. The page uses the P6 app shell, existing P5 profile/template/scheduler services, and existing P5 sharing/review destinations.

Current React source captures are retained under [evidence/w4/post-wave-review-20261012/legacy](evidence/w4/post-wave-review-20261012/legacy/); current Django desktop/mobile and interaction captures are under `evidence/w4/post-wave-review-20261012/django/`. No new package or remote asset was introduced.

## 2026-10-13 combined P7/P8 closeout

Recorded browser run: PASS. Full P7 acceptance is reopened by [review](P7_P8_SESSION_REVIEW_2026-10-13.md) for uncovered source-parity requirements; W6 also has a reproduced settings bug. The current W4 run recorded 2 route/page captures and 4 exercised interactions using actual Django application. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w4/closeout-20261012/django/ The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
