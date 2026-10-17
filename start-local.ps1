param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = $PSScriptRoot
$djangoRoot = Join-Path $repositoryRoot 'migration\django'
$pythonPath = Join-Path $djangoRoot '.python\cpython-3.12.10-windows-x86_64-none\python.exe'
$statePath = Join-Path $djangoRoot '.state\local-supabase.env'
$credentialsPath = Join-Path $djangoRoot '.state\local-demo-credentials.txt'

function Invoke-Checked {
    param(
        [Parameter(Mandatory)]
        [string]$Step,
        [Parameter(Mandatory)]
        [scriptblock]$Command
    )

    Write-Host "`n== $Step =="
    & $Command
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "$Step failed with exit code $exitCode. See the local runbook for recovery steps."
    }
}

if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    throw 'uv is required. Install uv, then run this script again.'
}
if (-not (Get-Command supabase.cmd -ErrorAction SilentlyContinue)) {
    throw 'The Supabase CLI is required. Install it and Docker Desktop, then run this script again.'
}

Push-Location $djangoRoot
try {
    $env:UV_CACHE_DIR = Join-Path $djangoRoot '.uv-cache'
    $env:UV_PROJECT_ENVIRONMENT = '.venv-p2'
    $env:SUPABASE_TELEMETRY_DISABLED = '1'

    if (-not (Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
        Invoke-Checked 'Install managed Python 3.12.10' {
            & uv python install 3.12.10 --managed-python --install-dir .python --cache-dir .uv-cache
        }
    }

    Invoke-Checked 'Sync locked Django dependencies' {
        & uv sync --locked --python $pythonPath
    }

    Push-Location $repositoryRoot
    try {
        Invoke-Checked 'Start local Supabase' { & supabase.cmd start }
        Invoke-Checked 'Apply pending local Supabase forward migrations' {
            & supabase.cmd migration up --local
        }
    }
    finally {
        Pop-Location
    }

    if (-not (Test-Path -LiteralPath $statePath -PathType Leaf) -or
        -not (Test-Path -LiteralPath $credentialsPath -PathType Leaf)) {
        Invoke-Checked 'Provision local demo account and restricted roles' {
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/setup_local_supabase.ps1 -Local
        }
    }

    & scripts/build_static.ps1

    Invoke-Checked 'Apply Django session migrations to the local database' {
        & uv run --locked python manage.py migrate --noinput --settings=config.settings.local_supabase --database default
    }
    Invoke-Checked 'Check Django configuration' {
        & uv run --locked python manage.py check --settings=config.settings.local_supabase
    }
    Invoke-Checked 'Collect static files' {
        & uv run --locked python manage.py collectstatic --noinput --settings=config.settings.local_supabase
    }
    Invoke-Checked 'Check local profile readiness' {
        & uv run --locked python scripts/p10_preflight.py --profile local-supabase
    }

    Write-Host "`nStarting VoiceForm at http://127.0.0.1:$Port/ (press Ctrl+C to stop)."
    Invoke-Checked 'Run the local Django server' {
        & uv run --locked python scripts/serve_p10.py --profile local-supabase --port $Port
    }
}
finally {
    Pop-Location
}
