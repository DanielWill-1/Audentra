# P10 deployment preparation runbook

**Status:** preparation only. The owner has not selected a production host, domain, proxy product, Auth policy, provider account, or secret store. Nothing in this runbook authorizes publishing, production data changes, DNS, traffic switching, credential changes, or a production soak.

## Supported application topology

P10 packages a single Windows Waitress WSGI process behind a same-host TLS reverse proxy:

```text
Browser -- HTTPS --> selected reverse proxy -- loopback HTTP --> Waitress 127.0.0.1:8000 --> Django
```

Waitress 3.0.2 is pinned for the Windows target. It supports CPython on Windows and is a pure-Python WSGI server; it does not terminate TLS. WhiteNoise 6.12.0 serves the collected hashed static files from the Django process. See the [Waitress guide](https://docs.pylonsproject.org/projects/waitress/en/stable/), [Waitress proxy settings](https://docs.pylonsproject.org/projects/waitress/en/stable/reverse-proxy.html), [Waitress limits](https://docs.pylonsproject.org/projects/waitress/en/stable/arguments.html), and [WhiteNoise's Django setup](https://whitenoise.readthedocs.io/en/stable/django.html).

The supported upstream contract is:

1. Terminate TLS at the chosen proxy and redirect public HTTP to HTTPS there.
2. Keep the Waitress port reachable only from the same host. The launch command rejects non-loopback binds.
3. Forward the original `Host` value unchanged so Django checks it against `DJANGO_ALLOWED_HOSTS`.
4. Overwrite `X-Forwarded-For` with the client address and use exactly one same-host proxy at `P10_TRUSTED_PROXY_IP` (`127.0.0.1` or `::1`). Waitress trusts only that peer and only the `X-Forwarded-For` header.
5. Remove any client-supplied `X-VoiceForm-Proxy-Token` and inject the private `P3_PROXY_TOKEN` only on the upstream request. Keep this value out of browser HTML and public headers.
6. Enforce the same 20 MiB request-body limit at the proxy. Keep upstream request timeouts within the app's configured provider timeout and Waitress's 60-second channel timeout.
7. Do not use `X-Forwarded-Proto` to set Django's HTTPS state. Waitress uses a fixed HTTPS WSGI scheme in the production profile, and Django's `SECURE_PROXY_SSL_HEADER` remains unset. The proxy must only forward HTTPS traffic to the production listener.

The API's existing `X-Internal-Api-Token` remains a browser-visible request marker. Verified Supabase identity, session CSRF, exact host/origin/method validation, payload limits, the proxy token, and the rate limiter provide the request controls. A marker value is not a substitute for identity or CSRF.

## Prepare a selected host later

1. The owner selects a Windows host, TLS proxy, public domain, service owner, recovery contact, Auth policy, provider accounts, and private secret store.
2. Install the pinned Python 3.12.10 runtime and run the locked sync from `migration/django`:

   ```powershell
   uv python install 3.12.10 --managed-python --install-dir .python --cache-dir .uv-cache
   $env:UV_CACHE_DIR = (Join-Path $PWD '.uv-cache')
   $env:UV_PROJECT_ENVIRONMENT = '.venv-p2'
   uv sync --locked --python .python\cpython-3.12.10-windows-x86_64-none\python.exe
   ```
3. Copy the needed values from `.env.production.example` into the host's private environment. Replace every placeholder. Do not put secrets in source, command arguments, reports, or browser settings.
4. Set explicit `DJANGO_ALLOWED_HOSTS`, HTTPS `DJANGO_PUBLIC_ORIGIN`, matching `DJANGO_CSRF_TRUSTED_ORIGINS`, the two restricted Postgres aliases, and the public Supabase Auth values. Keep `default` on `django_app`/`django` and `supabase` on `django_data`/`public`.
5. Configure `P10_TRUSTED_PROXY_IP=127.0.0.1`. Keep `P3_SERVICES_ENABLED=false` until the owner is ready to enable the upstream service route. When enabled, use `P3_SERVICE_ACCESS_MODE=trusted-proxy`, a private random `P3_PROXY_TOKEN`, a non-default request marker, and explicit HTTPS `P3_ALLOWED_ORIGINS`.
6. Run the static build, `collectstatic`, sanitized preflight, `manage.py check --deploy --settings=config.settings.prod`, and `manage.py migrate --plan --database=default`.
7. Review every command result and the proxy's TLS, firewall, body-size, forwarded-header, token stripping/injection, and restart settings before any separate deployment decision.
8. Start with `uv run --locked python scripts/serve_p10.py --profile production`. It binds to loopback, uses one process/eight threads by default, fixes the WSGI scheme to HTTPS, accepts only the configured local proxy for `X-Forwarded-For`, and keeps tracebacks out of responses.
9. Check `/livez` for process readiness and `/readyz` for both restricted database aliases. Provider health calls are excluded by default; do not use a billable provider smoke as a routine readiness probe.

`P10_READINESS.md` records the tested local profile and the exact remaining deployment gates. The prepared P10 profile has not been tested against a selected TLS proxy or an external host. Django's deployment check reports `security.W004` while `DJANGO_HSTS_SECONDS=0`; after the owner selects a permanent public domain and confirms HTTPS-only access, set and review an appropriate HSTS duration. Subdomain coverage and preload stay disabled until the owner explicitly reviews them.

## Rate limits, monitoring, and release checks

The process-local limiter is shared by Waitress threads in the single process. It keeps at most 1,024 active client keys, allows 30 service requests per 60 seconds per key, and returns `Retry-After` on denial. Its state clears on restart. Multiple processes or hosts each have independent counters; do not claim cluster-wide protection or add workers without a separately tested shared limiter or proxy limit.

Use the rotating sanitized app log, process/service-manager events, proxy TLS/access telemetry, `/livez`, and `/readyz`. Protect proxy logs from query strings, cookies, and authorization headers. The local preflight validates provider mode and setting presence only; it does not prove a real provider is operational.

Before a later release, reuse unchanged P9 evidence and collect new run-scoped evidence for the selected host, effective proxy configuration, Auth/data readiness, static files, service denials, account isolation, expected provider mode, migrations, restart, restore, and an owner-approved soak. Keep code/traffic rollback separate from data restoration. No deployment, traffic change, production migration, external credential change, or soak is performed by P10.
