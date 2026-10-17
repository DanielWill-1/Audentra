# Activity Log and Recent Forms implementation plan

**Date:** 2026-10-17  
**Review baseline:** `4fdd632` plus the existing local launcher, README, and arrow fixes in the working tree.  
**Status:** Six implementation waves completed against the local stack. Two additive Supabase migrations are applied locally without reset. See the [implementation closeout](ACTIVITY_RECENT_FORMS_CLOSEOUT_2026-10-17.md) for test evidence and any release checks still open. Hosted schema changes and deployment remain deferred.

**Subsequent review:** Three correctness findings and uncompleted integration checks are tracked in [the follow-up review](ACTIVITY_SETTINGS_DOCUMENTATION_REVIEW_2026-10-17.md). Completed implementation waves do not mean every item in the acceptance matrix below has been verified.

## 1. Confirmed scope and expected result

The owner selected:

- **Recent Forms: saved forms only for the first release.** No persisted drafts, cross-device resume, or “In Progress” records in this release.
- **Activity Log: forms, templates, sharing, reviews, and schedules.** Record actions that the application actually supports and successfully saves.

After implementation, saving a filled form must produce a real saved record, place that exact record in Dashboard Recent Forms, and add a real activity entry. Reloading, signing in through another browser, or clearing browser storage must preserve both features. A new account must show honest empty states.

Recent Forms and Activity Log have different sources: Recent Forms reads saved records; Activity Log reads activity events. Removing a history entry must not remove a saved form or change which saved forms appear on the dashboard. Deleting a saved form must remove it from Recent Forms and record the deletion.

Recommended product rules for this release:

- Use a **personal history of the signed-in user's actions**. A recipient does not receive another person's sharing or review events as an inbox notification. A team-wide feed would be a separate feature.
- Retain the current visual structure and Django templates. Use normal server-rendered forms and links, with small JavaScript enhancements where useful.
- Allow “Remove from activity” for the user's own entries. This is a removable product history, with no compliance-audit or tamper-proof claims.
- Keep entries until the owner removes them or the account is deleted. A retention worker or automatic expiry policy is outside the first release.
- Provide an exact-record view and a **JSON download** for saved forms. PDF generation and editing completed forms are outside this release.
- Exclude page views, downloads, chat messages, microphone operations, profile changes, team invitations, and browser-only preferences from event capture.
- Keep deployment and hosted schema/data changes deferred. Implement and verify against the local stack first.

## 2. What the repository currently does

