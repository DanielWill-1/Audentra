# P1 known differences and defects

P1 is finalized with [owner-accepted exceptions](P1_ACCEPTANCE.md). Open rows are assigned carryovers, not claims that the full baseline passed.

No intentional parity difference has been approved for migration implementation.

| ID | Route/state | Observation | Evidence | Decision/owner | Status |
|---|---|---|---|---|---|
| P1-001 | /activitylog and dashboard feed | Activity uses localStorage and seeded example items; no activity table is established by repository migrations | src/lib/activity.ts; Q21 in MIGRATION_PLAN.md | Retain as a future feature; implement its real backend in a later scoped phase | Decision recorded 2026-10-10; current behavior remains |
| P1-002 | Protected application routes while anonymous | Some pages return an empty render; others show a route-specific state. Record each live result; never count an empty page as a signed-in capture | Page source listed by docs/parity/route-manifest.json | P1 reviewer | To capture |
| P1-003 | Shares, reviews and filled-template fixtures | Initial DDL absent in repository; approved testing catalog has zero public tables | supabase/migrations/; testing-schema-summary.json | P5a: accepted reference/rebuild disposition and reproducible schema; P5b: fixture checks | Deferred under P1 acceptance |
| P1-004 | Visual comparison | Historical desktop references manually accepted; no mobile/full goldens, numeric thresholds or masks accepted | route-manifest.json; reference-inventory.json | P6/P7 current captures before affected cutovers; complete automated evidence by P9 | Manual acceptance recorded; automated evidence deferred |
| P1-005 | `/activitylog` controls | Download, Continue and slider controls are rendered without click handlers in the inspected source | `src/pages/ActivityLog.tsx` | Record current behavior; any feature repair requires a separately scoped decision | Source defect; not exercised |
| P1-006 | `/filledtemplates` export | The page exposes row deletion but no export control; the earlier checklist incorrectly grouped export with this route | `src/pages/FilledTemplates.tsx` | Export is not part of the current route behavior; do not add it during P1 | Corrected in flow checklist |
| P1-007 | `/scheduler-settings` integrations | Calendar/notification integration toggles persist as settings, but source does not establish a connected external service | `src/pages/SchedulerSettings.tsx` | Capture toggles as UI preferences; live integration behavior is not claimed | To capture |
| P1-008 | Template file Storage | Client references template-files/public URLs; confirmed testing target has no buckets and repository has no provisioning policies | src/lib/templates.ts; testing-schema-summary.json | P5a reviewed bucket/access configuration; P5b acting-user ownership/RLS proof | Target confirmed; Storage deferred |

Append sanitized observations with route/state, source HEAD, environment, repro steps and screenshot/report path. Do not include request query strings, credentials or real user data.
| P1-009 | Historical application screenshots | Four images show login, filledtemplates a loader and templates an error; /open/mobile absent; historical home copy differs | reference-inventory.json; P1_ACCEPTANCE.md | Fresh successful/source-aligned evidence before affected P6/P7 cutovers | Accepted historical references only |
