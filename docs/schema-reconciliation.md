# P5 schema reconciliation

**Date:** 2026-10-11  
**Target:** Existing linked Audentra development Supabase project.  
**Status:** Applied and verified for the direct-host development path; P5 remains partial pending pooler proof.

## Provenance and target state

The P5 preflight queried the linked project and the private Django runtime configuration without printing credentials. Before P5 application changes, no public application table or Storage bucket existed. The target had no `supabase_migrations.schema_migrations` relation, so repository migration filenames were not used as proof of hosted history. The pre-change schema-only reference is `supabase/schema_dump/20261011-pre-p5-public-schema.sql`; it is historical and must not be applied.

The source repository does not provide complete authoritative DDL for `template_shares`, `template_reviews`, or `filled_templates`. P5 therefore defines a new development schema from reachable operations and the accepted account-scoped access defaults. The DDL is a new contract, not recovered customer schema. No historical app rows were imported, read or deleted.

## Classified changes

| Object / area | Before P5 | P5 disposition | Evidence |
|---|---|---|---|
| `public.users` profile | Absent | New Auth-UUID keyed profile table; own-row policies and limited update fields | Baseline, hosted inventory and profile isolation probe |
| `public.templates` | Absent | New owner/visibility/content schema, guarded update/delete policies and role-aware read/update helpers | Baseline, reconciliation, role correction and hosted owner/editor/admin checks |
| `public.template_shares` | Absent | New UUID recipient contract for existing Supabase users; viewer/editor/admin roles, unique template-recipient pair, recipient-local hidden flag | Baseline and hosted create/read/hide/escalation/revoke probe |
| `public.template_reviews` | Absent | New reviewer UUID/content/status contract; readable by reviewer and template owner | Baseline and hosted participant-isolation/moderation probe |
| `public.scheduled_events` | Absent | New account-owned event schema retaining existing date/time behavior | Baseline and hosted CRUD/filter/aggregate probe |
| `public.filled_templates` | Absent | New account-owned answer snapshot with optional readable template reference | Baseline and hosted owner-isolation probe |
| `storage.template-files` | Absent | Private 20 MiB bucket, five document MIME types, generated template/object path, owner writes and owner/shared-recipient reads | `P5_TARGET_INVENTORY.json` and hosted Storage probe |
| `django_data` role | P2 restricted connector | `authenticated` membership with `INHERIT FALSE, SET TRUE`; P5 opens the role only with transaction-local `SET ROLE` and RLS claims | Hosted role inventory and Django RLS scratch probe |
| Provider Auth/Storage internals | Provider-managed | Left intact; no provider table, function or event trigger replacement | Postflight catalog; existing `ensure_rls` event trigger unchanged |

The post-application hosted inventory records six public app tables with RLS enabled, 23 public policies, four Storage policies and the private bucket. It does not export application row values, Auth identities, session tokens or Storage payloads.

## Artifacts and application

- Fresh-install DDL: `supabase/baseline/00000000000000_baseline.sql`.
- Guarded additive reconciliation: `supabase/migrations/20261011100000_p5_reconcile.sql`.
- Owner/editor/admin correction: `supabase/migrations/20261011150000_p5_share_role_bounds.sql`.
- Storage bucket configuration: `supabase/config.toml`; guarded fresh-install Storage policies: `supabase/storage/template_files_policies.sql`. The linked-target reconciliation also installs those four policies.
- Hosted preflight SQL: `data/P5_READONLY_PREFLIGHT.sql`.
- Post-application inventory: `data/P5_TARGET_INVENTORY.json`.
- Replay and native proof: `../supabase/schema_dump/P5_REPLAY.md`.

Both P5 migrations were applied to the existing development project after target verification. They are additive and do not truncate, reset, drop app data or alter historical migrations. The follow-up migration narrows template updates to owners/editors, makes owner visibility immutable to recipients, and leaves share administration to owners/admins.

## Verification limits and next gate

The baseline plus separate Storage policy artifact and both migrations were tested on isolated native PostgreSQL 18.4 with minimal Auth/Storage stubs. Their normalized public/Storage schema-only dumps matched exactly. The migrations were then reapplied and the normalized output was unchanged. Native policy assertions passed on both schema paths, as did the separate Django context/user-switch check. This is not a full Supabase restore or a substitute for the hosted result.

The hosted synthetic probe passed through the direct connection, including private Storage upload/download/revocation and cleanup. The native schema dump attempt with the restricted `django_data` role was denied an `ACCESS SHARE` lock, so the project role was not given broader read access. Supabase CLI's linked dump attempted Docker and was cancelled. Current hosted structure is evidenced by the sanitized catalog JSON, not a post-P5 SQL dump.

The hosted shared transaction-pooler URL is not configured. Put the exact `django_data` transaction-pooler URL from Supabase Dashboard → Connect into the ignored local `migration/django/.env` and rerun the hosted probe before closing P5b.
