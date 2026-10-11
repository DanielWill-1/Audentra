# P6 rollback runbook

P6 adds a disabled-by-default page fallback. Rollback uses configuration and route ownership changes; it does not need schema changes or deletion of shell files.

## Disable all legacy forwarding

Set `P6_LEGACY_FALLBACK_ENABLED=false` (or remove it; false is the default) and restart the Django process. Manifest page URLs then return the local 404 while Django-owned Auth, health and API endpoints continue to resolve normally. Set the flag back to `true` only with a valid `P6_LEGACY_ORIGIN` and the reviewed inventory present.

## Roll a single future P7 page back

For a page later assigned to Django, restore the exact legacy fallback URL pattern before the owning Django page pattern, preserving the canonical path and GET/HEAD behavior. Keep the reviewed manifest route and its owner set to `legacy-fallback`. Restart Django and verify the page through the fixed configured legacy origin with `X-Legacy-Proxy: 1`. Re-run its visual, route and asset checks before considering it restored.

The current `P6_DJANGO_OWNED_ROUTES` setting is only a DEBUG/preview synthetic fixture used to prove a test route can be locally owned. It renders the P6 shell fixture and never stands in for product ownership. Do not use it as the P7 rollback mechanism.

## Asset or manifest rollback

If the legacy build changes unexpectedly, leave fallback enabled only if every requested document and asset still matches the inventory. A digest mismatch returns a sanitized 502. To restore service, restore the preserved reviewed build or prepare a new reviewed build and update `migration/django/config/p6_legacy_assets.json` together with its inventory documentation. Do not weaken digest checks or add a wildcard route.

If `docs/parity/route-manifest.json` changes, the hard-coded digest/route ownership lock makes fallback fail closed. Review route category and owner changes, update `migration/django/config/p6_route_ownership.json` and `docs/rendering/P6_ROUTE_OWNERSHIP.json` together, and rerun route, Auth exclusion and denial tests before re-enabling traffic.

## Verify recovery

From `migration/django/`, use isolated test settings and local loopback preview only:

```powershell
$storePython = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\PythonSoftwareFoundation.Python.3.12_qbz5n2kfra8p0\python.exe'
$env:PYTHONPATH = (Resolve-Path .\.venv-p2\Lib\site-packages).Path
$env:DJANGO_SETTINGS_MODULE = 'config.settings.test'
& $storePython -m pytest -q -p no:cacheprovider tests/test_p6_legacy.py tests/test_p6_rendering.py
& $storePython manage.py check
```

Use `scripts/p6_legacy_preview.py` and `scripts/p6_django_preview.py` only on `127.0.0.1` for browser verification. Never substitute a production host, hosted identity/data probe or live provider call into rollback testing.
