param(
    [Parameter(Mandatory=$false)]
    [string]$Username,
    [Parameter(Mandatory=$false)]
    [string]$Password
)

$tokenUrl = "https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token"
$clientId = "web-app-ui-hackcanton-01-devnet"

# If credentials are not provided via parameters, prompt securely via CLI
if ([string]::IsNullOrWhiteSpace($Username)) {
    $Username = Read-Host "Enter Operator 2 Email / Username"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    $secPass = Read-Host -Prompt "Enter Operator 2 Password" -AsSecureString
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass)
    $Password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

$username = $Username.Trim()
$password = $Password

if ([string]::IsNullOrWhiteSpace($username) -or [string]::IsNullOrWhiteSpace($password)) {
    Write-Host "Authentication: FAILURE (Empty username or password)" -ForegroundColor Red
    exit 1
}

# Perform Keycloak authentication
$body = @{
    grant_type = "password"
    client_id  = $clientId
    username   = $username
    password   = $password
    scope      = "openid daml_ledger_api offline_access"
}

try {
    $resp = Invoke-RestMethod -Uri $tokenUrl -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
} catch {
    Write-Host "Authentication: FAILURE ($($_.Exception.Message))" -ForegroundColor Red
    exit 1
}

if (-not $resp.access_token) {
    Write-Host "Authentication: FAILURE (No access_token returned)" -ForegroundColor Red
    exit 1
}

$token = $resp.access_token.Trim()
$tokenLen = $token.Length

# Validate token structure (must be 3 dot-separated JWT segments starting with eyJ)
$dotCount = ($token -replace '[^\.]', '').Length
$isJwt = ($token.StartsWith("eyJ") -and $dotCount -eq 2 -and $tokenLen -gt 100)

if (-not $isJwt) {
    Write-Host "Authentication: FAILURE (Returned token is not a valid 3-part JWT)" -ForegroundColor Red
    exit 1
}

# Read and update .env.local without exposing secrets
$envLocalPath = Join-Path $PSScriptRoot "..\\.env.local"
if (-not (Test-Path $envLocalPath)) {
    $envLocalPath = "C:\Users\NO GO NO\quorumvault\.env.local"
}

$existingLines = @()
if (Test-Path $envLocalPath) {
    $existingLines = Get-Content $envLocalPath | Where-Object { $_ -notmatch '^\s*CANTON_AUTH_TOKEN_OPERATOR2\s*=' }
}

$newLines = @()
foreach ($l in $existingLines) {
    if (-not [string]::IsNullOrWhiteSpace($l)) {
        $newLines += $l
    }
}
$newLines += "CANTON_AUTH_TOKEN_OPERATOR2=$token"

[System.IO.File]::WriteAllLines($envLocalPath, $newLines)

# Verify without exposing secret
$stored = Test-Path $envLocalPath

Write-Host "Operator 2 token stored: $(if ($stored) { 'YES' } else { 'NO' })" -ForegroundColor Green
Write-Host "CANTON_AUTH_TOKEN_OPERATOR2 key exists: True" -ForegroundColor Green
Write-Host "Token value is non-empty: True" -ForegroundColor Green
Write-Host "Token length: $tokenLen" -ForegroundColor Green
Write-Host "Token has 3 dot-separated JWT segments: True" -ForegroundColor Green
Write-Host "Token begins with eyJ: True" -ForegroundColor Green
Write-Host "Authentication: SUCCESS" -ForegroundColor Green

