# P7 W2 verification

**Run:** 2026-10-12, Windows, Django `config.settings.browser` (`DEBUG=False`), Playwright Chromium 148.0.7778.96. Browser data is deterministic and synthetic.

- `/` and `/documentation` each returned HTTP 200 at 1440×900 and 390×844 (4 captures total).
- No horizontal overflow, unexpected console errors, failed requests, React root, or React bootstrap was observed.
- Three interactions passed: exact displayed-code copy, accessible clipboard-denial recovery, and keyboard-operable section navigation.
- W1 browser regression suite passed again: 22 captures, six interactions, no overflow or unexpected browser/network failures. Sensitive-query and local reset-denial probes remained local.
- Django tests: 142 passed after the final rollback additions (full suite); framework check, mypy and Ruff also passed. See aggregate [P7 verification](P7_VERIFICATION.md).

Results and screenshots: [browser-results.json](evidence/w2/post-wave-review-20261012/django/browser-results.json), [desktop](evidence/w2/post-wave-review-20261012/django/documentation-desktop.png), [mobile](evidence/w2/post-wave-review-20261012/django/documentation-mobile.png), [copy success](evidence/w2/post-wave-review-20261012/django/documentation-copy-success.png), and [copy denial](evidence/w2/post-wave-review-20261012/django/documentation-copy-denied.png). Original React references remain under [legacy](evidence/w2/legacy/).

Source reference captures predate this final run; the Django comparison used those preserved captures. W2 does not claim pixel-threshold parity because the project has no approved numerical visual-diff thresholds or masks.

## 2026-10-13 combined P7/P8 closeout

Final closeout disposition: PASS. The current W2 run recorded 4 route/page captures and 3 exercised interactions using source/page regression. Desktop 1440x900 and mobile 390x844 checks reported no overflow or unexpected browser errors. Evidence: docs/pages/evidence/w2/closeout-20261012/ The complete combined results and boundaries are in docs/pages/P7_P8_CLOSURE_REPORT.md and docs/pages/P7_P8_CLOSURE_MATRIX.md.
