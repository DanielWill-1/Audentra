# P4 development Auth contracts

**Updated:** 2026-10-11. The owner's development-only scope supersedes the former parallel React/email compatibility contract.

## Identity and configuration

Supabase Auth is the sole identity provider. Django uses the official Supabase Python SDK (2.32.0); Django Auth, operational admin, OAuth and React account compatibility are outside this implementation. SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY configure the runtime. Privileged keys are rejected by the runtime key check. SUPABASE_TEST_ADMIN_KEY is ignored by the website and used only by the explicit hosted probe to delete its own generated account.

Mandatory signup confirmation is disabled on the authorized development project. Signup/login need no verification email. Production must reconsider that configuration. No custom SMTP or email-template edit is required for this development scope.

## Routes

| Route | Methods | Behavior |
|---|---|---|
| /signup/ | GET, POST | Email, matching passwords, optional name metadata; CSRF; rotate/install server session |
| /login/ | GET, POST | Password login; CSRF; optional persistent cookie; safe next path |
| /auth/session/ | GET | Protected account page; verified Supabase identity, refresh if needed |
| /change-password/ | GET, POST | Verified session + CSRF; SDK password update; local logout and fresh login |
| /logout/ | POST | Local-scope Supabase refresh-token revocation; clear server row and cookie |
| /forgot-password/ | GET, POST | Explicit recovery limitation; no email attempt or false delivery acknowledgement |

OAuth, confirmation hash, and old recovery callback routes are removed. HTMX uses server-rendered responses and HX-Redirect for successful navigation; forms also work without JavaScript. Validation errors render through the configured HTMX response handling. HTMX history caching is disabled.

## SDK boundary

Fresh SDK/client per operation; persistence and auto-refresh disabled; finite timeout; no SDK background refresh or mutation retries. Signup/login responses require a UUID identity and validated token pair/expiry. get_user verifies the server-held access token. Explicit refresh uses refresh_session under PostgreSQL locking. Password updates first set the verified, unexpired token pair on the isolated SDK client; the SDK then updates the authenticated user. Local logout uses the SDK's documented admin.sign_out(user JWT, local) operation with the public project key, not a privileged key.

4xx errors are sanitized invalid-details responses; 429 produces a wait response; upstream/network/malformed failures produce 503. Passwords and access/refresh tokens are not rendered or placed in callback URLs.

## Session and API policy

PostgreSQL stores the tokens inside Django sessions; the browser receives only an opaque session cookie. A token-free Supabase principal identifies each verified request. Login/signup rotate the session and CSRF token; expiry is bounded to 14 days. HttpOnly and SameSite=Lax apply; production enables Secure cookies. A nonpersistent login uses a browser-session cookie.

Refresh/logout use canonical rows and locks; a stale save cannot overwrite a newer token generation or recreate a deleted row. Remote verification failures fail closed. Logout clears local state even on provider failure and reports incomplete remote logout.

Service POST routes require verified identity. Cookie-authorized requests need CSRF. A valid bearer-only request with no session cookie may omit CSRF; invalid bearer never falls back to the session, and conflicting identities fail. This is a generic API contract, with no React session integration requirement.

## Evidence and limitations

See [P4_REPORT.md](P4_REPORT.md), [P4_HOSTED_FLOW_RESULTS.json](P4_HOSTED_FLOW_RESULTS.json), [P4_DEVELOPMENT_CONFIG.json](P4_DEVELOPMENT_CONFIG.json) and [P4_CREDENTIAL_ROTATION.json](P4_CREDENTIAL_ROTATION.json).

Fresh-account hosted Auth and real HTMX browser checks passed. Email-based forgotten-password recovery is separate and unimplemented in this development website. Exposed-key revocation awaits explicit approval after automatic approval review blocked the broad operation. Application tables, RLS and Storage remain P5a/P5b.
