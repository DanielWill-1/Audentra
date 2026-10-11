# P5 Django data contracts

**Reviewed:** 2026-10-11  
**Status:** Implemented and verified for development, including the hosted shared transaction pooler (2026-10-11).

These are new development contracts for the verified empty application schema. They are not recovered historical DDL. See [schema reconciliation](../schema-reconciliation.md), [operation inventory](P5_OPERATION_INVENTORY.md) and [P5 report](P5_REPORT.md).

## Shared request and database boundary

- Application services accept a server-verified `SupabaseUser`; they do not accept a caller-selected owner UUID as authority.
- Application ORM work uses the `supabase` alias inside `apps.db.rls.rls_context`. The context verifies the principal, opens a transaction, sets transaction-local Supabase claims and `SET LOCAL ROLE authenticated`, and restores context on exit or error.
- An ORM query guard rejects unscoped application queries on the `supabase` alias. P5-managed models use `managed = False`; Django migrations stay on the separate `default`/`django` alias.
- The `django_data` login has no inherited `authenticated` privileges. It may `SET ROLE authenticated` within a transaction; grants are `INHERIT FALSE, SET TRUE`.
- The hosted shared transaction-pooler probe passed with the restricted project-scoped `django_data` login. A/B/A claims and row isolation, transaction cleanup, forced rollback/recovery and Django client reuse are recorded in [P5_HOSTED_RESULTS.json](P5_HOSTED_RESULTS.json); the earlier direct-host run is preserved separately.

## Profiles

`apps.accounts.profile_selectors.get_profile` reads the current profile. `profile_services.ensure_profile` idempotently creates the profile for a freshly verified account; `update_profile` permits only first/last name, company and industry. The Auth UUID is the profile key. There is no global email directory or historical-account backfill.

## Templates and sharing

`apps.templates_app.selectors` lists and fetches templates, received/sent shares, review queues and per-template reviews. `services` handles create/update/visibility/delete, ID-based share create/remove/hide/role changes, review requests and review updates. Search/filter inputs are allowlisted and bounded.

| Share role | Read shared template/file | Edit template content | Change owner visibility/delete | Manage shares |
|---|---:|---:|---:|---:|
| Viewer | Yes | No | No | No |
| Editor | Yes | Yes | No | No |
| Admin | Yes | No | No | Yes |
| Owner | Yes | Yes | Yes | Yes |

Shares address an existing Supabase account by UUID. Owners and share admins manage share rows; a recipient can remove or hide only their own received share and cannot raise their role. Owners retain deletion and ownership. Visible templates are discoverable by authenticated accounts; hidden templates require ownership or a share.

Review rows are visible only to their author and the template owner. An eligible non-owner reviewer creates a pending review and may change its content, but not its decision status. The template owner may moderate status, but cannot rewrite review content. Unrelated users and share admins do not receive review visibility by default.

## Scheduling

`apps.scheduler.selectors` provides owner-scoped lists, detail, date ranges, upcoming/status/type filters, parameterized search and aggregates. `services` validates and creates/updates/deletes events and changes status. The verified legacy contract is retained: UTC-derived date boundaries and the entered date/time values are not silently converted to a new product timezone. Results and search are bounded.

## Filled forms

`apps.voice.filled_services.save_filled` derives the owner from the verified principal and stores template/name snapshots plus answer JSON. A supplied template reference must be readable by that account. `delete_filled` and `apps.voice.selectors` remain scoped to the current user. This does not migrate the recorder or page; that work remains in P8/W7.

## Private template files

- Bucket: `template-files`; private; 20 MiB maximum; JSON, CSV, PDF, XLS, and XLSX allowlist.
- Path: `templates/<template UUID>/<generated object UUID>.<validated extension>`; the client does not choose an object path.
- Upload, replacement and deletion are owner-only. The owner and an authorized share recipient can download the file; a visible template alone does not grant file access.
- Each download uses the current request's verified bearer and a fresh `cacheNonce` so a cached private response cannot persist after share revocation.
- The owner template-delete service removes only its exact referenced object. Storage cleanup failures are surfaced; no broad bucket deletion is used.

No anonymous share URL or email invitation exists in P5. Activity, team/demo persistence, dashboard preferences and timezone product changes remain deferred.
