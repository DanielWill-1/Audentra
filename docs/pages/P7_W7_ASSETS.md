# P7 W7 assets and provenance

The three route templates are `voice_autofill.html`, `filled_templates.html`, and `activity_log.html` under `apps/application/templates/application/`. `static/js/p7_voice.js` handles form actions; `static/js/p7_activity.js` handles the browser-local activity feed; `static/js/p7_media.js` owns browser recording and preview resources. Django view calls use the existing `apps/voice/`, `apps/ai/`, and P5 template/filled-form services.

P8's media result JSON and screenshots are preserved in [services/evidence/p8](../services/evidence/p8/). W7 current-source references and Django captures are under [evidence/w7/post-wave-review-20261012](evidence/w7/post-wave-review-20261012/). No media bytes or auth tokens are embedded in the evidence.
