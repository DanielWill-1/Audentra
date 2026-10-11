# P7 W6 verification

**Run:** 2026-10-12, isolated synthetic identity/data fixture, Playwright Chromium 148.0.7778.96.

- Six captures cover the three W6 routes at 1440×900 and 390×844. Each returned HTTP 200 with no overflow, unexpected console errors, failed requests, React root, or React bootstrap.
- The Scheduler Settings browser check changes tabs and confirms the selected state. A fresh final run also parses the downloaded JSON bytes and verifies the synthetic account ID, default duration, timezone, and working days; see [final evidence](evidence/w6/final-review-20261012/django/browser-results.json).
- `tests/test_p7_application.py` verifies event filtering, owner-scoped export, and denial of a mixed selected-ID operation before delete is called. P5 scheduler tests cover service CRUD and account isolation.
- W6 source/Django text is not exact: Django labels headings with its sentence-case copy and clearly labels local-only settings, import/export, and integration states. Source React screenshots show horizontal overflow on mobile Scheduler and Scheduler Settings; Django captures do not.
- The hosted route run verifies schedule creation, management read, selected JSON export contents, route deletion, and exact fixture removal; its sanitized result is [here](evidence/w5/post-wave-review-20261012/hosted-route-results.json). DST/device-local timezone behavior and reminder delivery were not exercised. No reminder or integration service is claimed.

Evidence: [browser results](evidence/w6/post-wave-review-20261012/django/browser-results.json), [Scheduler desktop](evidence/w6/post-wave-review-20261012/django/scheduler-desktop.png), [management mobile](evidence/w6/post-wave-review-20261012/django/manage-schedules-mobile.png), [settings desktop](evidence/w6/post-wave-review-20261012/django/scheduler-settings-desktop.png), and [source comparison](evidence/w6/post-wave-review-20261012/legacy/capture-results.json).
