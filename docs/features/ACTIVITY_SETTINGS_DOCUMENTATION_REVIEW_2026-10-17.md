# Activity, Scheduler Settings, and Documentation review

**Date:** 2026-10-17  
**Scope:** Review the current working tree after the six Activity/Recent Forms waves, then assess `/scheduler-settings` and `/documentation` for the next change.  
**Result:** The Activity/Recent Forms implementation exists and has recorded local verification, but three correctness findings and several acceptance checks remain open. The two page refreshes are planned, not implemented.  
**Owner decision:** Improve the existing Scheduler Settings page; keep its next iteration frontend only.

This review inspected the active Django source, the two new SQL migrations, focused tests, recorded browser results, and the previous closeout. It did not rerun the application suites or apply migrations. A read-only Python check confirmed the boolean/number equality issue below. The Settings screenshot from 2026-10-13 was inspected as historical context; it is not a current browser capture.

## What the previous implementation delivered

| Area | What is present | Evidence or boundary |
| --- | --- | --- |
| Recent Forms | A bounded summary query, five dashboard records, exact saved-record links, and distinct empty/error states | `apps/voice/selectors.py` and `apps/application/views.py`; the dashboard no longer supplies browser-local sample records |
| Saved forms | Owner-scoped record lookup, JSON download, 25-row paging, confirmed deletion, and retained JSON values | `filled_templates` view, detail/list templates, and data-layer selectors/services |
| Saving | A submission UUID carried through the voice forms, database uniqueness, and a savepoint for duplicate-insert recovery | `filled_services.py` and the first feature migration; retry matching has findings A1/A2 |
| Activity | Trigger capture for all five chosen categories, owner-only read/removal, server filters, paging, and target availability checks | `apps/activity/`, Activity view/template, and both forward migrations |
| Local operation | Forward migrations applied locally without reset; the launcher now applies pending local migrations | Previous [closeout](ACTIVITY_RECENT_FORMS_CLOSEOUT_2026-10-17.md) and `start-local.ps1` |

The previous run reported **55 focused Django tests passing**, clean Ruff, and successful rollback-only PostgreSQL acceptance. The stored browser result files contain two passing W4 route contracts and six passing W7 route contracts, with no failed contract in either file. Those browser servers use synthetic middleware fixtures; they do not establish a real authenticated browser-to-PostgreSQL save flow.

Evidence: [W4 results](../pages/evidence/w4/activity-recent-forms-dashboard-20261017/django/browser-results.json), [W7 results](../pages/evidence/w7/activity-recent-forms-20261017/django/browser-results.json), [SQL acceptance](../../supabase/tests/p11_activity_acceptance.sql).

## Activity and saved-form findings

All three findings below are **P2 correctness issues**. They do not establish a cross-account data exposure. They should be resolved before describing the feature as fully accepted.

### A1. Retry comparison treats JSON booleans as numbers

**Source:** [filled_services.py](../../migration/django/apps/voice/filled_services.py), lines 53 and 94.

Both the ordinary retry and concurrent-insert recovery branches compare Python dictionaries directly. Python considers `{"answer": false}` equal to `{"answer": 0}` after JSON decoding; it also considers nested `true` equal to `1`. A same-key retry can therefore return the earlier record even though the submitted JSON type/value changed. The database uniqueness rule still prevents a duplicate, but the promised changed-content conflict is missed.

The read-only language check returned `True` for both comparisons. No database mutation was needed to establish the comparison behavior.

**Recommended correction:** Use one shared, JSON-aware comparison that distinguishes booleans from numbers, works recursively, and ignores object-key ordering. Apply it in both retry branches. Cover `false/0`, `true/1`, nested values, identical payloads, and reordered object keys.

### A2. A missing template reference matches any supplied template ID

**Source:** [filled_services.py](../../migration/django/apps/voice/filled_services.py), lines 46-53 and 87-94; [P5 schema](../../supabase/migrations/20261011100000_p5_reconcile.sql), line 144.

Deleting a source template sets the saved record's `template_id` to null. Both retry branches then treat any non-null requested template ID as matching that saved record. For example, after template A is deleted, retrying A's key and payload while naming template B returns the old A record. The ordinary retry branch returns before checking whether B exists or is accessible.

This is a service-contract defect established by the branch conditions. It is not an observed cross-account access path: the existing saved record is still owner scoped, and ordinary website selection creates a new submission key.

**Recommended correction:** If the original source identity cannot be proved, return a recoverable conflict instead of treating null as a wildcard. Keep the existing saved record viewable. Do not add a new schema field unless retrying a deleted source becomes an explicit product requirement.

### A3. Activity says UTC while JavaScript displays local time

**Source:** [activity_log.html](../../migration/django/apps/application/templates/application/activity_log.html), lines 9 and 19; [shell.js](../../migration/django/static/js/shell.js), lines 12-15.

The page says times and filters use UTC and initially renders a UTC timestamp. The same `<time>` has `data-local-datetime`, so the shared shell replaces its text with `toLocaleString()` in the browser's timezone and removes the visible UTC suffix. Users near midnight can see a different date while filtering by UTC days. JavaScript-disabled and JavaScript-enabled readers also see different time conventions.

