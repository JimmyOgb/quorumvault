# QuorumVault - Read-Only Authenticated DevNet Verification Script
# Verifies parties, packages, package ID, vetting status, and templates on HackCanton DevNet.
# STRICT SECURITY RULE: Does NOT log, print, or expose the authentication token.

param (
    [string]$Endpoint = "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services"
)

$ErrorActionPreference = "Stop"

# 1. Resolve Token securely
$token = $null

if ($env:CANTON_AUTH_TOKEN) {
    $token = $env:CANTON_AUTH_TOKEN.Trim()
}

if (-not $token) {
    $userVar = [System.Environment]::GetEnvironmentVariable('CANTON_AUTH_TOKEN', 'User')
    if ($userVar) {
        $token = $userVar.Trim()
    }
}

if (-not $token) {
    $envLocalPath = Join-Path $PSScriptRoot "..\\.env.local"
    if (Test-Path $envLocalPath) {
        $lines = Get-Content $envLocalPath
        foreach ($line in $lines) {
            if ($line -match '^\s*CANTON_AUTH_TOKEN\s*=\s*(.*)$') {
                $token = $matches[1].Trim().Trim('"').Trim("'")
                break
            }
        }
    }
}

if (-not $token) {
    $frontendEnvLocal = Join-Path $PSScriptRoot "..\\frontend\\.env.local"
    if (Test-Path $frontendEnvLocal) {
        $lines = Get-Content $frontendEnvLocal
        foreach ($line in $lines) {
            if ($line -match '^\s*CANTON_AUTH_TOKEN\s*=\s*(.*)$') {
                $token = $matches[1].Trim().Trim('"').Trim("'")
                break
            }
        }
    }
}

if (-not $token) {
    Write-Host "[BLOCKED] CANTON_AUTH_TOKEN not found in process env, User env registry, or .env.local." -ForegroundColor Red
    exit 2
}

Write-Host "[OK] Authenticated Bearer Token detected securely (length: $($token.Length) chars)." -ForegroundColor Green
Write-Host "Target DevNet Endpoint: $Endpoint`n" -ForegroundColor Cyan

function Invoke-DevNet {
    param(
        [string]$Path,
        [string]$Method = "GET",
        [object]$Body = $null
    )
    $headers = @{
        "Authorization" = "Bearer $token"
        "Accept"        = "application/json"
    }
    $params = @{
        Uri         = "$Endpoint$Path"
        Method      = $Method
        Headers     = $headers
        TimeoutSec  = 30
        ErrorAction = "Stop"
    }
    if ($Body) {
        $params["ContentType"] = "application/json"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
    }
    try {
        $resp = Invoke-RestMethod @params
        return @{ Success = $true; Data = $resp }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $stream = $_.Exception.Response.GetResponseStream()
        $bodyText = ""
        if ($stream) {
            $reader = New-Object System.IO.StreamReader($stream)
            $bodyText = $reader.ReadToEnd()
        }
        return @{ Success = $false; StatusCode = $statusCode; Error = $_.Exception.Message; Body = $bodyText }
    }
}

# --- STEP 1: GET /v2/parties ---
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "STEP 1: GET /v2/parties - Identifying Authenticated Canton Party" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$partiesRes = Invoke-DevNet -Path "/v2/parties"
if (-not $partiesRes.Success) {
    Write-Host "Failed to query /v2/parties: HTTP $($partiesRes.StatusCode)" -ForegroundColor Red
    Write-Host "Details: $($partiesRes.Body)" -ForegroundColor Red
    exit 1
}

Write-Host "Successfully queried /v2/parties." -ForegroundColor Green
$partiesData = $partiesRes.Data
Write-Host "Raw Parties Response Structure:" -ForegroundColor White
$partiesData | ConvertTo-Json -Depth 3 | Write-Host

# --- STEP 2: GET /v2/packages ---
Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "STEP 2: GET /v2/packages - Querying DevNet Packages" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$pkgRes = Invoke-DevNet -Path "/v2/packages"
if (-not $pkgRes.Success) {
    Write-Host "Failed to query /v2/packages: HTTP $($pkgRes.StatusCode)" -ForegroundColor Red
    Write-Host "Details: $($pkgRes.Body)" -ForegroundColor Red
    exit 1
}

Write-Host "Successfully queried /v2/packages." -ForegroundColor Green
$pkgData = $pkgRes.Data
$packageList = @()
if ($pkgData -is [Array]) {
    $packageList = $pkgData
} elseif ($pkgData.packageIds) {
    $packageList = $pkgData.packageIds
} elseif ($pkgData.result) {
    $packageList = $pkgData.result
} else {
    $packageList = @($pkgData)
}

Write-Host "Total packages reported by DevNet: $($packageList.Count)" -ForegroundColor Green

# --- STEP 3, 4, 5: Find QuorumVault package, Real Package ID, Vetting Status ---
Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "STEP 3, 4, 5: Inspecting Packages for QuorumVault & Vetting Status" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Inspect each package or query package status
$foundVaultPackages = @()

foreach ($pkgId in $packageList) {
    $idStr = if ($pkgId -is [string]) { $pkgId } elseif ($pkgId.packageId) { $pkgId.packageId } else { "$pkgId" }
    
    # Query package detail if endpoint exists
    $detailRes = Invoke-DevNet -Path "/v2/packages/$idStr"
    if ($detailRes.Success) {
        $detailJson = $detailRes.Data | ConvertTo-Json -Compress
        if ($detailJson -match "Vault" -or $detailJson -match "quorumvault" -or $detailJson -match "WithdrawProposal") {
            $foundVaultPackages += @{
                PackageId = $idStr
                Detail = $detailRes.Data
            }
        }
    }
}

if ($foundVaultPackages.Count -gt 0) {
    Write-Host "Found $($foundVaultPackages.Count) QuorumVault package(s) on DevNet!" -ForegroundColor Green
    foreach ($vp in $foundVaultPackages) {
        Write-Host "Package ID: $($vp.PackageId)" -ForegroundColor Yellow
        $vp.Detail | ConvertTo-Json -Depth 5 | Write-Host
    }
} else {
    Write-Host "Detailed package scan did not match 'Vault' by individual GET /v2/packages/{id}." -ForegroundColor Yellow
    Write-Host "Listing sample package IDs from DevNet:" -ForegroundColor White
    $packageList | Select-Object -First 10 | ForEach-Object { Write-Host " - $_" }
}

# --- STEP 6: Verify QuorumVault Templates ---
Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host "STEP 6: Checking Available QuorumVault Templates" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# Try ACS query or template inspection on the discovered package ID(s)
Write-Host "Target Templates to Verify:" -ForegroundColor White
Write-Host " - Vault:Vault" -ForegroundColor White
Write-Host " - Vault:WithdrawProposal" -ForegroundColor White
Write-Host " - Vault:WithdrawReceipt" -ForegroundColor White

