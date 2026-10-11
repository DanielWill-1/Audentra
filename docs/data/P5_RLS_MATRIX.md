# P5 RLS access matrix

**Reviewed:** 2026-10-11  
**Target:** Existing Audentra development project.  
**Result:** Hosted authorization matrix passed, including the shared transaction-pooler identity-switch and isolation checks (2026-10-11).

The target matrix is enforced by PostgreSQL RLS, grants and guarded database functions. Django service checks are an additional layer; they do not replace RLS. “Owner” is the template creator, “recipient” is an existing account with a share, and “unrelated” has neither relationship.

| Resource / action | Owner | Viewer | Editor | Admin | Review author | Unrelated / anonymous |
|---|---|---|---|---|---|---|
| Own profile read/update | Own row / approved fields | Own row | Own row | Own row | Own row | Denied |
| Visible template read | Yes | Authenticated discovery | Authenticated discovery | Authenticated discovery | Authenticated discovery | Anonymous denied |
| Hidden/shared template read | Yes | Shared only | Shared only | Shared only | Shared only if visible/shared | Denied |
| Template content update | Yes | Denied | Yes | Denied | Only if independently owner/editor | Denied |
| Template visibility change | Yes | Denied | Denied | Denied | Only if owner | Denied |
| Template delete / owner object cleanup | Yes | Denied | Denied | Denied | Only if owner | Denied |
| Create, change-role or revoke a share | Yes | Denied | Denied | Yes | Only if owner/admin | Denied |
| Hide/remove a received share | Own recipient row | Own recipient row | Own recipient row | Own recipient row | Own row if recipient | Denied |
| Private file read | Yes | Shared template only | Shared template only | Shared template only | Only if also shared/owner | Denied |
| Private file upload/update/delete | Yes | Denied | Denied | Denied | Only if owner | Denied |
| Review read | Template's reviews | Own authored review | Own authored review | Own authored review | Own row | Denied |
| Review content update | As author | As author | As author | As author | Own content only | Denied |
| Review status moderation | Yes, status only | Denied | Denied | Denied | Denied | Denied |
| Scheduled event CRUD/status | Own rows | Own rows | Own rows | Own rows | Own rows | Denied |
| Filled form read/delete | Own rows | Own rows | Own rows | Own rows | Own rows | Denied |

The review-author column describes authorship only; the user must also meet the resource policy. For example, an author can see their own review while an unrelated review author cannot read another author's review.

## Evidence

- [P5_HOSTED_RESULTS.json](P5_HOSTED_RESULTS.json) records owner/editor/stranger accounts and hosted checks for roles, review visibility, private file access and revocation, scheduling, filled forms and profile isolation. All three synthetic accounts were deleted and no emails were sent.
- `migration/django/scripts/p5_native_rls_checks.sql` exercises native PostgreSQL policy behavior, including admin share management without template editing and editor content changes without visibility changes.
- `migration/django/scripts/check_p5_rls_scratch.py` passes query-context rejection, verified identity, nested context, user switching and rollback checks against a local native PostgreSQL scratch database.
- The final hosted run used the shared transaction pooler with the project-scoped `django_data` login. The role membership is `SET TRUE, INHERIT FALSE`; it is not `BYPASSRLS` and is not a request-path service-role connection. The probe verified A/B/A identity/claims and private-row isolation on a reused Django client connection, transaction-entry cleanup, forced rollback and recovery.

## Explicit boundary

The active hosted result verifies the shared transaction pooler: [P5_HOSTED_RESULTS.json](P5_HOSTED_RESULTS.json). The previous direct-host evidence remains archived separately. Do not infer future pooler behavior from either record if the endpoint, role or driver configuration changes; rerun the hosted probe after such changes.
