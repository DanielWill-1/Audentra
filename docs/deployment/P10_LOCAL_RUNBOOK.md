# P10 local operation runbook

**Target:** native Windows, the existing Supabase development project, and the locked Django environment. The named `local-http` profile is loopback-only and uses `DEBUG=False`; its HTTP cookies are intentionally insecure because the listener is local. Production settings keep secure cookies and HTTPS redirect enabled.

## Setup and start

Run these commands in PowerShell from `migration/django`:

```powershell
uv python install 3.12.10 --managed-python --install-dir .python --cache-dir .uv-cache
$env:UV_CACHE_DIR = (Join-Path $PWD '.uv-cache')
$env:UV_PROJECT_ENVIRONMENT = '.venv-p2'
uv sync --locked --python .python\cpython-3.12.10-windows-x86_64-none\python.exe
```

Keep `.env` ignored and private. It should contain the two restricted database URLs, Supabase public Auth settings, and the selected provider modes. The app uses `django_app` on `default` and `django_data` on `supabase`. The preflight never prints URL, key, token, or credential-file values.

Build the existing Tailwind asset, check Django, collect the hashed static manifest, then preflight and start Waitress:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build_static.ps1
uv run --locked python manage.py check --settings=config.settings.local_http
uv run --locked python manage.py collectstatic --noinput --settings=config.settings.local_http
uv run --locked python scripts/p10_preflight.py --profile local-http
uv run --locked python scripts/serve_p10.py --profile local-http
```

Waitress binds to `127.0.0.1:8000` by default. The preflight runs again before the server accepts requests and checks the static manifest, restricted alias names, Auth configuration presence, provider modes, and setting syntax. It makes no network calls. Stop the foreground process with **Ctrl+C**.

The server uses one process and eight request threads by default. It applies a 60-second idle-channel timeout, a 32 KiB header limit, and a 20 MiB body limit. It does not run Django's development `runserver`.

## Health and logs

- `/livez` reports that the Django process is responding. It does not touch the database.
- `/readyz` checks both database aliases and returns a sanitized 503 if either is unavailable.
- `/healthz` keeps the earlier database-readiness behavior for existing monitors.

Operational logs go to `.state/logs/voiceform.log` by default and to the console. Rotation is capped at 1 MB plus three backups. Log records contain fixed event labels and levels; they omit request paths, bodies, IP headers, tokens, and exception messages. Set `DJANGO_LOG_FILE` to a private writable path to change the file location.

## Provider and service modes

Mock speech, TTS, and extraction modes are deterministic demos. The preflight reports the selected mode and whether required real-mode settings are present without calling providers. P3 service routes remain disabled unless `P3_SERVICES_ENABLED=true`; the local profile limits enabled routes to loopback and preserves the request marker, origin, method, size, authentication, CSRF, and rate checks.

Real extraction failures return a sanitized 503 through the API and a visible error on the form page. The app does not turn a real provider failure into a successful mock response. P10 does not call Google, Groq, or another live provider.

## Troubleshooting

- If preflight reports `DJANGO_STATIC_ROOT/run_collectstatic_first`, rebuild Tailwind if needed, run `collectstatic` with `config.settings.local_http`, then run preflight again.
- If `/livez` responds but `/readyz` returns 503, the server is running while a database alias is unavailable. Check only the ignored `.env` aliases and restricted roles; do not switch either alias to a management role.
- If the bind fails, choose a free loopback port with `--port`. Public interface binds are rejected by the server command.
- If real provider mode is selected with incomplete settings, preflight reports setting names only. Configure credentials privately or return to the mock/demo mode.
- The local profile sets `SESSION_COOKIE_SECURE=False` and disables SSL redirect for HTTP loopback use. Use the `production` profile only behind the private TLS proxy described in the deployment runbook.

## Safe schema operations

P10 local startup does not apply migrations. Inspect Django-owned plans with:

```powershell
uv run --locked python manage.py migrate --plan --database=default
```

Apply only reviewed Django-owned migrations to `default`, after a separate backup and rollout decision. Never run Django migration commands against the `supabase` alias, hosted application schema, or production during this local workflow.