| Area | Current evidence | Implication |
| --- | --- | --- |
| Activity Log | [`p7_activity.js`](../../migration/django/static/js/p7_activity.js) seeds seven examples, stores them under an account-specific localStorage key, and filters/deletes them in the browser. Download/Continue controls are unavailable. | No server activity persistence or real action capture exists in this feature. |
| Activity page | [`activity_log.html`](../../migration/django/apps/application/templates/application/activity_log.html) explicitly describes the local feed. The `activity_log` view supplies only an activity storage key. | Both the view and template must receive real rows and actual filter results. |
| Dashboard Recent Forms | [`p7_dashboard.js`](../../migration/django/static/js/p7_dashboard.js) reads that localStorage feed or creates fallback examples. Rows lack saved-record IDs; View and Resume open generic pages. | Replace the source and actions, and remove the draft/resume promise. |
| Dashboard queries | `dashboard` in [`application/views.py`](../../migration/django/apps/application/views.py) reads profiles, templates, and schedules; it does not query filled forms. | Add a bounded saved-form summary query. Keep its failure separate from other dashboard sections. |
| Saved forms | [`filled_services.py`](../../migration/django/apps/voice/filled_services.py), [`selectors.py`](../../migration/django/apps/voice/selectors.py), and [`models.py`](../../migration/django/apps/voice/models.py) already save, list, fetch, and delete real owner-scoped `filled_templates` rows. | Reuse these records and services. A second saved-form table is unnecessary. |
| Saved-form UI | [`filled_templates.html`](../../migration/django/apps/application/templates/application/filled_templates.html) lists full answers; its view requests up to 250 rows. No exact-record view or filled-form download is wired into the UI. Its truthiness-based `default` filter can show `false` and `0` as “N/A.” | Add precise record links, bounded paging, owner-checked download behavior, and accurate value rendering. |
| Voice save | `voice_autofill` saves through `save_filled` and redirects to the list. Each save currently generates a fresh UUID. | Preserve a submission key across a fill session so retries cannot create duplicate records and activity. |
| Real mutations | [`templates_app/services.py`](../../migration/django/apps/templates_app/services.py) and [`scheduler/services.py`](../../migration/django/apps/scheduler/services.py) already centralize actual mutations. | Capture persisted changes at the database boundary, including existing bulk-share operations. |
| Data protection | [`rls.py`](../../migration/django/apps/db/rls.py) verifies the principal, opens one Supabase transaction, sets transaction-local claims, and assumes `authenticated`. Public application models are unmanaged. | Extend this pattern. Supabase forward SQL migrations own the new public data schema. |
| Route authentication | [`accounts/middleware.py`](../../migration/django/apps/accounts/middleware.py) matches known paths exactly. [`accounts/views.py`](../../migration/django/apps/accounts/views.py) also restricts login return routes. | Keep detail/download actions on existing protected paths for this release. A new nested route would require additional authentication integration. |
| Existing checks | [`browser_middleware.py`](../../migration/django/config/browser_middleware.py) supplies synthetic browser fixtures; [`p7_application_browser_check.cjs`](../../migration/django/scripts/p7_application_browser_check.cjs) explicitly asserts example/localStorage behavior. | Update current test fixtures/contracts to the new feature. Historical P7/P9 evidence remains a record of the old accepted scope. |

The reviewed SQL baseline and migrations define `filled_templates`, templates, shares, reviews, and schedules, with no activity event table. Saved forms already preserve `template_name` when their source template is removed. Their current answer keys are the stored record; do not reinterpret old answers against a template's latest field definitions.

## 3. Data and capture design

### Recent Forms

Use `public.filled_templates` directly. Fetch only `id`, `template_name`, and `created_at` for the five most recent rows belonging to the verified user. Sort consistently by `created_at DESC, id DESC`; avoid loading answer JSON for a dashboard summary.

Display the stored template name, saved time, a “Saved” badge, and an exact-record View link. Remove “Resume,” “In Progress,” and sample-person names from the current browser implementation. The existing View all forms link continues to open `/filledtemplates`.

### New activity table

Add `public.activity_events` in a new forward Supabase migration. Preserve existing migrations and the historical baseline file.

| Field | Planned contract |
| --- | --- |
| `id` | Database-generated UUID primary key. |
| `user_id` | The verified actor and owner of this personal feed entry; references Auth users with account-deletion cleanup. |
| `event_type` | A constrained value from the registry below. |
| `entity_kind`, `entity_id` | The source record type and UUID. Do not cascade-delete history when an application record is removed. |
| `related_template_id` | Optional template UUID needed to open the existing sharing/review workspace. Treat it as a reference, not a permission grant. |
| `label` | Bounded snapshot of the template or schedule title, at most 200 characters. Never derive titles from filled answers. |
| `metadata` | A small object, capped at 2 KiB, with allowlisted status/role/change-category/source codes only. |
| `occurred_at` | Database-assigned UTC timestamp. Historical saved-form import uses the record's actual `created_at`. |

Index owner/time/ID for the feed and owner/event-type/time/ID for filtering. Enforce one `form_saved` entry per user and saved-form UUID so the historical import and live capture cannot duplicate one another.

Enable RLS. Grant `authenticated` only owner-scoped SELECT and DELETE on activity rows. Do not grant direct INSERT or UPDATE, and do not expose a generic “create activity” endpoint. Revoke public/anonymous access and follow the existing restricted-role model; no service-role credential is added to the web app.

