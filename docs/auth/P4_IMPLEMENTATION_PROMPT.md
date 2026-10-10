# Archived P4 implementation prompt

> Superseded as the active prompt on 2026-10-11. The owner accepted development P4 and requested a detailed P5 brief. This archive preserves the executed scope; credential retirement and email recovery retain their recorded limitations. Use [the root prompt](../../prompt.md) for P5.

# P4 — Clean Supabase Auth Migration (Development Only)

**Authority:** Owner's revised scope, 2026-10-11. This replaces the previous SMTP, legacy-account and React Auth compatibility requirements.
**Execution:** Development authentication implementation and fresh-account acceptance passed; see [P4_REPORT.md](P4_REPORT.md). Credential revocation remains approval-dependent; do not claim completed rotation.

## Requirements

- Supabase Auth is the sole authentication provider.
- Django + HTMX + the official Supabase Python SDK. No Django Auth.
- No React authentication compatibility or old-user migration/testing gates.
- No custom SMTP, Gmail integration or paid services.
- Minimal JavaScript; HTMX is vendored locally.
- Keep the existing Supabase project and application database intact.
- Preserve original source/reference folders. Schema, Storage and application RLS remain P5a/P5b.

## Development behavior

The owner authorized disabling mandatory signup email confirmation in this project. That setting was applied and verified. Signup installs a secure server session without email verification. Reconsider this before production; email-based forgotten-password recovery is a separate limitation and remains unavailable.

Implemented routes: signup, password login, protected session page, authenticated password change and POST logout. Tokens remain in PostgreSQL sessions; principals and browser responses contain no tokens. Refresh is explicit and serialized; logout revokes the local refresh token and clears local state. Cookie writes require CSRF. Supabase SDK clients are isolated per operation, with persistence/automatic refresh disabled and finite timeouts.

The supplied publishable key configures Django and root public browser/parity settings. The website does not use an admin credential. The separate ignored development admin key exists only for exact cleanup of generated probe accounts.

## Acceptance and evidence

1. Fresh hosted signup → login → protected session → logout.
2. Hosted refresh rotation and PostgreSQL cross-process refresh/logout/stale-save protection.
3. Authenticated password update, missing-CSRF rejection, old-password rejection and new-password success.
4. Real HTMX form errors, navigation, login/logout and HttpOnly/Lax cookies.
5. Mandatory service authentication and CSRF regression coverage, with paid speech/AI providers mocked.
6. Relevant regression, framework, lint, type, lock and static checks.
7. Generated frontend secret cleanup and truthful credential-rotation status.

The implementation has passed the hosted Auth/browser flow, PostgreSQL concurrency and isolated regression checks. Current results are in [P4_HOSTED_FLOW_RESULTS.json](P4_HOSTED_FLOW_RESULTS.json), [P4_DEVELOPMENT_CONFIG.json](P4_DEVELOPMENT_CONFIG.json) and [P4_REPORT.md](P4_REPORT.md). No old account was tested and no email was sent. The probe removed only its generated test account and session rows.

## Remaining security action

Automatic approval review rejected broad key revocation/deactivation because unknown external consumers could break. A replacement server credential and local artifact cleanup are prepared. Obtain explicit approval for the exact reviewed key retirement, or have the owner perform it in Supabase; update external CI secrets where needed. Do not bypass the approval rejection or equate creating a replacement with revoking exposed keys.

## Production and later phases

Email confirmation/recovery delivery, production hardening and final key retirement must be reviewed before deployment. Disabling signup confirmation does not enable password-recovery emails. P3 live voice-provider evidence remains assigned to later voice/parity verification.

P5a is the next application phase: reconcile the existing schema/reference and Storage requirements, then prepare its scoped implementation prompt. P5b proves application ownership and RLS behavior. Do not implement P5 from this P4 record.

