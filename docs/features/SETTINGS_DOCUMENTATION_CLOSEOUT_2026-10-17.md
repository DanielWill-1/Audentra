# Scheduler Settings and Documentation closeout

**Date:** 2026-10-17  
**Plan:** [Scheduler Settings and Documentation implementation plan](SETTINGS_DOCUMENTATION_IMPLEMENTATION_PLAN.md)  
**Result:** All six implementation waves are complete. Scheduler Settings remains a frontend-only browser preview; Documentation now describes the current Django application. Activity corrective findings and live-stack acceptance remain separate work.

## What shipped

### Scheduler Settings

- Reworked `/scheduler-settings` into four responsive sections: Scheduling, Calendar display, Notifications, and Connections & privacy.
- Added fictional schedule and availability previews. Duration, reminder label, working hours/days, calendar view, week start, weekend visibility, and compact density affect the local example.
- Added draft/saved state, validation, visible status and field errors, Reset, Discard, Save, Import, and Export.
- New saves use a versioned browser-storage envelope. The reader accepts the earlier raw preferences object and wrapped export format, rejects unsupported future versions, ignores retired/non-preview properties and account identity, and leaves stored values untouched on page load.
- Storage failures leave editing and preview available. A successful explicit Save is required to replace unreadable local data.
- The first-use status now correctly says local defaults are in use; it does not claim they have already been saved.
- Notifications and external connections are marked unavailable. The screen does not request permissions, call application services, create schedules, write activity, or change real scheduler behavior.

### Documentation

- Replaced the captured HTML fragment with readable native Django markup and removed Documentation's dependency on `_reviewed_source_markup()`; the separate homepage path remains in place.
- Added the user workflow, voice review steps, actual `form_data.fields` example, saved-form and five-category Activity guidance, sharing/review/schedule guides, Settings preview scope, conditional voice/data processing notes, the local PowerShell start command, and internal HTTP route reference.
- Kept the old `#quickstart`, `#pipeline`, `#schema-engine`, and `#guides` anchors and added unique anchors for the new topics.
- Added unique code-copy targets for all three examples. The controls appear only when their JavaScript handler is available; otherwise readers can select and copy the visible code manually. Copy failure gives visible recovery guidance and keyboard focus stays on the triggering button.

## Verification

### Automated checks

- Focused Django page/application checks: **47 passed** (`tests/test_p7_pages.py`, `tests/test_p7_application.py`).
- `manage.py check --settings=config.settings.browser`: no issues.
- `node --check` passed for `p7_settings.js`, `pages.js`, `p7_browser_check.cjs`, `p7_application_browser_check.cjs`, and `run_p7_browser_suite.cjs`.
- `scripts/check_static.py --verify`: passed.
- `git diff --check`: passed; Git emitted only existing LF/CRLF normalization warnings.

### Browser checks and captures

Browser acceptance used installed Chrome **155.0.8059.80** against the local Django browser settings and synthetic SQLite data at `127.0.0.1:18875`.

- Scheduler Settings passed at 1440px, 390px, 320px, and 720px CSS widths. Checks covered all preview controls, section keyboard behavior, dirty/save/discard/reset state, save and reload, both legacy import formats, identity-free export, invalid/future/oversized imports, empty workweek, validation focus, denied/corrupt/quota storage, and zero fetch/XHR service requests. The JavaScript-disabled fallback displays its explanation and working Back, Privacy, Security, and Documentation links.
- Documentation passed at the same four widths. All three code blocks copied their own displayed contents; clipboard denial showed recovery feedback; focus stayed on each copy trigger; all ten section links worked by keyboard. With JavaScript disabled, all content and in-page links remained usable, copy buttons were hidden, and the code remained manually selectable.
- The 720px CSS viewport is a reflow check approximating a 1440px desktop layout at 200% zoom. Native browser zoom itself was not automated.
- Fresh captures and JSON results: [Settings evidence](../pages/evidence/w6/settings-documentation-20261017/django/browser-results.json) and [Documentation evidence](../pages/evidence/w2/settings-documentation-20261017/django/browser-results.json).

The full-page captures include desktop, mobile, 320px narrow, 720px reflow, and JavaScript-disabled views. Documentation's browser result records `browser_cleanup: forced-after-timeout`: Chrome completed the page assertions, but its clipboard-enabled context did not shut down within five seconds. The runner records the cleanup outcome, terminates its launched browser process, writes the passing evidence, and exits successfully.

The bundled Python 3.12 environment could not initialize `_ctypes`. The focused tests and local browser server therefore used system Python 3.11 with `.venv-p2/Lib/site-packages` and the temporary Pydantic compatibility bootstrap created under `migration/django/.tmp-validation`. The repository's browser launcher could not spawn its bundled Chromium (`EPERM`); setting `P7_CHROMIUM_EXECUTABLE_PATH` let the checks use installed Chrome.

The exact focused pytest invocation was:

```powershell
$env:PYTHONPATH = (Resolve-Path '.venv-p2/Lib/site-packages').Path
& 'C:/Users/danie/AppData/Local/Programs/Python/Python311/python.exe' -c "import os,sys; p=os.environ['PYTHONPATH']; sys.path.remove(p); from pydantic import ValidationError; sys.path.insert(1,p); import pytest; raise SystemExit(pytest.main(['tests/test_p7_pages.py','tests/test_p7_application.py','-q','-p','no:cacheprovider']))"
```

## Remaining findings and scope boundaries

- The unfiltered public W2 browser run stops on `/` at its historical React text-parity assertion. Route-specific Documentation acceptance passes; the homepage was outside this plan and was not changed by it.
- The Privacy PGP browser regression did not reach its interaction checks: the archived source contract includes a “Copy PGP Key” button, while the current Django `/privacy` page has no such control or key block. The existing PGP handler at the start of `pages.js` was preserved. No claim is made here that the active Django Privacy page provides PGP copying.
- Activity findings A1 (JSON boolean/number retry equality), A2 (deleted source identity matching), A3 (UTC display consistency), and the real authenticated/concurrent PostgreSQL browser flow remain open under the [Activity review](ACTIVITY_SETTINGS_DOCUMENTATION_REVIEW_2026-10-17.md).
- No Settings API, database storage, provider connection, delivered reminders, account synchronization, or live scheduling behavior was added. Future functional Settings integration remains separate work.
