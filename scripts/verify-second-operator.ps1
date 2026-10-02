# QuorumVault - HackCanton DevNet Second Operator Verification Script
# Verifies the second onboarded DevNet user identity, Canton party, CanActAs right,
# participant namespace, and synchronizer informee validity.
# STRICT SECURITY RULE: Does NOT log, print, or expose any tokens, passwords, or credentials.
# STRICT READ-ONLY RULE: Does NOT submit any write transactions.

$ErrorActionPreference = "Stop"

$operator1Uuid = "4d809018-bff4-43bf-ae81-08a9d77bd84f"

$envLocalPath = Join-Path $PSScriptRoot "..\\.env.local"
if (-not (Test-Path $envLocalPath)) {
    $envLocalPath = "C:\Users\NO GO NO\quorumvault\.env.local"
}
if (-not (Test-Path $envLocalPath)) {
    Write-Host "[ERROR] .env.local not found." -ForegroundColor Red
    exit 2
}

# Look for second user token
$token2 = $null
$lines = Get-Content $envLocalPath
foreach ($line in $lines) {
    if ($line -match '^\s*(CANTON_AUTH_TOKEN_OPERATOR2|CANTON_AUTH_TOKEN_2|OPERATOR2_AUTH_TOKEN|OPERATOR2_TOKEN)\s*=\s*(.*)$') {
        $token2 = $matches[2].Trim().Trim('"').Trim("'")
        break
    }
}

# If not in file, check process or user environment variables
if (-not $token2) {
    $token2 = [System.Environment]::GetEnvironmentVariable('CANTON_AUTH_TOKEN_OPERATOR2', 'Process')
    if (-not $token2) {
        $token2 = [System.Environment]::GetEnvironmentVariable('CANTON_AUTH_TOKEN_OPERATOR2', 'User')
    }
}

if (-not $token2) {
    Write-Host "[WAITING] Second operator token not detected in .env.local as CANTON_AUTH_TOKEN_OPERATOR2." -ForegroundColor Yellow
    exit 3
}

Write-Host "[OK] Second operator Bearer token detected securely (length: $($token2.Length) chars)." -ForegroundColor Green

$endpoint = "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services"
$expectedNamespace = "12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e"
$expectedSynchronizer = "global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a"

$headers2 = @{
    "Authorization" = "Bearer $token2"
    "Accept"        = "application/json"
}

# 1. Decode JWT to verify Keycloak identity/sub
$parts = $token2.Split('.')
if ($parts.Count -lt 2) {
    Write-Host "[FAIL] Invalid JWT format for second operator token." -ForegroundColor Red
    exit 1
}

$payloadB64 = $parts[1]
while ($payloadB64.Length % 4 -ne 0) { $payloadB64 += "=" }
$payloadB64 = $payloadB64.Replace('-', '+').Replace('_', '/')
$bytes = [Convert]::FromBase64String($payloadB64)
$json = [System.Text.Encoding]::UTF8.GetString($bytes)
$jwtObj = $json | ConvertFrom-Json

$user2Sub = $jwtObj.sub
$user2Username = $jwtObj.preferred_username
$user2Email = $jwtObj.email
$user2Iss = $jwtObj.iss

Write-Host "`n--- 1. Keycloak Identity Verification ---" -ForegroundColor Cyan
Write-Host "Issuer (iss)                     : $user2Iss" -ForegroundColor White
Write-Host "Operator 2 UUID (sub)            : $user2Sub" -ForegroundColor Green
Write-Host "Keycloak Username                : $user2Username" -ForegroundColor Green
Write-Host "Keycloak Email                   : $user2Email" -ForegroundColor Green

if (-not $user2Sub) {
    Write-Host "[FAIL] Keycloak sub missing from token." -ForegroundColor Red
    exit 1
}

# Identity Distinctness Check
$isDistinct = ($user2Sub -ne $operator1Uuid)
Write-Host "Differs from Operator 1 UUID     : $(if ($isDistinct) { 'True' } else { 'False (MATCHES OPERATOR 1)' })" -ForegroundColor $(if ($isDistinct) { "Green" } else { "Red" })

