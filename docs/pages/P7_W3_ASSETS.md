# P7 W3 assets and provenance

Auth forms and views remain in `migration/django/apps/accounts/`; the protected and public shells are `templates/base_app.html` and `templates/base_public.html`. P4 session middleware, session storage, CSRF, and provider client are reused. Application view access checks derive authority from the verified `SupabaseUser` and fail closed.

React/Vite reference screenshots and markup are preserved under [evidence/w3/legacy](evidence/w3/legacy/). Synthetic, no-network Django captures are under [evidence/w3/post-wave-review-20261012/django](evidence/w3/post-wave-review-20261012/django/). Recovery implementation does not accept or forward reset tokens.
