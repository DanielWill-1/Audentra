# P5 implementation report

**Date:** 2026-10-11  
**Overall status:** **Partial — implementation and direct-host verification passed; transaction-pooler proof is still required.**

P5 added a Django data layer for the existing development site and reconciled the previously empty public application schema. P5 does not migrate pages or change the React/Express source. Original folders remain in place.

## Implemented

- Added six unmanaged application models for profiles, templates, shares, reviews, scheduled events and filled forms.
- Added the verified-user RLS transaction context, transaction-local claims/role, context guard, query guard and alias routing under `migration/django/apps/db/`.
- Added profile initialization on new verified sessions and own-profile updates.
- Added template CRUD/list/search/category/visibility operations, UUID-based account sharing, recipient-local share visibility, review queue and participant-scoped review services.
- Added account-scoped scheduler selectors and writes, filled-form save/list/detail/delete, and private template-file upload/download/delete.
- Implemented private `template-files` access with a generated object path, 20 MiB limit, MIME allowlist and CDN cache nonce on downloads.
- Added a fresh-install baseline and guarded additive reconciliation. Applied `20261011100000_p5_reconcile.sql` and the follow-up `20261011150000_p5_share_role_bounds.sql` to the linked development project. Historical migrations were not edited.
- Documented owner/viewer/editor/admin access and tested the admin boundary: admin manages shares but cannot edit template content; editor can edit content but cannot change owner visibility; only owner deletes or changes visibility.

## Verification

- Hosted P5 probe passed against the existing development project through its direct PostgreSQL host. It created and deleted three generated accounts, sent zero emails, and reported cleanup success.
- The hosted probe passed fresh signup/profile setup, profile isolation, template CRUD/search, private file access and revocation, share roles/escalation denial, participant-only reviews, scheduler operations, filled-form isolation and exact object cleanup.
- Native PostgreSQL scratch passed clean baseline creation, baseline/remediation catalog equivalence, empty-target remediation twice, unchanged normalized schema after re-application, and RLS policy assertions on both schema paths. A separate Django scratch probe passed context, user-switch and rollback checks.
- Regression checks: 90 pytest tests passed; `manage.py check` passed; focused P5/app Ruff and mypy are recorded in [P5_VERIFICATION.md](P5_VERIFICATION.md).
- The hosted catalog now records six public application tables with RLS enabled, 23 public policies, a private `template-files` bucket and four Storage policies. The connector role can set `authenticated` with `INHERIT FALSE, SET TRUE`; it does not inherit application privileges.

## Remaining P5 gate

The hosted `DJANGO_SUPABASE_DATABASE_URL` still points to the direct database host. The acceptance brief requires the same authenticated identity and user-switch checks through the shared transaction pooler. The local environment does not contain a pooler URL, so `P5_HOSTED_RESULTS.json` correctly says `pooler_verified: false`; P5b and overall P5 must remain partial.

To finish that gate, put the exact shared transaction-pooler URL for the `django_data` role from Supabase Dashboard → Connect into the ignored `migration/django/.env` as `DJANGO_SUPABASE_DATABASE_URL`. Keep the password local. Run the hosted probe in [P5_VERIFICATION.md](P5_VERIFICATION.md), review cleanup, and refresh the target inventory/result. Do not compose the hostname or paste the URL/password into chat.

## Other limitations

- The target had no public application schema to recover. P5 creates new development contracts documented in [P5_CONTRACTS.md](P5_CONTRACTS.md); these are not claimed as historical schema.
- A full hosted schema-only dump was unavailable: Supabase CLI tried to start Docker and was stopped, and native `pg_dump` with the restricted request role was denied table locks. The app role was not widened. Current hosted catalog evidence is `P5_TARGET_INVENTORY.json`; the pre-P5 dump is labelled historical.
- The hosted test establishes the direct connection, not transaction-pooler behavior. Native PostgreSQL does not replace hosted Supabase Storage/RLS checks.
- Email-based password recovery, P4 credential retirement, production signup-confirmation policy, team/demo storage, preferences, activity backend, anonymous share links, page migration and production deployment remain outside P5.
- A broad `mypy apps scripts` invocation also reports existing P4 probe typing findings; the focused P5/app command is the relevant P5 check. See [P5_VERIFICATION.md](P5_VERIFICATION.md).

## Next phase

Complete the transaction-pooler check before closing P5b. Then P6 may build the shared Django rendering shell; P7 page waves remain separately gated by the roadmap and product decisions.
