# P5 operation inventory

**Reviewed:** 2026-10-11  
**Target:** Existing linked Audentra development project (see P5_TARGET_INVENTORY.json).  
**Status:** The 41-call-site source inventory is implemented in Django services/selectors and covered by local plus hosted checks, including the shared transaction-pooler gate completed on 2026-10-11. See [P5_HOSTED_RESULTS.json](P5_HOSTED_RESULTS.json).

This inventory counts current TypeScript call expressions, then separates PostgreSQL/Storage network work from local SDK helpers. It is a source audit, not proof that a React page currently succeeds against the migrated target. Current hosted schema/results are in [P5_TARGET_INVENTORY.json](P5_TARGET_INVENTORY.json) and [P5_HOSTED_RESULTS.json](P5_HOSTED_RESULTS.json).

| # | Current source / operation | Object and shape | Actor and current contract | Django target and disposition | Evidence / verification |
|---:|---|---|---|---|---|
| 1 | src/lib/templates.ts — createTemplate | INSERT templates; returns row | Owner; caller currently supplies created_by | templates_app.services.create_template — core | Derive owner from verified Supabase principal; synthetic CRUD |
| 2 | getUserTemplates | SELECT templates plus template_shares and template_reviews embeds; configurable sort | Authenticated; RLS decides owned/visible rows | templates_app.selectors.list_templates — core | Verify joins/visibility and bounded pagination |
| 3 | getTemplatesByCategory | Same three-object nested SELECT, optional category filter and configurable sort | Authenticated | templates_app.selectors.list_templates(category=...) — core | Category allowlist and relation results |
| 4 | getTemplateById | SELECT one template and share/review embeds by UUID | Authenticated | templates_app.selectors.get_template — core | Owner/shared/visible/denied matrix |
| 5 | updateTemplate | UPDATE caller fields by template UUID; returns row | Owner should control it; helper has no ownership filter | templates_app.services.update_template — core | Writable-field allowlist; cross-user denial |
| 6 | deleteTemplate | DELETE by template UUID | Owner; relies on RLS | templates_app.services.delete_template — core | Owner delete and dependent-record disposition |
| 7 | toggleTemplateVisibility | UPDATE visibility by UUID | Owner; visible/hidden | templates_app.services.set_visibility — core | Visibility and discoverability checks |
| 8 | shareTemplate | INSERT one template_shares row per supplied email, role, sender, message and timestamp | Authenticated sender; recipient/role rules were missing | templates_app.services.create_share — core under owner-approved ID-based contract | Account A/B tests; no email invitations |
| 9 | shareTemplatesWithTeam | INSERT share rows to the caller's own email as a demo | Reachable from a modal; not a real team operation | Do not port as team sharing; replace only with explicit ID-based share service | No team tables or invitations by inference |
| 10 | getSharedTemplates | SELECT share rows plus template embed, filtered by current email | Recipient; currently logs email/results | templates_app.selectors.list_received_shares — core under ID-based contract | Recipient and template jointly authorized; no PII logging |
| 11 | getTemplatesSharedByUser | SELECT share rows plus template embed, filtered by shared_by UUID | Sender/owner | templates_app.selectors.list_sent_shares — core | Owner-only inventory |
| 12 | removeTemplateShare | DELETE by template UUID and supplied email | Intended sender/recipient unclear | templates_app.services.remove_share — core | Owner revokes; recipient removes only own share |
| 13 | deleteSharedTemplate | DELETE by share UUID | UI says remove; helper does not bind actor | templates_app.services.remove_share — core | Cannot revoke another user's share |
| 14 | toggleSharedTemplateVisibility | UPDATE message to hidden_by_user or empty, plus updated_at | Intended recipient; corrupts sender message | Recipient's is_hidden field in share service — core | Independent recipient preference |
| 15 | updateTemplateShareRole | UPDATE role by share UUID | Intended owner; helper does not bind actor | templates_app.services.set_share_role — core | Owner-only; fixed role allowlist |
| 16 | addTemplateToReviewQueue | INSERT review with reviewer snapshot, rating 0, status pending; priority argument is unused | Authenticated reviewer; eligibility is absent | templates_app.services.request_review — core | Author/owner checks; do not persist unused priority |
| 17 | getReviewQueue | SELECT all pending reviews and embedded templates, newest first | UI treats as shared/team queue | templates_app.selectors.review_queue — account/owner scoped | No global review/email enumeration |
| 18 | addTemplateReview | INSERT caller template_id/rating/comment/status plus reviewer snapshot and times | Authenticated reviewer; eligibility/status unresolved in source | templates_app.services.create_review — owner-approved author/owner scope | Enforce fields, eligibility and constraints |
| 19 | updateTemplateReview | UPDATE rating/comment/status and updated_at by review UUID | Intended reviewer/owner; helper has no actor check | templates_app.services.update_review — author/owner rules | Validate transitions and ownership |
| 20 | getTemplateReviews | SELECT by template UUID, newest first | Template viewer; helper exposes reviewer details | templates_app.selectors.list_template_reviews — author/owner only | Prove unrelated users cannot read reviews |
| 21 | uploadTemplateFile | One Storage upload to template-files at templates/{template UUID}.{original extension} | Signed-in caller; path/type/size unchecked | storage.services.upload — core | Private bucket, user JWT, generated owner path and bounds |
| 22 | getPublicUrl in uploadTemplateFile | Local SDK URL construction; no Postgres/Storage request | Anyone holding URL can read only if bucket is public | Replace with authenticated download or bounded signed URL | Prove owner/authorized recipient access |
| 23 | src/lib/scheduler.ts — createEvent | INSERT scheduled_events: title, description, date/time, duration, type, priority, attendees JSON, location, form_id, reminder and caller created_by | Event owner; created_by must be server supplied | scheduler.services.create_event — core | Field limits and ownership spoofing |
| 24 | getUserEvents | SELECT events with optional date/type/status filters; order date/time ascending | Current account | scheduler.selectors.list_events — core | Bounded ranges/results and ordering |
| 25 | getEventsInRange | SELECT inclusive date range, ordered date/time | Current account | scheduler.selectors.events_in_range — core | Boundary dates |
| 26 | getEventById | SELECT one UUID | Current account | scheduler.selectors.get_event — core | Foreign IDs return non-disclosing result |
| 27 | updateEvent | UPDATE supplied event fields by UUID | Owner; actor/timestamps excluded | scheduler.services.update_event — core | Allowlist and spoof attempts |
| 28 | deleteEvent | DELETE by UUID | Owner | scheduler.services.delete_event — core | Owner/foreign test |
| 29 | getUpcomingEvents | SELECT scheduled events from UTC-derived today through seven days; ordered; caller limit | Current account | scheduler.selectors.upcoming_events — core | Preserve/document UTC boundary; cap limit |
| 30 | getEventsByStatus | SELECT status, date/time order | Current account | scheduler.selectors.events_by_status — core | Status allowlist |
| 31 | getEventsByType | SELECT type, date/time order | Current account | scheduler.selectors.events_by_type — core | Type allowlist |
| 32 | markEventCompleted | UPDATE status=completed by UUID | Owner | scheduler.services.set_status — core | Owner and valid transitions |
| 33 | cancelEvent | UPDATE status=cancelled by UUID | Owner | scheduler.services.set_status — core | Owner and valid transitions |
| 34 | getEventStats — total | SELECT IDs since current month start | Current account | scheduler.selectors.event_stats — core; replace with aggregate | Count verified against fixtures |
| 35 | getEventStats — completed | SELECT IDs since month start with completed status | Current account | Same aggregate; one of four legacy queries | Completed count |
| 36 | getEventStats — upcoming | SELECT IDs from today with scheduled status | Current account | Same aggregate | Upcoming count |
| 37 | getEventStats — high priority | SELECT IDs from today with high priority and scheduled status | Current account | Same aggregate | High-priority count |
| 38 | searchEvents | SELECT with interpolated PostgREST OR/ILIKE on title, description and location | Current account; filter syntax can be influenced by input | scheduler.selectors.search_events — core; parameterized query | Quotes/wildcards/filter injection |
| 39 | src/pages/FilledTemplates.tsx — fetchFilled | SELECT * by caller user_id, newest first | Current user; caller filter is not auth | voice.selectors.list_filled — core | Server actor scope; two-user check |
| 40 | FilledTemplates.tsx — deleteFilledTemplate | DELETE by filled row UUID | Owner; relies on RLS | apps.voice.filled_services.delete_filled — core | Owner/foreign denial |
| 41 | src/pages/AIVoiceAutoFill.tsx — submitForm | INSERT user_id, template_id/name snapshot and label-to-value JSON | Current user; caller currently supplies user_id | apps.voice.filled_services.save_filled — core service only; no recorder/page migration | Server actor; preserve P8 boundary |

## Reconciliation with the older “38 call sites” count

The current source contains 41 .from(...) expressions:

- 39 PostgREST expressions across templates/shares/reviews (20), scheduling (16) and filled forms (3).
- One Storage upload request.
- One getPublicUrl local URL builder, which makes no network request.

The current helpers therefore make 40 database/Storage network operations when every branch runs. The older 38 figure is not the current request count; it counted helpers/queries differently. In particular, one getEventStats helper issues four queries. Replacing those with one SQL aggregate changes the wire-call count. Export/download and the unrouted share-link helper are not database call sites.

## Outside P5 data scope

- src/lib/activity.ts uses localStorage/example data. Keep /activitylog as a future feature; no activity table or fake seeds.
- Team components use localStorage/demo records. Existing historical team tables do not authorize porting that UI or inventing email invitations.
- Dashboard and scheduler preferences are browser state; Q5 is unresolved. No settings table.
- exportTemplate and generateShareLink are browser-only helpers. Export/UI route work is later; the unrouted share-link helper does not authorize anonymous/public links.
- P5 builds backend services. It does not migrate React pages, create 40 Django URLs or cut over the app.
