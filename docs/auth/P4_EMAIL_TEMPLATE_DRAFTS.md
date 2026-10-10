# P4 Auth email template drafts

**Superseded:** The owner replaced this proposal with development-only signup without mandatory email confirmation on 2026-10-11. These templates were not applied and are not a P4 acceptance gate. See [P4_REPORT.md](P4_REPORT.md). Retain this file only as historical planning evidence.

**Status:** Blocked draft; hosted templates remain unchanged. Current Auth settings are recorded in [P4_HOSTED_CONFIG_BEFORE.json](P4_HOSTED_CONFIG_BEFORE.json) and [P4_HOSTED_CONFIG_AFTER.json](P4_HOSTED_CONFIG_AFTER.json).

The owner selected Supabase Auth email/password only. Google and Azure remain disabled. The linked project is on the Free plan, email confirmation is required, and no custom SMTP provider is configured. The Management API rejected an idempotent template PATCH with HTTP 400: `Email template modification is not available for free tier projects using the default email provider. Please upgrade your plan or configure a custom SMTP provider.` For the current implementation and designated mailbox, configure a custom SMTP provider; a free development setup is documented in [P4_UNBLOCK.md](P4_UNBLOCK.md) before applying these templates or testing live confirmation/recovery.

The Django service passes the same exact callback for signup and recovery:

- Signup: `http://127.0.0.1:8000/auth/confirm/`
- Recovery: `http://127.0.0.1:8000/auth/confirm/`

The confirmation template should use `.TokenHash` with `type=signup` for that exact Django redirect and preserve the current `.ConfirmationURL` branch for every other redirect. The recovery template should similarly use `.TokenHash` with `type=recovery` for the Django redirect and preserve the legacy branch. Django stages the token server-side; access/refresh tokens must not be placed in the email URL.

## Confirmation template draft

After custom SMTP makes Auth template edits available, use a conditional branch like this while preserving the existing text and link for the legacy fallback:

```html
{{ if eq .RedirectTo "http://127.0.0.1:8000/auth/confirm/" }}
<h2>Confirm your email address</h2>
<p>Follow the link below to confirm this email address and finish signing up.</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=signup">Confirm email address</a></p>
{{ else }}
<h2>Confirm your email address</h2>
<p>Follow the link below to confirm this email address and finish signing up.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
{{ end }}
```

## Password recovery template draft

```html
{{ if eq .RedirectTo "http://127.0.0.1:8000/auth/confirm/" }}
<h2>Reset your password</h2>
<p>We received a request to reset your password. Follow the link below to choose a new one.</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
{{ else }}
<h2>Reset your password</h2>
<p>We received a request to reset your password. Follow the link below to choose a new one.</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
{{ end }}
```

The callback currently has no query string before the token parameters. If that changes, encode parameters and retest both stacks. Before applying, preview both branches, compare the legacy copy/link with the captured current templates, record a sanitized after snapshot, and then run the single-account confirmation and recovery checks. Do not disable confirmation or add an organization member with broader project access to work around the Free-plan restriction.

References: [Supabase Auth email template variables](https://supabase.com/docs/guides/auth/auth-email-templates), [redirect URL allowlists](https://supabase.com/docs/guides/auth/redirect-urls), and [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
