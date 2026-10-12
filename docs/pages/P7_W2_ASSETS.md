# P7 W2 assets and provenance

The Home and Documentation bodies are Django templates at `migration/django/apps/pages/templates/pages/home.html` and `documentation.html`. Both use the P6 public shell and the reviewed local application stylesheet. Documentation copy feedback and W1's Privacy clipboard interaction share `migration/django/static/js/pages.js`.

Current-source React/Vite HTML and screenshots are preserved in [evidence/w2/legacy](evidence/w2/legacy/). Django captures are in [evidence/w2/post-wave-review-20261012/django](evidence/w2/post-wave-review-20261012/django/). The built CSS is generated from the pinned Tailwind 3.4.17 executable; its verified hash is recorded in [W1 assets](P7_W1_ASSETS.md). W2 adds no remote font, icon, or JavaScript dependency.

## 2026-10-13 combined P7/P8 closeout

Final closeout disposition: PASS. The current W2 run recorded 4 route/page captures and 3 exercised interactions using source/page regression. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w2/closeout-20261012/ The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
