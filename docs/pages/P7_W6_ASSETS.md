# P7 W6 assets and provenance

W6 templates are `scheduler.html`, `manage_schedules.html`, and `scheduler_settings.html` under `apps/application/templates/application/`; route and action handling is in `apps/application/views.py`. `static/js/p7_settings.js` stores the reviewed per-user browser settings and handles bounded local import/export. Event data stays in the existing `apps/scheduler/` selectors/services and P5 data boundary.

React source captures are under [evidence/w6/post-wave-review-20261012/legacy](evidence/w6/post-wave-review-20261012/legacy/); Django captures are in the sibling `django/` directory. No calendar, email, reminder, or third-party integration asset/backend was introduced.