Add a small unmanaged `apps.activity` Django app for the model, selectors, safe event presentation, and owner-scoped history removal. Register it in settings and the database router's `data_apps` set. All application access continues through `rls_context` on the `supabase` alias.

### Capture successful changes in the same transaction

Use database triggers on the existing business tables. The repository already uses guarded database functions and transaction-local identity, so this provides an atomic event alongside the successful write and covers bulk operations without a second transaction or worker.

Trigger functions must use a fixed search path, fully qualified references, a narrow event registry, and `auth.uid()` for the actor. Revoke callable function privileges as appropriate. Do not accept actor IDs, event text, or timestamps from browser requests. Skip setup/system writes that lack a verified actor.

The business write and its event commit together. If activity insertion fails, the database action rolls back and the existing application error path reports a safe failure. Keep trigger work small: no network calls, provider calls, answer copying, or external Storage operations.

| Category | Event types | Source and precise rule |
| --- | --- | --- |
| Forms | `form_saved`, `form_deleted` | Filled-form INSERT and direct DELETE. Saving a form is the completion represented here; do not invent a duration. |
| Templates | `template_created`, `template_updated`, `template_deleted` | INSERT, meaningful editable-content/visibility/file-reference changes, and direct DELETE. Ignore timestamp-only/no-op updates. Duplicating a template is a real new template creation. |
| Sharing | `template_shared`, `share_role_changed`, `template_unshared` | Share INSERT, actual role change, and direct share removal. Ignore recipient `is_hidden` preferences. A bulk share produces one entry per persisted share record. |
| Reviews | `review_created`, `review_updated`, `review_status_changed`, `review_deleted` | Review INSERT, meaningful rating/comment changes, decision-status changes, and direct deletion. Cascaded review deletion is not reported as a user action. Both current request-review and create-review paths create pending rows, so use an honest generic creation event rather than infer an unsupported distinction. |
| Schedules | `schedule_created`, `schedule_updated`, `schedule_status_changed`, `schedule_deleted` | INSERT, meaningful content update, status change, and direct DELETE. Prefer one status-change entry when status and content change in the same update. |

Store only change categories for template updates, and allowlisted role/status values for sharing, review, and schedule events. Exclude comments, descriptions, attendees, form answers, transcripts, audio, tokens, signed URLs, and Storage object paths.

Handle cascades explicitly: deleting a template should create its template-deletion event, without fabricating individual unshare/review actions for cascaded child rows. Account deletion must not create replacement activity or block cleanup. A filled form's source-template reference becoming NULL is not a form edit event.

### Existing records and browser data

Perform a one-time, idempotent import of **existing saved-form facts only** into `form_saved` events, using each real row's owner, saved template name, and actual creation timestamp. Mark this source in allowlisted metadata. Do not reconstruct old updates, deletions, or review decisions from current table state.

Do not upload or import localStorage examples. Stop reading and seeding the old activity keys. Leave unrelated browser preferences and cloud-consent storage working.

### Retry-safe form saving

Add nullable `submission_key` to `filled_templates`, with uniqueness scoped to the owner for non-NULL values. Existing rows remain valid. Protect the key from later mutation through the existing filled-record guard.

Generate a fresh key for a new fill session, preserve it through chat/review/return form submissions, and submit it on final save. Keep this within the current HTML form workflow; it does not create a draft record.

The save service must return the existing record when a retried key has the same template and saved values. Reuse with different content must return a recoverable conflict while retaining the submitted values. Handle concurrent duplicate submissions using the database uniqueness constraint and a savepoint; disabling a button alone is insufficient. Preserve existing programmatic callers with an optional key, while the website always supplies one.

After a successful save, redirect to the exact saved record. A genuine new filling session receives a new key and may intentionally create another saved record.

## 4. Page behavior and URLs

Keep these operations on the current authenticated routes, with query parameters and CSRF-protected POST actions.

