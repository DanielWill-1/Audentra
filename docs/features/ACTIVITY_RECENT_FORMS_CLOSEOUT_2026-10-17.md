# Recent Forms and Activity Log local implementation closeout

**Date:** 2026-10-17  
**Status:** Six implementation waves complete for the local stack. Hosted rollout is deferred.  
**Scope:** Saved forms only; personal activity history for forms, templates, sharing, reviews, and schedules.

**Follow-up review:** The [subsequent source review](ACTIVITY_SETTINGS_DOCUMENTATION_REVIEW_2026-10-17.md) identifies three open correctness findings: boolean/number retry comparison, a deleted-template retry wildcard, and localized timestamps labelled as UTC. This closeout records the initial implementation and its checks; it does not establish final acceptance of those cases.

## Shipped behavior

- Dashboard Recent Forms reads the five newest saved `filled_templates` summaries from PostgreSQL. It links to each exact record and has separate empty and database-error states. Browser-local examples do not supply rows.
- The saved-forms page uses bounded 25-row pagination, owner-checked record view and JSON download, and confirmed POST/redirect/GET deletion. Stored JSON types and values remain intact.
- Voice form saves carry a server-generated submission UUID across the existing chat, return, and review forms. Same-key/same-payload retries return the original record; reuse with changed content reports an error and retains entered values. The database enforces owner/key uniqueness and key immutability.
- Activity Log queries database events with server-side search, category, UTC date-range filters, stable pagination, current-access target checks, and owner-only history removal. Removing a history row leaves its business record untouched.
- Database triggers write events in the same transaction as the source action. The presentation registry exposes safe labels and allowlisted change/status/role summaries; it does not copy form answers, review comments, schedule descriptions, attendee values, transcripts, or audio.
- No unfinished drafts, resume actions, team-wide notifications, or tamper-proof audit claims are part of this release.

## Database and local operation

The local Supabase database has both forward migrations applied without a reset:

- `20261017120000_activity_recent_forms.sql` adds `activity_events`, owner-scoped RLS and grants, event capture, the saved-form backfill, and the immutable submission key.
- `20261017123000_activity_capture_completeness.sql` fixes cascade reporting, records review deletion, and preserves simultaneous status and content changes in event metadata.

`start-local.ps1` now runs `supabase migration up --local` immediately after local Supabase starts. Existing local rows are preserved. No hosted schema, credentials, production data, traffic, or deployment settings were changed.

## Verification evidence

| Check | Result | Evidence and limits |
| --- | --- | --- |
| Local PostgreSQL acceptance | Passed | [`p11_activity_acceptance.sql`](../../supabase/tests/p11_activity_acceptance.sql) ran against loopback Supabase. It creates synthetic Auth/application records, tests trigger capture, event isolation, denied direct insert/update, history removal, immutable/unique submission keys, metadata privacy, no-op updates, explicit versus cascaded deletes, factual backfill coverage, and transaction rollback; the script ends with `ROLLBACK`. |
| Django regression tests | Passed | `& '.venv-p2/Scripts/python.exe' -m pytest tests/test_p7_application.py tests/test_p5_data_layer.py tests/test_activity_presentation.py -q` uses the isolated SQLite test settings; 55 tests passed. These tests do not prove PostgreSQL RLS or trigger behavior. |
| Dashboard browser checks | Passed | [`W4 browser results`](../pages/evidence/w4/activity-recent-forms-dashboard-20261017/django/browser-results.json) covers desktop/mobile exact saved-record links, ignored localStorage examples, empty and unavailable states, and existing dashboard keyboard/navigation controls. The browser server uses synthetic middleware fixtures. |
| Saved-form and Activity browser checks | Passed | [`W7 browser results`](../pages/evidence/w7/activity-recent-forms-20261017/django/browser-results.json) covers desktop/mobile voice form selection, exact record view, JSON download, deletion, activity filters/removal, localStorage isolation, and another synthetic account's empty feed. The browser server uses synthetic middleware fixtures. |
| Python and JavaScript syntax | Passed | `python -m compileall -q apps config` and `node --check scripts/p7_application_browser_check.cjs`. |
| Ruff | Passed | Ruff checked the changed activity, application, voice, configuration, and focused test files. |
| Whitespace review | Passed | `git diff --check` reported no whitespace errors. Git printed only line-ending normalization notices for existing Windows-worktree files. |

The isolated browser checks prove page behavior; the rollback-only PostgreSQL script proves database behavior. They are complementary checks and are not represented as a real-browser save flow against the database.

## Remaining release checks

The local feature implementation is complete. These checks remain useful before calling the feature fully release-accepted or deploying it:

- Exercise concurrent final POSTs through the Django service against local PostgreSQL, including same-key/same-payload and same-key/conflicting-payload cases. The database uniqueness and immutability rules are proven; the concurrent Python request path was not stress-tested.
- Run the real local application with two authenticated browser sessions to verify save, dashboard refresh, activity refresh, and second-session persistence end to end. Current browser screenshots use isolated synthetic fixtures, while PostgreSQL identity isolation is verified separately.
- Add focused automated coverage for Activity pagination/equal timestamps, rolling 7/30-day and UTC-midnight boundaries, stale-target links, and JavaScript-disabled operation.
- Run the repository's broader static-analysis/build checks if desired. No hosted migration or deployment is authorized by this closeout.

## Start locally

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-local.ps1
```

The [P10 local runbook](../deployment/P10_LOCAL_RUNBOOK.md) documents the manual startup path and the rollback-only PostgreSQL acceptance command. The six-wave plan is in [ACTIVITY_RECENT_FORMS_IMPLEMENTATION_PLAN.md](ACTIVITY_RECENT_FORMS_IMPLEMENTATION_PLAN.md).
