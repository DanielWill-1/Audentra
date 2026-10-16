param(
    [switch]$Local,
    [switch]$Reset,
    [switch]$Yes
)

$ErrorActionPreference = 'Continue'

if (-not $Local) {
    throw 'Pass -Local to confirm this operation targets the loopback Supabase project.'
}
if ($Reset -and -not $Yes) {
    throw 'A reset also requires -Yes.'
}
if (-not $Reset -and $Yes) {
    throw '-Yes is only used together with -Reset.'
}

$djangoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repositoryRoot = (Resolve-Path (Join-Path $djangoRoot '..\..')).Path
$script:stage = 'local_status_command'

function Get-LocalSupabaseStatus {
    $raw = & supabase.cmd status --output json 2>$null
    if ($LASTEXITCODE -ne 0) {
        $script:stage = 'local_status_command_exit_' + [string]$LASTEXITCODE
        throw 'Local Supabase status is unavailable.'
    }

    $script:stage = 'local_status_parse'
    $status = $raw | ConvertFrom-Json
    $script:stage = 'local_endpoint_validation'
    $api = [uri]$status.API_URL
    $database = [uri]$status.DB_URL
    $loopbackHosts = @('localhost', '127.0.0.1', '::1')
    if (
        $api.Scheme -ne 'http' -or
        $api.Port -ne 54321 -or
        $api.Host -notin $loopbackHosts -or
        $database.Scheme -notin @('postgres', 'postgresql') -or
        $database.Port -ne 54322 -or
        $database.Host -notin $loopbackHosts -or
        $status.PUBLISHABLE_KEY -notlike 'sb_publishable_*' -or
        -not $status.SERVICE_ROLE_KEY
    ) {
        throw 'Supabase status is not the expected local project.'
    }
    return $status
}

Push-Location $repositoryRoot
try {
    $env:SUPABASE_TELEMETRY_DISABLED = '1'
    $status = Get-LocalSupabaseStatus

    if ($Reset) {
        $script:stage = 'local_reset'
        & supabase.cmd db reset --local --yes
        if ($LASTEXITCODE -ne 0) {
            throw 'The guarded local database reset failed.'
        }
        $script:stage = 'post_reset_status'
        $status = Get-LocalSupabaseStatus
    }

    $script:stage = 'synthetic_demo_provision'
    $env:P10_LOCAL_SUPABASE_STATUS_JSON = $status | ConvertTo-Json -Compress
    Push-Location $djangoRoot
    try {
        $env:UV_CACHE_DIR = Join-Path $djangoRoot '.uv-cache'
        $env:UV_PROJECT_ENVIRONMENT = '.venv-p2'
        & uv run --locked python scripts/p10_local_supabase.py --local
        if ($LASTEXITCODE -ne 0) {
            throw 'Local Django roles or synthetic demo data could not be provisioned.'
        }
        if ($Reset) {
            $script:stage = 'django_session_migration'
            & uv run --locked python manage.py migrate --noinput --settings=config.settings.local_supabase --database default
            if ($LASTEXITCODE -ne 0) {
                throw 'Local Django session migrations could not be applied.'
            }
        }
    }
    finally {
        Pop-Location
    }
}
catch {
    Write-Error ('Local Supabase setup failed during ' + $script:stage + '. Check Docker Desktop and the local runbook.')
    exit 2
}
finally {
    Remove-Item Env:P10_LOCAL_SUPABASE_STATUS_JSON -ErrorAction SilentlyContinue
    Pop-Location
}