| Operation | Planned entry point | Required behavior |
| --- | --- | --- |
| Saved-form list | `/filledtemplates?page=...` | Owner-scoped, 25 rows per page, deterministic order, real empty/error states. Preserve the existing page's purpose and visual style. |
| Exact saved record | `/filledtemplates?record=<uuid>` | Use `get_filled`; render a dedicated detail template with the stored name, timestamp, and answer values. Missing/unrelated records return the same safe 404 behavior. |
| JSON download | `/filledtemplates?download=<uuid>` | Reauthorize the exact record, return its actual saved JSON with a safe filename, `no-store`, and download response headers. Preserve false, zero, empty, and nested JSON values. |
| Saved-form deletion | Existing POST to `/filledtemplates` | Keep CSRF and owner enforcement. Use POST/redirect/GET with a fixed notice code; update the list/dashboard from the database on the next request. |
| Activity | `/activitylog?q=...&type=...&range=...&page=...` | Query real owner-scoped events and render rows on the server. |
| Remove activity entry | POST to `/activitylog`, action and event UUID | Remove only that user's event. Confirm “Remove from activity,” preserve validated filter parameters on redirect, and keep the underlying business record. |

Reject malformed UUIDs and conflicting record/download parameters consistently. Downloads must contain record data only, with no Auth credentials or provider details. Reuse `_json_download` where appropriate. In list/detail rendering, distinguish an absent or null value from a valid `false`, `0`, or empty string; preserve stored JSON types in export.

Activity filters retain search and date controls, with real category choices: Forms, Templates, Sharing, Reviews, and Schedules. Bound search to 120 characters; validate category, range, and page values. Use 25 entries per page and stable timestamp/ID ordering. Search protected labels and event labels, not answer JSON or free-form comments.

Use the existing application UTC convention for server date-range boundaries and explicitly label it. “Last 7 Days” and “Last 30 Days” must mean those exact rolling intervals, rather than a calendar month. Display timestamps through the existing time element/local-display mechanism, with an unambiguous UTC fallback. Include midnight and timezone-boundary cases in verification.

Filtering, pagination, refresh, removal, and record links must work without JavaScript. JavaScript may enhance announcements or filter submission, but must not supply sample rows or become the source of truth. Remove the unavailable slider button unless it is given a real function.

Derive links from trusted event types and UUIDs, with current access checks. Forms use exact View/Download links; schedules can reuse `/scheduler?edit=<uuid>`. Add a bounded, owner/access-checked `focus` parameter to the template workspace for template/sharing/review links so a target outside the normal list limit can still be opened. Batch current-target checks when rendering a feed page; avoid one database query per activity row. Deleted or inaccessible targets show a clear unavailable state with no dead Download/Resume control.

Render event text with Django escaping and an allowlisted icon/badge registry. Distinguish an unavailable database from an empty account. An Activity Log failure must not seed examples; a Recent Forms query failure must not blank unrelated dashboard sections.

## 5. Implementation waves

Each wave includes focused checks before the next dependent wave. Preserve the existing uncommitted launcher, README, and arrow work.