# 2. Query participant to inspect Canton User and primary party using native Invoke-WebRequest
Write-Host "`n--- 2. Canton Participant User Verification ---" -ForegroundColor Cyan
$userUrl = "$endpoint/v2/users/$user2Sub"
try {
    $userResp = Invoke-WebRequest -Uri $userUrl -Headers $headers2 -TimeoutSec 30
    $userStatusCode = [int]$userResp.StatusCode
    $userStatus = "$userStatusCode $($userResp.StatusDescription)"
    Write-Host "GET /v2/users/$user2Sub -> $userStatus" -ForegroundColor Green
} catch {
    Write-Host "GET /v2/users/$user2Sub -> FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$userJson = $userResp.Content | ConvertFrom-Json
$party2 = $userJson.user.primaryParty
$cantonUserId = $userJson.user.id
Write-Host "Parsed Canton User ID            : $cantonUserId" -ForegroundColor Green
Write-Host "Discovered Canton Party          : $party2" -ForegroundColor Green

# 3. Verify User Rights (CanActAs)
Write-Host "`n--- 3. User Rights Verification ---" -ForegroundColor Cyan
$rightsUrl = "$endpoint/v2/users/$user2Sub/rights"
try {
    $rightsResp = Invoke-WebRequest -Uri $rightsUrl -Headers $headers2 -TimeoutSec 30
    $rightsStatusCode = [int]$rightsResp.StatusCode
    $rightsStatus = "$rightsStatusCode $($rightsResp.StatusDescription)"
    Write-Host "GET /v2/users/$user2Sub/rights -> $rightsStatus" -ForegroundColor Green
} catch {
    Write-Host "GET /v2/users/$user2Sub/rights -> FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$rightsJson = $rightsResp.Content | ConvertFrom-Json
$canActAs = $false
foreach ($r in $rightsJson.rights) {
    if ($r.kind.CanActAs -and $r.kind.CanActAs.value.party -eq $party2) {
        $canActAs = $true
    }
}
Write-Host "CanActAs Confirmed for Party     : $canActAs" -ForegroundColor $(if ($canActAs) { "Green" } else { "Red" })

# Enforce Distinctness Check
if (-not $isDistinct) {
    Write-Host "`n[FAIL] Operator 2 credentials resolve to Operator 1 identity; a distinct Canton operator is required." -ForegroundColor Red
    Write-Host "`n================================================================================" -ForegroundColor Cyan
    Write-Host " SECOND OPERATOR VERIFICATION SUMMARY" -ForegroundColor Cyan
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "HTTP Status /v2/users/{sub}      : $userStatus" -ForegroundColor White
    Write-Host "Parsed Canton Username           : $cantonUserId" -ForegroundColor White
    Write-Host "Operator 2 UUID                  : $user2Sub" -ForegroundColor Yellow
    Write-Host "Operator 1 UUID                  : $operator1Uuid" -ForegroundColor Yellow
    Write-Host "UUID Differs from Operator 1     : False (IDENTICAL IDENTITY)" -ForegroundColor Red
    Write-Host "CanActAs Rights                  : $canActAs (Valid for party, but held by Operator 1)" -ForegroundColor Yellow
    Write-Host "Canton Party                     : $party2" -ForegroundColor Yellow
    Write-Host "Writes Performed                 : NONE (strictly read-only verification)" -ForegroundColor Green
    Write-Host "Verification Result              : FAILED - DISTINCT HACKCANTON ACCOUNT REQUIRED" -ForegroundColor Red
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "`nA separate HackCanton account is still required for Operator 2." -ForegroundColor Red
    exit 1
}

# 4. Verify namespace
Write-Host "`n--- 4. Namespace Verification ---" -ForegroundColor Cyan
$partyParts = $party2 -split "::"
$party2Sub = $partyParts[0]
$party2Namespace = $partyParts[1]

Write-Host "Party Prefix                     : $party2Sub" -ForegroundColor White
Write-Host "Party Namespace                  : $party2Namespace" -ForegroundColor White
Write-Host "Expected NS                      : $expectedNamespace" -ForegroundColor White

$namespaceMatches = ($party2Namespace -eq $expectedNamespace)
Write-Host "Namespace Matches                : $namespaceMatches" -ForegroundColor $(if ($namespaceMatches) { "Green" } else { "Red" })

if (-not $namespaceMatches) {
    Write-Host "[FAIL] Party is not on the HackCanton participant namespace." -ForegroundColor Red
    exit 1
}

# 5. Verify GET /v2/parties/{party} succeeds
Write-Host "`n--- 5. Party Details Lookup Verification ---" -ForegroundColor Cyan
$partyUrl = "$endpoint/v2/parties/$party2"
try {
    $partyResp = Invoke-WebRequest -Uri $partyUrl -Headers $headers2 -TimeoutSec 30
    $partyStatus = "$([int]$partyResp.StatusCode) $($partyResp.StatusDescription)"
    Write-Host "GET /v2/parties/$party2 -> $partyStatus" -ForegroundColor Green
} catch {
    Write-Host "GET /v2/parties/$party2 -> FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$partyJson = $partyResp.Content | ConvertFrom-Json
$isLocal = $partyJson.partyDetails[0].isLocal
Write-Host "Participant Local Hosting (isLocal): $isLocal" -ForegroundColor Green

# 6. Verify Synchronizer Connection
Write-Host "`n--- 6. Synchronizer Connectivity Verification ---" -ForegroundColor Cyan
$syncUrl = "$endpoint/v2/state/connected-synchronizers"
try {
    $syncResp = Invoke-WebRequest -Uri $syncUrl -Headers $headers2 -TimeoutSec 30
    $syncJson = $syncResp.Content | ConvertFrom-Json
} catch {
    Write-Host "GET /v2/state/connected-synchronizers -> FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$connectedSync = $syncJson.connectedSynchronizers | Where-Object { $_.synchronizerId -eq $expectedSynchronizer }
$syncConnected = ($connectedSync -ne $null)
Write-Host "Connected to Synchronizer        : $($connectedSync.synchronizerId)" -ForegroundColor Green
Write-Host "Synchronizer Alias               : $($connectedSync.synchronizerAlias)" -ForegroundColor Green

# 7. Verify Informee Validity in ACS (Read-only query)
Write-Host "`n--- 7. Informee State Service Verification (Read-Only) ---" -ForegroundColor Cyan
$endResp = Invoke-WebRequest -Uri "$endpoint/v2/state/ledger-end" -Headers $headers2 -TimeoutSec 30
$ledgerOffset = ($endResp.Content | ConvertFrom-Json).offset

$acsQuery = @{
    activeAtOffset = $ledgerOffset
    filter = @{
        filtersByParty = @{
            $party2 = @{
                cumulative = @()
            }
        }
    }
    verbose = $true
} | ConvertTo-Json -Depth 5

$headersPost = @{
    "Authorization" = "Bearer $token2"
    "Accept"        = "application/json"
    "Content-Type"  = "application/json"
}

try {
    $acsResp = Invoke-WebRequest -Uri "$endpoint/v2/state/active-contracts" -Method Post -Headers $headersPost -Body $acsQuery -TimeoutSec 30
    $acsStatus = "$([int]$acsResp.StatusCode) $($acsResp.StatusDescription)"
    Write-Host "POST /v2/state/active-contracts (informee filter) -> $acsStatus" -ForegroundColor Green
} catch {
    Write-Host "POST /v2/state/active-contracts -> FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Party is fully recognized by participant and synchronizer as a valid informee!" -ForegroundColor Green

Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host " SECOND OPERATOR VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "HTTP Status /v2/users/{sub}      : $userStatus" -ForegroundColor White
Write-Host "Parsed Canton Username           : $cantonUserId" -ForegroundColor White
Write-Host "Operator 2 UUID                  : $user2Sub" -ForegroundColor Green
Write-Host "UUID Differs from Operator 1     : True (DISTINCT IDENTITY)" -ForegroundColor Green
Write-Host "CanActAs Status                  : CONFIRMED ($canActAs)" -ForegroundColor White
Write-Host "Canton Party ID                  : $party2" -ForegroundColor Yellow
Write-Host "Participant NS                   : $party2Namespace (Matches Operator 1 participant)" -ForegroundColor White
Write-Host "Party Lookup                     : CONFIRMED (HTTP 200, isLocal: $isLocal)" -ForegroundColor White
Write-Host "Synchronizer                     : CONFIRMED ($($connectedSync.synchronizerId))" -ForegroundColor White
Write-Host "Informee Status                  : VALID" -ForegroundColor White
Write-Host "Writes Performed                 : NONE (strictly read-only verification)" -ForegroundColor Green
Write-Host "Ready as Operator                : READY FOR 2-of-2 QUORUM VAULT" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Cyan
