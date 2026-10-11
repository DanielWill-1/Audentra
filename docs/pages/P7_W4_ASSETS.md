# P7 W4 assets and provenance

The Dashboard view is `migration/django/apps/application/views.py`, with markup in `apps/application/templates/application/dashboard.html`. `static/js/p7_dashboard.js` reads and validates the legacy local recent-activity key and saves local preference state. It never makes browser history authoritative for a saved form. The page uses the P6 app shell, existing P5 profile/template/scheduler services, and existing P5 sharing/review destinations.

Current React source captures are retained under [evidence/w4/post-wave-review-20261012/legacy](evidence/w4/post-wave-review-20261012/legacy/); current Django desktop/mobile and interaction captures are under `evidence/w4/post-wave-review-20261012/django/`. No new package or remote asset was introduced.