| Wave | Work | Deliverable and completion check | Current result |
| --- | --- | --- |
| 1. Data contract and capture | Add forward SQL migration for activity rows, grants/RLS, indexes, capture triggers, saved-form import, and submission key. Add unmanaged activity model/app registration/router support. | Local PostgreSQL proves actual event capture, user isolation, denied event forgery, no-op/cascade rules, and transactional rollback. No historical SQL files rewritten. | Complete. Both migrations applied. Rollback-only acceptance script passes real local PostgreSQL capture, RLS, backfill, idempotency constraint, cascade, privacy, and rollback checks. |
| 2. Saved-record services and actions | Add lightweight summary/paged selectors. Wire exact record view and JSON download. Implement retry-safe saving and preserve the submission key across existing voice forms. | Repeated/concurrent save yields one record and one event. View/download open the exact authorized record; another account receives 404. | Complete. Service idempotency, exact owner-checked view/download, POST/redirect/GET delete, hidden-key carry, and no-store responses are implemented. Focused tests cover exact values and wrong-owner 404. Concurrent Python POST behavior remains a release check. |
| 3. Dashboard Recent Forms | Pass real summaries into `dashboard.html`. Remove example generation and localStorage activity reads from the Recent Forms portion of `p7_dashboard.js`; retain panel navigation and preferences. | Five newest real saved records, correct IDs/order, actual empty/error states, and persistence across browsers. | Complete. Summary selector is bounded to five rows; desktop/mobile browser check covers exact link, ignored browser storage, empty state, and query failure state. |
| 4. Activity page | Add validated GET filters, paging, safe target actions, owner-only removal, and server-rendered rows. Replace the demo behavior in `p7_activity.js` with minimal enhancement code, or retire that script if unnecessary. | Real actions across all five selected categories appear; refresh reads PostgreSQL; removing history leaves saved records intact. | Complete. Database triggers cover all five categories; server filtering, safe links, and history-only removal are implemented. Local SQL and desktop/mobile browser checks pass. |
| 5. Integration and regression | Update synthetic browser fixtures and current route contracts; add focused feature checks using mocked AI and real local PostgreSQL where required. Review desktop/mobile and keyboard behavior. | The acceptance matrix below passes with current evidence. SQLite or mocked browser results are not used as proof of PostgreSQL triggers/RLS. | Focused checks passed: 55 Django tests, the real PostgreSQL acceptance script, and W4/W7 desktop/mobile browser suites. The full acceptance matrix is not yet closed; see the subsequent review and closeout. |
| 6. Local operation and handoff | Update startup/manual instructions to apply pending local migrations without reset. Document new behavior, schema version, event taxonomy, known limits, and evidence. | Existing local data survives upgrade; the one-command launcher starts the updated app; a dated closeout identifies any unresolved requirement accurately. | Complete. `start-local.ps1` runs `supabase migration up --local` after startup; README and runbook document the feature, taxonomy, commands, boundaries, and evidence. |

For an existing local stack, apply pending forward migrations with `supabase migration up --local`. The launcher now runs this local-only step after Supabase starts and before first-time role/account setup. It does not reset local database data or change the preflight's no-network contract.

## 6. Files changed in the implementation

| Location | Planned change |
| --- | --- |
| `supabase/migrations/20261017120000_activity_recent_forms.sql`, `20261017123000_activity_capture_completeness.sql` | Additive schema, permissions, capture functions/triggers, submission key, saved-form import, cascade handling, and combined status/edit metadata. |
| `migration/django/apps/activity/` | New unmanaged model, filter validation/selectors, presentation registry, and removal service. |
| `migration/django/config/settings/base.py`, `apps/db/router.py` | Register the activity app and route it to the application data alias. |
| `migration/django/apps/voice/models.py`, `filled_services.py`, `selectors.py` | Submission key and idempotency; lightweight summaries/paging; reuse exact-record lookup. |
| `migration/django/apps/application/views.py` | Real dashboard/activity queries, filter/remove actions, exact saved-form view/download, POST/redirect/GET, and template focus handling. |
| Application templates | Update `dashboard.html`, `activity_log.html`, `filled_templates.html`, and voice hidden fields; add activity row and saved-record detail templates. Add template-workspace focus markup where needed. |
| `static/js/p7_dashboard.js`, `p7_activity.js`, `p7_voice.js` | Remove demo feed behavior; preserve unrelated preferences, consent, chat, and recorder behavior. Carry the save key where native form rerendering needs it. |
| `config/browser_middleware.py`, `tests/test_p7_application.py`, new activity/service tests | Replace sample-feed assumptions with deterministic real-data contracts and precise-record actions. |
| `scripts/p7_application_browser_check.cjs`, `scripts/p9_asset_check.cjs` | Update current feature expectations and required assets if the demo activity script is retired. Keep historical screenshots/results intact. |
| `supabase/tests/p11_activity_acceptance.sql` | Exercise actual RLS, trigger grants, rollback, save-key guard, privacy rules, cascades, and cross-account behavior with synthetic fixtures inside a transaction that rolls back. |
| `start-local.ps1`, local runbook, README, current migration-state notes | Document/apply the new local forward migration and record this separate feature's result. Do not relabel historical P7/P9 example checks as backend verification. |

