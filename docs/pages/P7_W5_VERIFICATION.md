# P7 W5 verification

**Run:** 2026-10-12, isolated synthetic identity/data fixture, Playwright Chromium 148.0.7778.96.

- `/templates` returned HTTP 200 at 1440×900 and 390×844 with no overflow, unexpected console errors, failed requests, React root, or React bootstrap.
- Browser interaction added a required field and confirmed the form JSON serialization.
- Django view tests cover template creation delegation with the verified identity, JSON export shape/content, protected-route handling, schedule-selection denial without calling delete, and share/review actions using their own record IDs.
- A fresh hosted Django route probe passed all 11 W5 checks, plus four W6 schedule checks, with three synthetic accounts over the shared pooler. W5 verified owner-only hidden templates, viewer read/no-edit, unrelated-user denial, owner-to-editor promotion, editor content persistence visible to the owner, admin share management without template-edit rights, and admin/owner revocation. No email was sent. Cleanup removed every generated share, template, schedule, account, and tracked session; see [sanitized combined results](evidence/w5/post-wave-review-20261012/hosted-route-results.json).
- File selection does not imply parsing: attached JSON/CSV/PDF/XLS/XLSX files remain private; the UI explicitly says their contents are not parsed by upload. A generated anonymous share URL is not offered.
- The browser run used one fixed synthetic principal and did not persist. The hosted check used the real Django routes and did not upload/download a Storage object. The prior hosted P5 record covers Storage/RLS contracts at the service boundary; no P7 route-level Storage transfer is claimed.

Evidence: [browser results](evidence/w5/post-wave-review-20261012/django/browser-results.json), [desktop](evidence/w5/post-wave-review-20261012/django/templates-desktop.png), [mobile](evidence/w5/post-wave-review-20261012/django/templates-mobile.png), [builder interaction](evidence/w5/post-wave-review-20261012/django/templates-builder-desktop.png). Current-source capture: [legacy](evidence/w5/post-wave-review-20261012/legacy/).

## 2026-10-13 combined P7/P8 closeout

Recorded browser run: PASS. Full P7 acceptance is reopened by [review](P7_P8_SESSION_REVIEW_2026-10-13.md) for uncovered source-parity requirements; W6 also has a reproduced settings bug. The current W5 run recorded 2 route/page captures and 2 exercised interactions using actual Django application plus hosted Storage/share/review probe. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w5/closeout-20261012/django/ and docs/pages/evidence/w5/closeout-20261012/hosted-route-results.json The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