**Recommended correction:** Keep Activity's displayed timestamps in UTC by removing its localization hook. Preserve the shared shell's behavior for other pages. Verify the same event with JavaScript enabled/disabled and a non-UTC browser timezone.

### Acceptance still outstanding

The prior implementation plan required a real authenticated save-to-dashboard-to-activity flow, a second browser session, concurrent final saves, and query-boundary checks. Those are still open. The closeout already records this limitation, but its wave table's word "Complete" should be read as implementation status, not proof that the full acceptance matrix passed.

Before final feature acceptance, resolve A1-A3 and exercise the real local stack with synthetic data. Include equal timestamps, page boundaries, 7/30-day and UTC-midnight limits, stale/revoked targets, and core operation without JavaScript. Existing passing fixture checks should remain separately identified.

## Scheduler Settings findings

| ID | Priority | Finding and evidence | Effect on the next plan |
| --- | --- | --- | --- |
| S1 | P2 | `p7_settings.js:100-105,147-151` reads/writes an account-specific localStorage key. The active scheduler script does not consume it; scheduler views construct calendar/default values independently | Define this iteration as an explicit frontend preview. Every editable preview setting must visibly affect an example on this page. Saving must not imply an account or scheduler update |
| S2 | P2 | `scheduler_settings.html:12` makes the only save/import/error status `sr-only`; `announce()` only changes that element | Add visible status, field errors, a dirty state, and success feedback as well as accessible announcements |
| S3 | P2 | The General tab has fixed active classes at `scheduler_settings.html:15`; `p7_settings.js:109-120` changes ARIA/visibility but not those classes | The selected panel, visual state, focus, and `aria-selected` must agree |
| S4 | P2 | Notifications default to enabled in `p7_settings.js:14-15`, and privacy/integration switches are editable despite no connected delivery/sync | Keep the existing truthful scope disclosure, but replace unavailable action switches with explicit capability cards. Do not prompt for notification permissions or simulate connection success |
| S5 | P3 | Working-hour validation checks syntax without ordering (`p7_settings.js:35-39`); timezone choices omit UTC and Asia/Kolkata (`:63`) | Define valid same-day preview hours; replace the unused scheduler timezone setting with read-only device context. Do not imply real event-time conversion |

The page already has useful foundations: bounded JSON import, input allowlists, account-specific browser keys, keyboard tab navigation, and storage-error handling. Preserve those protections while improving their feedback and visual design.

The separate Dashboard preferences panel is not the requested page. Its storage key and voice/AI controls should not be folded into this change.

## Documentation findings

The active page is a three-line Django wrapper around a checked-in, largely minified HTML fragment loaded through `_reviewed_source_markup()`. The source of truth for the displayed text is [content/documentation.html](../../migration/django/apps/pages/content/documentation.html), not the wrapper alone.

| ID | Priority | Finding and evidence | Effect on the next plan |
| --- | --- | --- | --- |
| D1 | P2 | The schema section advertises direct audio ingestion into a JSON Schema contract and a successful compile. Its heading says Draft-07 while the example declares 2020-12. The actual voice path uses template field definitions and application validation | Replace it with the real `form_data.fields` format and review workflow; remove the compile badge and unsupported worker/schema guarantees |
| D2 | P2 | Provider cards imply Groq is always used; `base.py:172-185` supports configured speech backends and defaults to mock modes. The page hard-codes 7.5 MiB while the current application default is 20 MiB (`base.py:133-134`) | Describe configured/mock versus cloud behavior honestly. State limits from verified configuration or direct users to the limit shown by the upload UI; do not present one provider/model/limit as universal |
| D3 | P2 | "Download full template" is an ordinary button with no download action. "Read Guide" captions are spans. Sidebar labels for installation and API reference point to sections that do not supply those guides | Use working section links and a copyable real example. Remove the inactive download. Each promised guide must contain the matching content |
| D4 | P2 | Quickstart only tells readers to find the repository runbook; the page omits the one-command launcher and meaningful Recent Forms/Activity instructions | Add a user walkthrough and a separate local-development section with the actual PowerShell command and requirements |
| D5 | P3 | A captured fragment with `mark_safe` makes ongoing content ownership harder to follow; copy JS infers the target from a surrounding section and first code block | Move Documentation to a readable native template and use explicit code-block targets. Keep the homepage's separate fragment behavior intact |

D2 is a repository/configuration mismatch finding, not a claim about the contents of the private local environment. No private provider configuration was read for this review.

## Recommended order

1. Track A1-A3 as a small corrective follow-up to Activity/Recent Forms; do not hide them in a frontend-only Settings change.
2. Implement the Settings and Documentation plan in six reviewable waves, with visible frontend scope and truthful documentation.
3. Record fresh page evidence and separately close the outstanding Activity integration checks before claiming full feature acceptance.

The next work is defined in [SETTINGS_DOCUMENTATION_IMPLEMENTATION_PLAN.md](SETTINGS_DOCUMENTATION_IMPLEMENTATION_PLAN.md). This turn changes review/planning documentation only.
