# P10 rollback runbook

This runbook prepares a later owner-approved deployment. P10 does not switch production traffic or apply a production migration.

## Code and traffic rollback

1. Record the release identifier, source revision, static manifest, database migration plan, current route status, and active proxy target before a release.
2. If the new process fails readiness or a required route check, remove it from traffic at the proxy and route traffic to the prior known-good release. Keep the prior code and static manifest intact until the rollback is verified.
3. Restart only the selected application process. Check `/livez`, `/readyz`, login redirect behavior, static assets, service denial behavior, and the exact affected route through the proxy.
4. Confirm that the restored route responds with its previously accepted status and that the proxy still blocks direct access to the loopback upstream.
5. Keep service keys, database credentials, and Auth refresh-token handling outside the code rollback. Rotate a credential only under a separate owner-approved recovery procedure.

A code rollback does not delete or overwrite valid rows written by the newer code. Do not reverse a Django migration automatically as part of code rollback; inspect its data effects and dependents first.

## Application-data recovery

Treat corrupted data recovery as a separate operation from restoring code or traffic. Identify the affected table, rows, time window, and originating request or migration. Preserve a current backup before applying a targeted repair. Prefer an application-level row restore or a narrow SQL repair reviewed against current constraints and RLS. Verify the repaired records and account isolation through the normal app path.

Do not restore the entire database when that would remove valid writes created after the backup. Do not run broad `flush`, table recreation, destructive migration reversal, or hosted schema changes as a deployment rollback. If the affected records cannot be isolated safely, keep the service paused and escalate the data recovery decision to the owner.

## Local preparation checks

P10 validates the process stop/restart path, the per-process rate-limit reset, and the local route/readiness behavior. Existing P9 login/session flows are reused; a signed-in session was not replayed across a new Waitress process. A prior-release traffic switch/exact-release restoration, production proxy cutover, backup restoration, and data recovery remain unverified until the owner selects a host/release target and authorizes those operations.
