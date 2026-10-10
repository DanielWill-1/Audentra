# P5 migration replay and schema verification

**Date:** 2026-10-11  
**Scope:** Schema-only native PostgreSQL checks and linked development P5 application. No Docker.

## Historical migration replay

Historical files were replayed unchanged in a temporary PostgreSQL 18.4 cluster on loopback, with minimal local `auth.users` and `auth.uid()` stubs. Migrations through `20250628064557_aged_tree.sql` exited successfully. Replay stopped at the first failure in `20250628065741_precious_brook.sql`:

```text
ERROR: relation "template_shares" does not exist
```

The failure shows the historical directory is not a complete, self-contained schema source in this replay environment. It does not prove what another historical project contained. No old migration was edited or reordered.

## New P5 schema checks

- Applied `supabase/baseline/00000000000000_baseline.sql` plus `supabase/storage/template_files_policies.sql` to a fresh native PostgreSQL 18.4 database with local Auth/Storage stubs matching the bucket config. It created the six intended public tables, 23 public policies and four Storage policies.
- Created a separate isolated empty-application-state database with the same minimal platform stubs. Applied `20261011100000_p5_reconcile.sql` and `20261011150000_p5_share_role_bounds.sql` twice.
- A normalized schema-only `pg_dump` of public and Storage objects was unchanged after the second application. The final scratch catalog had six public application tables, 23 public policies, four Storage policies and `django_data SET TRUE / INHERIT FALSE` membership in `authenticated`.
- The normalized `pg_dump --schema-only` output for the baseline + Storage policy path matched the guarded empty-target remediation path exactly. `migration/django/scripts/p5_native_rls_checks.sql` passed owner, viewer, editor, admin, unrelated-account, review and private-object checks on both paths. Its synthetic DML rolled back.
- The separate Django native PostgreSQL probe passed context enforcement, verified identity, nested context, user switching and rollback.

This was an empty-target-equivalent native scratch check, not a full Supabase restore. It proves PostgreSQL syntax/catalog and policy behavior using the included stubs; hosted Supabase behavior is covered separately by the P5 hosted probe. The verification databases were local synthetic scratch databases and were removed after the checks.

## Linked development project

The pre-change read-only catalog query found no public application tables or Storage bucket and no `supabase_migrations.schema_migrations` relation. The guarded P5 migrations were applied to the existing linked development project. The post-application catalog is [P5_TARGET_INVENTORY.json](../../docs/data/P5_TARGET_INVENTORY.json); hosted synthetic access evidence is [P5_HOSTED_RESULTS.json](../../docs/data/P5_HOSTED_RESULTS.json).

A full hosted schema-only dump could not be captured without exceeding the accepted constraints. `supabase db dump --linked` unexpectedly attempted a Docker image pull and was cancelled before the dump ran. Native `pg_dump --schema-only` using the restricted `django_data` login connected but failed its `ACCESS SHARE` lock on `public.users` because the login has no direct table `SELECT` privilege. That least-privilege grant was not widened. `20261011-pre-p5-public-schema.sql` is historical pre-change material; it is not current hosted DDL.

The local PostgreSQL scratch cluster is not Supabase PostgreSQL 17.6 and cannot establish hosted Auth, Storage CDN, or transaction-pooler semantics. The hosted probe used the direct database host. Pooler user-switch verification remains open.
