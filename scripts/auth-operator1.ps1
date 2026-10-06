param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "jimmyogb",
    [Parameter(Mandatory=$false)]
    [string]$Password
)

$tokenUrl = "https://keycloak.naas.noders.services/realms/noders-appsfactory/protocol/openid-connect/token"
$clientId = "web-app-ui-hackcanton-01-devnet"
$expectedSub = "4d809018-bff4-43bf-ae81-08a9d77bd84f"
$endpoint = "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services"

# If credentials are not provided via parameters, prompt securely via CLI
if ([string]::IsNullOrWhiteSpace($Username)) {
    $Username = "jimmyogb"
}

if ([string]::IsNullOrWhiteSpace($Password)) {
    $secPass = Read-Host -Prompt "Enter Operator 1 (jimmyogb) Password" -AsSecureString
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
$parts = $token.Split('.')
if ($parts.Count -ne 3 -or -not $token.StartsWith("eyJ") -or $tokenLen -le 100) {
    Write-Host "Authentication: FAILURE (Returned token is not a valid 3-part JWT)" -ForegroundColor Red
    exit 1
}

# Decode JWT payload to verify subject
$payloadB64 = $parts[1]
while ($payloadB64.Length % 4 -ne 0) { $payloadB64 += "=" }
$payloadB64 = $payloadB64.Replace('-', '+').Replace('_', '/')
$bytes = [Convert]::FromBase64String($payloadB64)
$json = [System.Text.Encoding]::UTF8.GetString($bytes)
$jwtObj = $json | ConvertFrom-Json

$actualSub = $jwtObj.sub
$actualUser = $jwtObj.preferred_username
$expDate = [DateTimeOffset]::FromUnixTimeSeconds($jwtObj.exp).UtcDateTime.ToString('yyyy-MM-dd HH:mm:ss UTC')

Write-Host "`n--- 1. Token Structure & Identity Verification ---" -ForegroundColor Cyan
Write-Host "Token structure valid (3 segments) : True" -ForegroundColor Green
Write-Host "Token length                       : $tokenLen" -ForegroundColor Green
Write-Host "Authenticated Keycloak Username    : $actualUser" -ForegroundColor Green
Write-Host "Token Subject (UUID)               : $actualSub" -ForegroundColor Green
Write-Host "Token Expiration (UTC)             : $expDate" -ForegroundColor Green

if ($actualSub -ne $expectedSub) {
    Write-Host "[FAIL] Token subject $actualSub does not match expected Operator 1 subject $expectedSub" -ForegroundColor Red
    exit 1
}
Write-Host "Subject matches Operator 1 UUID    : True" -ForegroundColor Green

# Verify token against DevNet Ledger API
Write-Host "`n--- 2. DevNet Ledger API Acceptance Verification ---" -ForegroundColor Cyan
$headers = @{
    "Authorization" = "Bearer $token"
    "Accept"        = "application/json"
}

$op1Party = "$actualSub`:12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e"

try {
    $userResp = Invoke-RestMethod -Uri "$endpoint/v2/users/$actualSub" -Headers $headers -TimeoutSec 30
    $cantonUserId = $userResp.user.id
    Write-Host "GET /v2/users/$actualSub           : ACCEPTED (HTTP 200, Canton User: $cantonUserId)" -ForegroundColor Green
} catch {
    Write-Host "GET /v2/users/$actualSub           : FAILED ($($_.Exception.Message))" -ForegroundColor Red
    exit 1
}

try {
    $rightsResp = Invoke-RestMethod -Uri "$endpoint/v2/users/$actualSub/rights" -Headers $headers -TimeoutSec 30
    $hasCanActAs = $false
    $hasCanReadAs = $false
    foreach ($r in $rightsResp.rights) {
        if ($r.kind.CanActAs -and ($r.kind.CanActAs.value.party -like "$actualSub*")) {
            $hasCanActAs = $true
            $op1Party = $r.kind.CanActAs.value.party
        }
        if ($r.kind.CanReadAs -and ($r.kind.CanReadAs.value.party -like "$actualSub*")) {
            $hasCanReadAs = $true
        }
    }
    Write-Host "GET /v2/users/$actualSub/rights    : ACCEPTED (HTTP 200, CanActAs: $hasCanActAs, CanReadAs: $hasCanReadAs)" -ForegroundColor Green
    if (-not $hasCanActAs) {
        Write-Host "[FAIL] User does not possess CanActAs rights for Operator 1 party." -ForegroundColor Red
        exit 1
    }
    Write-Host "Operator 1 Canton Party            : $op1Party" -ForegroundColor Green
} catch {
    Write-Host "GET /v2/users/$actualSub/rights    : FAILED ($($_.Exception.Message))" -ForegroundColor Red
    exit 1
}

try {
    $partyResp = Invoke-RestMethod -Uri "$endpoint/v2/parties/$op1Party" -Headers $headers -TimeoutSec 30
    $isLocal = $partyResp.partyDetails[0].isLocal
    Write-Host "GET /v2/parties/$op1Party : ACCEPTED (HTTP 200, isLocal: $isLocal)" -ForegroundColor Green
} catch {
    Write-Host "GET /v2/parties/$op1Party : FAILED ($($_.Exception.Message))" -ForegroundColor Red
    exit 1
}

# Update session and .env.local without exposing secrets
$env:CANTON_AUTH_TOKEN = $token

$envLocalPath = Join-Path $PSScriptRoot "..\\.env.local"
if (-not (Test-Path $envLocalPath)) {
    $envLocalPath = "C:\Users\NO GO NO\quorumvault\.env.local"
}

$existingLines = @()
if (Test-Path $envLocalPath) {
    $existingLines = Get-Content $envLocalPath | Where-Object { $_ -notmatch '^\s*CANTON_AUTH_TOKEN\s*=' }
}

$newLines = @()
foreach ($l in $existingLines) {
    if (-not [string]::IsNullOrWhiteSpace($l)) {
        $newLines += $l
    }
}
$newLines += "CANTON_AUTH_TOKEN=$token"

[System.IO.File]::WriteAllLines($envLocalPath, $newLines)

Write-Host "`n--- 3. Local Storage Verification ---" -ForegroundColor Cyan
Write-Host "Operator 1 token stored in .env.local : YES" -ForegroundColor Green
Write-Host "Session variable CANTON_AUTH_TOKEN set: YES" -ForegroundColor Green
Write-Host "Authentication: SUCCESS" -ForegroundColor Green
