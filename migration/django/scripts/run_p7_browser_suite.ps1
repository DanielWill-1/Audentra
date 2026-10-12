$mediaOnly = $args -contains '--media-only'
$checkOnly = $args -contains '--check-only'
$appOnly = $args -contains '--app-only'
$sourceOnly = $args -contains '--source-only'
$voiceOnly = $args -contains '--voice-only'
$timezoneOnly = $args -contains '--timezone-only'
$ErrorActionPreference = 'Stop'
$runner = Join-Path $PSScriptRoot 'run_p7_browser_suite.cjs'
if ($mediaOnly) {
    & node $runner --media-only
} elseif ($checkOnly) {
    & node $runner --check-only
} elseif ($appOnly) {
    $waveArgument = $args | Where-Object { $_ -match '^--wave=w[3-7]$' } | Select-Object -First 1
    if ($waveArgument) {
        & node $runner --app-only $waveArgument
    } else {
        & node $runner --app-only
    }
} elseif ($sourceOnly) {
    if ($args -contains '--auth-only') {
        & node $runner --source-only --auth-only
    } else {
        & node $runner --source-only
    }
} elseif ($voiceOnly) {
    & node $runner --voice-only
} elseif ($timezoneOnly) {
    & node $runner --timezone-only
} else {
    & node $runner
}
if ($LASTEXITCODE -ne 0) {
    throw 'The P7 desktop/mobile browser suite failed.'
}
