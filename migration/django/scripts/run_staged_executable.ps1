param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string] $ExecutablePath,
    [Parameter(Mandatory = $true, Position = 1)]
    [string] $WorkingDirectory,
    [Parameter(Position = 2)]
    [string] $ExpectedSha256,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $ExecutableArguments
)

$ErrorActionPreference = 'Stop'
$source = (Resolve-Path -LiteralPath $ExecutablePath).Path
$working = (Resolve-Path -LiteralPath $WorkingDirectory).Path
$sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash
if ($ExpectedSha256 -and $sourceHash -ne $ExpectedSha256) {
    throw 'The staged executable failed its pinned SHA-256 check.'
}

$staged = Join-Path $env:TEMP ("voiceform-tool-" + [guid]::NewGuid().ToString('N') + [IO.Path]::GetExtension($source))
$exitCode = 1
try {
    Copy-Item -LiteralPath $source -Destination $staged
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $staged).Hash -ne $sourceHash) {
        throw 'The staged executable does not match its source hash.'
    }
    Push-Location -LiteralPath $working
    try {
        & $staged @ExecutableArguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
}
finally {
    if (Test-Path -LiteralPath $staged) {
        Remove-Item -LiteralPath $staged -Force
    }
}

exit $exitCode
