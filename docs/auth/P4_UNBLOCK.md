# P4 current development setup

**Updated:** 2026-10-11. The owner's revised development-only scope supersedes this file's earlier Gmail/SMTP instructions.

The supplied publishable key is configured. The existing Supabase development project has mandatory signup confirmation disabled with owner authorization. Fresh hosted signup, login, server session, refresh, password change and logout passed, including a real HTMX browser check.

No Gmail, custom SMTP, paid plan, React compatibility or old-account testing is required. Forgotten-password email recovery remains separate and unavailable; the website states that limitation.

See [P4_REPORT.md](P4_REPORT.md) for results and production follow-ups. Credential replacement and local generated-build cleanup are prepared; the actual retirement of exposed keys still needs explicit approval because automatic approval review rejected the broader revocation operation.

Run the new UI from migration/django/ using the private environment already configured:

```powershell
$env:UV_CACHE_DIR = ".uv-cache"
$env:UV_PROJECT_ENVIRONMENT = ".venv-p2"
uv run python manage.py runserver 127.0.0.1:8000
```

Open http://127.0.0.1:8000/signup/ or /login/. Restart any existing Django or Vite process to reload environment changes.
