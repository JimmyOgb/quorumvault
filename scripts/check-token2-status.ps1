# Safe verification script that checks token2 structure WITHOUT printing secrets.
$ErrorActionPreference = "Stop"

$envPath = "C:\Users\NO GO NO\quorumvault\.env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "File .env.local does not exist."
    exit 1
}

$lines = Get-Content $envPath
$token2 = $null
$keyExists = $false

foreach ($line in $lines) {
    if ($line -match '^\s*CANTON_AUTH_TOKEN_OPERATOR2\s*=(.*)$') {
        $keyExists = $true
        $token2 = $matches[1].Trim().Trim('"').Trim("'")
        break
    }
}

Write-Host "CANTON_AUTH_TOKEN_OPERATOR2 key exists: $keyExists"

if ($keyExists -and -not [string]::IsNullOrWhiteSpace($token2)) {
    $len = $token2.Length
    $segments = $token2.Split('.').Count
    $startsWithEyJ = $token2.StartsWith("eyJ")
    
    Write-Host "token value is non-empty: True"
    Write-Host "token length: $len"
    Write-Host "token has 3 dot-separated JWT segments (header.payload.signature): $(if ($segments -eq 3) { 'True' } else { 'False' })"
    Write-Host "token begins with eyJ: $startsWithEyJ"
} else {
    Write-Host "token value is non-empty: False"
    Write-Host "token length: 0"
    Write-Host "token has 3 dot-separated JWT segments (header.payload.signature): False"
    Write-Host "token begins with eyJ: False"
}
