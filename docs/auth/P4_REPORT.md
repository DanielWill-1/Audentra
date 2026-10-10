# P4 development authentication report

**Date:** 2026-10-11
**Authority:** The owner's “Clean Supabase Auth Migration (Development Only)” request supersedes the earlier compatibility and email-delivery gates.
**Status:** Development Auth acceptance passed and accepted by the owner for the P5 handoff on 2026-10-11. Credential revocation remains a separate approval-dependent security followup; replacement credentials and local build cleanup are prepared.
**Handoff:** [P5 prompt](../../prompt.md) is prepared; [P4 scope](P4_IMPLEMENTATION_PROMPT.md) is archived. This acceptance does not claim completed key retirement or email recovery.

## Implemented

- Django forms and locally vendored HTMX 2.0.8 use the official Supabase Python SDK, locked at 2.32.0. Supabase is the sole identity provider; Django Auth is not installed.
- Signup needs an email and matching passwords of at least eight characters; names are optional metadata. It installs a server-side session immediately when Supabase returns tokens.
- The owner authorized disabling mandatory signup confirmation on the existing development project. Hosted readback and the public Auth settings check confirm this. No SMTP, Gmail integration, paid service, OAuth provider, template customization or legacy identity migration was added.
- Login, a protected account page, explicit refresh, authenticated password change, and POST-only logout work against hosted Supabase. Password changes require a verified session and CSRF; success clears the local session and requires a fresh password login.
- Each SDK operation uses a fresh client with persistence and automatic refresh disabled, a finite timeout, and a closed HTTP client. Refresh remains under Django's PostgreSQL row lock. Token-free principals, session rotation, absolute expiry, cookie policy and stale-save protection remain in place.
- Service routes require verified identity. Cookie requests require CSRF; the generic bearer API path remains available. React session handoff, OAuth/email callback handlers, conditional email template gates and obsolete optional-auth helper tests were removed from active P4.
- The supplied publishable key now configures the Django environment and root browser/parity public settings. One generated frontend file containing secret-shaped text was sanitized. Local public settings no longer contain a secret key.

The earlier report is archived as [P4_REPORT_PRE_DEVELOPMENT_SCOPE.md](P4_REPORT_PRE_DEVELOPMENT_SCOPE.md). Its mocked results remain historical evidence; its SMTP and legacy compatibility requirements are superseded.

## Actual verification

| Check | Result |
|---|---|
| Isolated regression suite | 76 tests passed after the SDK and scope changes; SQLite test aliases, no hosted database creation/flush |
| Ruff: apps/config/tests plus the two current Python probes | Passed |
| MyPy: config/apps/tests | Passed, 56 source files |
| Django test settings check | Passed, no issues |
| Offline lock check | Passed, 68 packages resolved |
| Static collection | Passed, vendored HTMX collected |
| Static token verification | Passed, existing design tokens preserved |
| Public key/build/document secret checks | Passed; public settings use publishable keys, no secret-key-shaped content in inspected generated frontend files or Auth docs |
| git diff --check | Passed |
| Hosted fresh-account signup/login/session | Passed through real Django views, real Supabase Auth and PostgreSQL sessions |
| Hosted refresh | Passed; refresh token rotated and the canonical session generation increased |
| Hosted authenticated password change | Passed; missing CSRF rejected; old password rejected and new password accepted |
| Hosted logout | Passed; protected access removed and the revoked refresh token rejected |
| Real HTMX browser | Passed: locally served HTMX, invalid-login error rendering, login, protected page, navigation, HttpOnly/Lax cookie, empty localStorage and logout |
| PostgreSQL concurrency | Passed with the SDK adapter: two independent processes refreshed once; logout removed the row; stale saves could not resurrect it |

[Hosted results](P4_HOSTED_FLOW_RESULTS.json) contain check names and booleans, without passwords, tokens, personal mailboxes or account identifiers. The probe generated a new address/password, deleted only its generated Auth account, and removed its tracked Django session rows in finally. It sent zero emails and made no public application table, Storage, RLS, schema or deployment change.

The first hosted attempt passed signup/login/logout but failed in the probe's forced-expiry setup: SessionStore correctly discarded a same-generation auth overwrite. The probe was corrected to expire only its own generated database row directly; the rerun passed refresh and the remaining flow. This was a verification-script defect.

### Reproduce checks

From migration/django/:

```powershell
$env:UV_CACHE_DIR = ".uv-cache"
$env:UV_PROJECT_ENVIRONMENT = ".venv-p2"
uv sync --locked
uv run python -m pytest -q -p no:cacheprovider
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run_ruff.ps1 check apps config tests scripts/check_p4_hosted_auth.py scripts/check_p4_postgres_concurrency.py
uv run python -m mypy config apps tests
uv run python manage.py check
```

This runner used Windows Store Python 3.12 with .venv-p2/Lib/site-packages on PYTHONPATH because the managed interpreter's ctypes loader failed earlier. The live probes are explicit commands, not part of pytest. They require the already-configured development PostgreSQL roles and, for exact test-account cleanup only, the ignored server-only SUPABASE_TEST_ADMIN_KEY. The website never reads that admin key.

## Hosted configuration

[P4_DEVELOPMENT_CONFIG.json](P4_DEVELOPMENT_CONFIG.json) records confirmation disabled, email enabled, Google/Azure disabled, no SMTP, and the Django development site URL. The project and application database were kept intact. Historic before/after snapshots describe earlier settings, not current authority.

## Credential cleanup and remaining security action

[P4_CREDENTIAL_ROTATION.json](P4_CREDENTIAL_ROTATION.json) records a new server-only development cleanup credential, local consumer updates, generated build cleanup, and **revocation_completed=false**.

Automatic approval review rejected revoking the existing secret and disabling legacy anon/service-role API keys because unknown external CI/application consumers could break. The rejected operation was not executed or bypassed. The safer preparation created a replacement and scrubbed local generated assets without revocation. GitHub CLI/access was unavailable, so external CI secrets were not updated.

The exposed credentials must still be retired. The owner must explicitly approve the reviewed project key revocation/deactivation or perform it in the Supabase dashboard, then update any external consumer. Publishing/deployment must not treat this preparation as completed rotation. The new Django acceptance flow uses the publishable key, independent of that admin cleanup credential.

## Email recovery and production follow-up

Email-based forgotten-password recovery remains unavailable in the website. /forgot-password/ explains the limitation and does not claim an email was sent or call the recovery API. Disabling signup confirmation does **not** solve recovery delivery. Supabase's default sender restricts recipients to organization members and has tight rate limits; no live recovery-delivery claim is made. [Supabase default email restrictions](https://supabase.com/docs/guides/auth/auth-smtp).

Before production, reconsider mandatory email verification and implement/test the chosen confirmation and forgotten-password recovery flow, review HTTPS cookies and rate limiting, and finish credential retirement. These are recorded follow-ups, not development signup/login acceptance gates under the owner's revised scope.

## Next phase

The new development authentication flow is verified. P5a owns application schema/Storage reconciliation; P5b owns application data access and RLS verification. No P5 implementation started here. P3 live speech-provider evidence remains open for its later voice/parity gate. Original source/reference directories remain available.
