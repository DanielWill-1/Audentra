# P7 W6 assets and provenance

W6 templates are `scheduler.html`, `manage_schedules.html`, and `scheduler_settings.html` under `apps/application/templates/application/`; route and action handling is in `apps/application/views.py`. `static/js/p7_settings.js` stores the reviewed per-user browser settings and handles bounded local import/export. Event data stays in the existing `apps/scheduler/` selectors/services and P5 data boundary.

React source captures are under [evidence/w6/post-wave-review-20261012/legacy](evidence/w6/post-wave-review-20261012/legacy/); Django captures are in the sibling `django/` directory. No calendar, email, reminder, or third-party integration asset/backend was introduced.

## 2026-10-13 combined P7/P8 closeout

Recorded browser run: PASS. Full P7 acceptance is reopened by [review](P7_P8_SESSION_REVIEW_2026-10-13.md) for uncovered source-parity requirements; W6 also has a reproduced settings bug. The current W6 run recorded 6 route/page captures and 4 exercised interactions using actual Django application with timezone-boundary fixtures. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w6/closeout-20261012/django/ The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
