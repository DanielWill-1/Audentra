param(
    [ValidateSet('inspect','development','prepare-rotation','rotate')][string]$Action = 'inspect',
    [string]$ApprovedSecretKeyId
)
$ErrorActionPreference = 'Stop'
if ($Action -eq 'rotate' -and -not $ApprovedSecretKeyId) {
    throw 'Exact secret-key retirement requires explicit owner approval and its ID.'
}
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class P4ManagementCredential {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
 public struct Credential { public UInt32 Flags; public UInt32 Type; public IntPtr TargetName; public IntPtr Comment; public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten; public UInt32 CredentialBlobSize; public IntPtr CredentialBlob; public UInt32 Persist; public UInt32 AttributeCount; public IntPtr Attributes; public IntPtr TargetAlias; public IntPtr UserName; }
 [DllImport("Advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool Read(string target, UInt32 type, UInt32 flags, out IntPtr ptr);
 [DllImport("Advapi32.dll", EntryPoint="CredFree")] public static extern void Free(IntPtr ptr);
}
'@
$credentialPtr = [IntPtr]::Zero
if (-not [P4ManagementCredential]::Read('Supabase CLI:supabase',1,0,[ref]$credentialPtr)) { throw 'CLI credential unavailable' }
try {
    $credential = [Runtime.InteropServices.Marshal]::PtrToStructure($credentialPtr,[type][P4ManagementCredential+Credential])
    $credentialBytes = New-Object byte[] $credential.CredentialBlobSize
    [Runtime.InteropServices.Marshal]::Copy($credential.CredentialBlob,$credentialBytes,0,$credentialBytes.Length)
    $cliToken = [Text.Encoding]::UTF8.GetString($credentialBytes).Trim([char]0,[char]10,[char]13,[char]32)
} finally { [P4ManagementCredential]::Free($credentialPtr) }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$projectRef = [IO.File]::ReadAllText((Join-Path $repoRoot 'supabase/.temp/project-ref')).Trim()
$apiHeaders = @{ Authorization = "Bearer $cliToken" }
function Invoke-Management([string]$Method, [string]$Path, $Body = $null) {
    $parameters = @{ Method=$Method; Uri="https://api.supabase.com/v1/projects/$projectRef/$Path"; Headers=$apiHeaders }
    if ($null -ne $Body) { $parameters.ContentType='application/json'; $parameters.Body=($Body | ConvertTo-Json -Depth 10 -Compress) }
    try { Invoke-RestMethod @parameters } catch {
        $safeMessage = ''
        if ($_.ErrorDetails.Message) {
            try {
                $errorPayload = $_.ErrorDetails.Message | ConvertFrom-Json
                $safeMessage = [string]$errorPayload.message
                $safeMessage = [regex]::Replace($safeMessage,'sb_(secret|publishable)_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+','[redacted]')
            } catch { $safeMessage = 'Provider rejected the request' }
        }
        throw ('Management operation failed: '+$Method+' '+$Path+' HTTP '+[int]$_.Exception.Response.StatusCode+' '+$safeMessage)
    }
}
$before = Invoke-Management 'GET' 'config/auth'
if ($Action -eq 'development') {
    # Owner-authorized development change. No database, Storage, or user deletion.
    $null = Invoke-Management 'PATCH' 'config/auth' @{
        mailer_autoconfirm=$true
        site_url='http://127.0.0.1:8000'
        uri_allow_list=''
    }
}
if ($Action -in @('prepare-rotation','rotate')) {
    $revealedKeys = Invoke-Management 'GET' 'api-keys?reveal=true'
    $rootEnvPath = Join-Path $repoRoot '.env'
    $rootEnvText = [IO.File]::ReadAllText($rootEnvPath)
    $publicKey = [regex]::Match($rootEnvText,'(?m)^VITE_SUPABASE_ANON_KEY=([^\r\n]+)').Groups[1].Value.Trim()
    if (-not $publicKey.StartsWith('sb_publishable_')) { throw 'Publishable key must be configured first' }
    $generatedRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot 'dist'))
    if (-not $generatedRoot.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Generated root outside workspace' }
    $generatedFiles = @(Get-ChildItem -LiteralPath $generatedRoot -File -Recurse | Where-Object { $_.Extension -in @('.js','.html','.map','.json') })
    $compromised = @($revealedKeys | Where-Object {
        $candidate = $_
        $candidate.type -eq 'secret' -and $candidate.api_key -and @($generatedFiles | Where-Object { [IO.File]::ReadAllText($_.FullName).Contains($candidate.api_key) }).Count -gt 0
    })
    if ($Action -eq 'rotate') {
        $compromised = @($revealedKeys | Where-Object { $_.type -eq 'secret' -and $_.name -eq 'default' -and $_.id -eq $ApprovedSecretKeyId })
        if ($compromised.Count -ne 1) { throw 'Approved existing default secret key not found' }
    }
    $replacement = @($revealedKeys | Where-Object { $_.type -eq 'secret' -and $_.name -eq 'p4_development_admin' })
    if ($replacement.Count -eq 0) {
        $replacement = @(Invoke-Management 'POST' 'api-keys?reveal=true' @{type='secret';name='p4_development_admin';description='Development test account cleanup; never used by the website or browser'})
    }
    if ($replacement.Count -ne 1 -or -not $replacement[0].api_key.StartsWith('sb_secret_')) { throw 'Replacement credential unavailable' }
    $djangoEnvPath = Join-Path $repoRoot 'migration/django/.env'
    $djangoEnvText = [IO.File]::ReadAllText($djangoEnvPath)
    $adminEntry = 'SUPABASE_TEST_ADMIN_KEY=' + $replacement[0].api_key
    if ($djangoEnvText -match '(?m)^SUPABASE_TEST_ADMIN_KEY=') {
        $djangoEnvText = [regex]::Replace($djangoEnvText,'(?m)^SUPABASE_TEST_ADMIN_KEY=[^\r\n]*',$adminEntry)
    } else { $djangoEnvText += "`r`n$adminEntry`r`n" }
    [IO.File]::WriteAllText($djangoEnvPath,$djangoEnvText,(New-Object Text.UTF8Encoding($false)))
    $parityEntry = 'PARITY_SUPABASE_SERVICE_ROLE_KEY=' + $replacement[0].api_key
    if ($rootEnvText -match '(?m)^PARITY_SUPABASE_SERVICE_ROLE_KEY=') {
        $rootEnvText = [regex]::Replace($rootEnvText,'(?m)^PARITY_SUPABASE_SERVICE_ROLE_KEY=[^\r\n]*',$parityEntry)
    } else { $rootEnvText += "`r`n$parityEntry`r`n" }
    [IO.File]::WriteAllText($rootEnvPath,$rootEnvText,(New-Object Text.UTF8Encoding($false)))
    $legacyStatus = $null
    if ($Action -eq 'rotate') {
        foreach ($oldKey in $compromised) {
            $null = Invoke-Management 'DELETE' ('api-keys/'+$oldKey.id+'?was_compromised=true&reason=development_frontend_exposure')
        }
        $legacyStatus = Invoke-Management 'PUT' 'api-keys/legacy?enabled=false'
        if ($legacyStatus.enabled -ne $false) { throw 'Legacy credential deactivation not confirmed' }
    }
    $cleaned = 0
    foreach ($generatedFile in $generatedFiles) {
        $buildText = [IO.File]::ReadAllText($generatedFile.FullName)
        $safeBuildText = [regex]::Replace($buildText,'sb_secret_[A-Za-z0-9_-]+',$publicKey)
        foreach ($oldKey in $revealedKeys) {
            if ($oldKey.type -eq 'legacy' -and $oldKey.api_key) { $safeBuildText = $safeBuildText.Replace($oldKey.api_key,$publicKey) }
        }
        if ($safeBuildText -ne $buildText) {
            [IO.File]::WriteAllText($generatedFile.FullName,$safeBuildText,(New-Object Text.UTF8Encoding($false)))
            $cleaned++
        }
    }
    $remainingKeys = Invoke-Management 'GET' 'api-keys?reveal=false'
    if ($Action -eq 'rotate') {
        foreach ($oldKey in $compromised) { if ($remainingKeys.id -contains $oldKey.id) { throw 'Compromised key still listed' } }
    }
    [ordered]@{
        captured_at_utc=[DateTime]::UtcNow.ToString('o')
        replacement_secret_id=$replacement[0].id
        compromised_secret_ids_identified=@($compromised | ForEach-Object { $_.id })
        revocation_completed=($Action -eq 'rotate')
        legacy_api_keys_enabled= $(if ($null -ne $legacyStatus) { $legacyStatus.enabled } else { $null })
        generated_files_cleaned=$cleaned
        local_consumers_updated=$true
        external_ci_secrets_updated=$false
        website_uses_only_publishable_key=$true
    } | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $repoRoot 'docs/auth/P4_CREDENTIAL_ROTATION.json')
    Write-Output ('Replacement credential prepared; generated files cleaned: '+$cleaned+'; revocation completed: '+($Action -eq 'rotate'))
}
$after = Invoke-Management 'GET' 'config/auth'
$keys = Invoke-Management 'GET' 'api-keys?reveal=false'
$safe = [ordered]@{
    captured_at_utc=[DateTime]::UtcNow.ToString('o')
    email_confirmation_required_before=(-not $before.mailer_autoconfirm)
    email_confirmation_required=(-not $after.mailer_autoconfirm)
    email_enabled=$after.external_email_enabled
    smtp_configured=[bool]$after.smtp_host
    site_url=$after.site_url
    uri_allow_list=$after.uri_allow_list
    google_enabled=$after.external_google_enabled
    azure_enabled=$after.external_azure_enabled
    key_metadata=@($keys | ForEach-Object { [ordered]@{id=$_.id;name=$_.name;type=$_.type} })
}
if ($Action -eq 'development') {
    $safe | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -LiteralPath (Join-Path $repoRoot 'docs/auth/P4_DEVELOPMENT_CONFIG.json')
}
$safe | ConvertTo-Json -Depth 5
