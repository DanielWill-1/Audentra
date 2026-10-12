# P7 W6 report: Scheduling, management, and settings

**Disposition:** Implemented and locally browser-verified on 2026-10-12. The cumulative fallback count is 3.

`/scheduler`, `/manage-schedules`, and `/scheduler-settings` use protected Django views. They connect to the existing P5 schedule selectors/services for event reads and writes; management includes search, type/status filters, sorting, selected-object checks, and JSON export. Settings tabs, import/export, defaults, and notification/calendar/integration toggles remain browser-local and explicitly do not connect external services or send reminders.

The P5 UTC-derived date boundaries and submitted date/time semantics remain in force. No new timezone preference or reminder worker was added. Local browser evidence covers all three routes on desktop/mobile, tab switching, and the actual downloaded settings JSON values. Django view tests cover filtering/export and denial when a selected event is not available to the verified principal. A hosted route run created one synthetic schedule through `/scheduler`, read it through `/manage-schedules`, verified the exported JSON fields, deleted it through the route, and confirmed the row was gone. Cleanup rechecked the exact schedule ID; details are in the [sanitized route results](evidence/w5/post-wave-review-20261012/hosted-route-results.json).

See [verification](P7_W6_VERIFICATION.md), [assets](P7_W6_ASSETS.md), and [route ownership](P7_W6_ROUTE_OWNERSHIP.json).

## 2026-10-13 combined P7/P8 closeout

Recorded browser run: PASS. Full P7 acceptance is reopened by [review](P7_P8_SESSION_REVIEW_2026-10-13.md) for uncovered source-parity requirements; W6 also has a reproduced settings bug. The current W6 run recorded 6 route/page captures and 4 exercised interactions using actual Django application with timezone-boundary fixtures. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w6/closeout-20261012/django/ The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