Avoid changing the legacy archive, adding a SPA, introducing a job queue/realtime system, changing providers, or creating a new team membership model for this feature.

## 7. Required acceptance and evidence

| Requirement | Required proof |
| --- | --- |
| Honest empty state | A fresh account has no fabricated recent forms or activity; localStorage examples cannot influence the rendered server results. |
| Save-to-history flow | Save a synthetic form, inspect that exact saved ID, see it in Recent Forms, and see exactly one `form_saved` entry. Reload and use a second browser session for the same account. |
| Retry and concurrency | Repeated and simultaneous final POSTs with one submission key produce one saved record/event; a conflicting payload is reported without losing entered values. Different valid keys allow intentional separate saves. |
| Broad event coverage | Exercise every event registry branch through supported services: templates, shares/role/removal, reviews/decisions, schedules/status/deletion, saved forms/deletion. Verify no-op updates and hidden share preferences add no noise. |
| Atomicity | Force a rollback/event failure in local PostgreSQL and prove neither the action nor its event remains committed. No external provider or Storage call is used as the fault test. |
| Isolation and forgery prevention | Two accounts plus an actual sharing recipient prove separate feeds, exact-record read/download/delete denial, owner-only activity removal, denied activity INSERT/UPDATE, and normal RLS behavior for shared templates. |
| Authentication and HTTP controls | Anonymous redirect, Auth-unavailable handling, session/CSRF enforcement, rejected retired authentication headers, safe UUID validation, and no-store download/page responses. |
| Links and deletion | View/Download reference exact records. Saved-form deletion removes it from Recent Forms. Activity removal leaves it there. Deleted/revoked targets cannot be opened through stale history links. |
| Correct query behavior | Verify pagination, equal timestamps, exact 7/30-day ranges, UTC midnight boundaries, invalid filters/pages, stable ordering, and bounded query/answer loading. |
| Privacy and rendering | Malicious labels render as text; no answer/transcript/audio/credential data enters event metadata. JSON download preserves exact saved types and values. |
| Cascades and upgrade | Template/account cascades complete without fabricated child actions or blocked deletion. The saved-form import is factual and duplicate-safe. An existing local database upgrades without reset. |
| Usable UI | Desktop/mobile layouts, long labels, keyboard controls, confirmation/feedback, true empty/error states, and JavaScript-disabled core flows work. Mocked UI checks are reported separately from actual database checks. |

During implementation, run focused Python/service/view checks and local PostgreSQL checks first, then the existing Django regression suite, relevant browser checks, Ruff, type checks for changed modules, static build/collection, and whitespace review. Use synthetic data and mocked AI; no live speech/provider work is needed to verify this feature.

## 8. Rollout and completion boundary

Keep the schema additive. A code rollback can leave the new table and nullable column in place; it must not erase existing saved forms. If a new capture trigger blocks writes, recovery must target only the newly introduced activity triggers while preserving existing RLS and ownership guards, followed by a corrective forward migration.

The first release is complete when every required acceptance row has current evidence, example/localStorage feed dependencies are removed from the active feature, all supported row actions are usable, and the README/runbook matches the shipped behavior. No draft/resume or team-invitation promises may remain on these pages.

The six implementation waves are complete for the local stack. The [closeout](ACTIVITY_RECENT_FORMS_CLOSEOUT_2026-10-17.md) records the migrations, verification results, and any acceptance evidence still outstanding. The account's saved-form and activity data are ready for local review; hosted migration, production deployment, traffic changes, and production soak are not part of this work. This feature is separate from the completed P11 legacy-retirement phase and does not reopen P9/P10/P11 acceptance.
