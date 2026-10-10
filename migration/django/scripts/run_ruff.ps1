param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $RuffArguments
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$binary = Join-Path $root '.venv-p2\Scripts\ruff.exe'
if (-not (Test-Path -LiteralPath $binary -PathType Leaf)) {
    throw 'Ruff is not installed in migration/django/.venv-p2.'
}

& (Join-Path $PSScriptRoot 'run_staged_executable.ps1') $binary $root '' @RuffArguments
exit $LASTEXITCODE
