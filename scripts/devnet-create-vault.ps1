# QuorumVault - Real DevNet Vault Creation & ACS Verification
# Submits the first real create transaction to HackCanton DevNet Canton v2 Commands API.
# STRICT SECURITY RULE: Does NOT log, print, or expose the authentication token.

$ErrorActionPreference = "Stop"

# 1. Resolve Token securely
$token = $null
if ($env:CANTON_AUTH_TOKEN) {
    $token = $env:CANTON_AUTH_TOKEN.Trim()
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
    Write-Host "[ERROR] CANTON_AUTH_TOKEN not found." -ForegroundColor Red
    exit 2
}

$endpoint = "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services"
$packageId = "c8ac685dd4671ced2983869ef6a118d9698a4280db05fd0e6eef6a67cacdf249"
$userId = "4d809018-bff4-43bf-ae81-08a9d77bd84f"
$party = "4d809018-bff4-43bf-ae81-08a9d77bd84f::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e"
$templateId = "$packageId`:Vault:Vault"

$commandId = "qv-create-vault-" + [System.Guid]::NewGuid().ToString()

$vaultPayload = @{
    commands = @{
        commandId = $commandId
        userId = $userId
        actAs = @($party)
        commands = @(
            @{
                CreateCommand = @{
                    templateId = $templateId
                    createArguments = @{
                        owner = $party
                        vaultId = "devnet-treasury-cbtc-01"
                        operators = @($party)
                        threshold = "1"
                        maxSingleWithdrawal = "25.0"
                        balance = "100.0"
                        asset = "CBTC"
                    }
                }
            }
        )
    }
}

$jsonBody = $vaultPayload | ConvertTo-Json -Depth 10

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " SUBMITTING REAL WRITE TRANSACTION TO HACKCANTON DEVNET" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Endpoint   : $endpoint/v2/commands/submit-and-wait-for-transaction" -ForegroundColor White
Write-Host "CommandId  : $commandId" -ForegroundColor White
Write-Host "UserId     : $userId" -ForegroundColor White
Write-Host "ActAs Party: $party" -ForegroundColor White
Write-Host "TemplateId : $templateId" -ForegroundColor White
Write-Host "Constructor: vaultId='devnet-treasury-cbtc-01', balance='100.0', maxSingle='25.0', threshold='1', asset='CBTC'`n" -ForegroundColor White

$headers = @(
    "-H", "Authorization: Bearer $token",
    "-H", "Content-Type: application/json",
    "-H", "Accept: application/json"
)

# Submit command
$submitUrl = "$endpoint/v2/commands/submit-and-wait-for-transaction"
$responseRaw = & curl.exe -s -i -X POST $submitUrl @headers -d $jsonBody

$headerLines = @()
$bodyLines = @()
$isBody = $false
foreach ($line in ($responseRaw -split "`r?`n")) {
    if (-not $isBody) {
        if ([string]::IsNullOrWhiteSpace($line)) {
            $isBody = $true
        } else {
            $headerLines += $line
        }
    } else {
        $bodyLines += $line
    }
}

$statusLine = $headerLines[0]
$bodyText = $bodyLines -join "`n"

Write-Host "HTTP Status: $statusLine" -ForegroundColor White

if ($statusLine -notmatch "200") {
    Write-Host "[FAIL] Transaction rejected by Canton node:" -ForegroundColor Red
    Write-Host $bodyText -ForegroundColor Red
    exit 1
}

Write-Host "[SUCCESS] Real transaction committed on HackCanton DevNet!" -ForegroundColor Green

$txObj = $bodyText | ConvertFrom-Json
$transaction = if ($txObj.transaction) { $txObj.transaction } else { $txObj }

$updateId = $transaction.updateId
$txOffset = $transaction.offset
$effectiveAt = $transaction.effectiveAt

Write-Host "Transaction/Update ID : $updateId" -ForegroundColor Green
Write-Host "Ledger Offset         : $txOffset" -ForegroundColor Green
Write-Host "Effective Time        : $effectiveAt" -ForegroundColor Green

# Extract created contract ID
$createdEvents = $transaction.events | Where-Object { $_.created -ne $null }
$createdContractId = $null
if ($createdEvents) {
    $createdContractId = $createdEvents[0].created.contractId
    Write-Host "Created Contract ID   : $createdContractId" -ForegroundColor Yellow
} else {
    Write-Host "Transaction Details:" -ForegroundColor White
    $bodyText | Write-Host
}

# PHASE 3: Query newly created contract from Active Contract Set (ACS)
Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host " QUERYING ACTIVE CONTRACT SET (ACS) ON DEVNET" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$acsUrl = "$endpoint/v2/state/active-contracts"
$acsQuery = @{
    filter = @{
        filtersByParty = @{
            $party = @{
                inclusive = @{
                    templateIds = @(
                        @{ packageId = $packageId; moduleName = "Vault"; entityName = "Vault" }
                    )
                }
            }
        }
    }
    verbose = $true
} | ConvertTo-Json -Depth 10

$acsRaw = & curl.exe -s -X POST $acsUrl @headers -d $acsQuery
Write-Host "ACS Raw Response:" -ForegroundColor White
$acsRaw | Write-Host

$acsParsed = $acsRaw | ConvertFrom-Json
Write-Host "`nActive Contracts Found in ACS: $($acsParsed.Count)" -ForegroundColor Green
if ($acsParsed.Count -gt 0) {
    Write-Host "On-Chain Verified State:" -ForegroundColor Green
    $acsParsed | ConvertTo-Json -Depth 5 | Write-Host
}

