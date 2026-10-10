$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $root
$env:UV_CACHE_DIR = Join-Path $root '.uv-cache'
$env:UV_PROJECT_ENVIRONMENT = '.venv-p2'

uv run --offline python scripts/check_static.py --prepare
if ($LASTEXITCODE -ne 0) { throw 'Tailwind download or digest verification failed.' }

$binary = (Resolve-Path '.state\tailwindcss-windows-x64.exe').Path
$expectedSha256 = '67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346'
& scripts/run_staged_executable.ps1 $binary $root $expectedSha256 `
    --config config/tailwind.config.cjs `
    --input assets/tailwind.input.css `
    --output static/css/app.css `
    --minify
if ($LASTEXITCODE -ne 0) { throw 'Tailwind compilation failed.' }

uv run --offline python scripts/check_static.py --verify
if ($LASTEXITCODE -ne 0) { throw 'Compiled CSS token verification failed.' }
