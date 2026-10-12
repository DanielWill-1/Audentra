# P7 W7 assets and provenance

The three route templates are `voice_autofill.html`, `filled_templates.html`, and `activity_log.html` under `apps/application/templates/application/`. `static/js/p7_voice.js` handles form actions; `static/js/p7_activity.js` handles the browser-local activity feed; `static/js/p7_media.js` owns browser recording and preview resources. Django view calls use the existing `apps/voice/`, `apps/ai/`, and P5 template/filled-form services.

P8's media result JSON and screenshots are preserved in [services/evidence/p8](../services/evidence/p8/). W7 current-source references and Django captures are under [evidence/w7/post-wave-review-20261012](evidence/w7/post-wave-review-20261012/). No media bytes or auth tokens are embedded in the evidence.

## 2026-10-13 combined P7/P8 closeout

Recorded browser run: PASS. Full P7 acceptance is reopened by [review](P7_P8_SESSION_REVIEW_2026-10-13.md) for uncovered source-parity requirements; W6 also has a reproduced settings bug. The current W7 run recorded 6 route/page captures and 4 exercised interactions using actual Django application; fake media in browser and separately hosted persistence. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w7/closeout-20261012/django/ and docs/pages/evidence/w7/closeout-20261012/voice-integration-results.json The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
