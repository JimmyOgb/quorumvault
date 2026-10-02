# QuorumVault - Real DevNet ExecuteWithdrawal Choice & ACS Verification
# Submits the real ExecuteWithdrawal choice transaction to HackCanton DevNet Canton v2 Commands API.
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

$vaultTemplateId = "$packageId`:Vault:Vault"
$targetVaultCid = "00e78dbb3b996e732dd98a5e5cddc5e2d557d021b3bc543213947f8d22468d2332ca121220136a6a8a972f52a328dc027918ee2e3575dbbc8645dd36e2b06623cd555ee8bf"
$proposalCid = "002c430087d28dfb2649823e6a0a192fda1f9ed8748234c50650a6e1f0e3573e31ca12122069b321665a95259408db3fbe47bf52c7fb64f52656e2ee46082c2e121bac86cf"

$commandId = "qv-execute-withdraw-" + [System.Guid]::NewGuid().ToString()

$exercisePayload = @{
    commands = @{
        commandId = $commandId
        userId = $userId
        actAs = @($party)
        commands = @(
            @{
                ExerciseCommand = @{
                    templateId = $vaultTemplateId
                    contractId = $targetVaultCid
                    choice = "ExecuteWithdrawal"
                    choiceArgument = @{
                        proposalCid = $proposalCid
                        executor = $party
                    }
                }
            }
        )
    }
}

$jsonBody = $exercisePayload | ConvertTo-Json -Depth 10

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " SUBMITTING REAL ExecuteWithdrawal CHOICE TO HACKCANTON DEVNET" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Endpoint       : $endpoint/v2/commands/submit-and-wait-for-transaction" -ForegroundColor White
Write-Host "CommandId      : $commandId" -ForegroundColor White
Write-Host "Target VaultCid: $targetVaultCid" -ForegroundColor White
Write-Host "ProposalCid    : $proposalCid" -ForegroundColor White
Write-Host "Choice         : ExecuteWithdrawal" -ForegroundColor White
Write-Host "Executor       : $party`n" -ForegroundColor White

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

Write-Host "[SUCCESS] ExecuteWithdrawal committed on HackCanton DevNet!" -ForegroundColor Green

$txObj = $bodyText | ConvertFrom-Json
$transaction = if ($txObj.transaction) { $txObj.transaction } else { $txObj }

$updateId = $transaction.updateId
$txOffset = $transaction.offset
$effectiveAt = $transaction.effectiveAt
$recordTime = $transaction.recordTime
$synchronizerId = $transaction.synchronizerId

Write-Host "Transaction/Update ID : $updateId" -ForegroundColor Green
Write-Host "Ledger Offset         : $txOffset" -ForegroundColor Green
Write-Host "Effective Time        : $effectiveAt" -ForegroundColor Green
Write-Host "Record Time           : $recordTime" -ForegroundColor Green
Write-Host "Synchronizer ID       : $synchronizerId" -ForegroundColor Green

# Inspect transaction events
Write-Host "`n--- Transaction Event Details ---" -ForegroundColor Cyan
$archivedEvents = @()
$createdEvents = @()

foreach ($ev in $transaction.events) {
    if ($ev.ArchivedEvent) {
        $archivedEvents += $ev.ArchivedEvent
        Write-Host "Archived Contract: $($ev.ArchivedEvent.contractId) (Template: $($ev.ArchivedEvent.templateId))" -ForegroundColor Yellow
    }
    if ($ev.CreatedEvent) {
        $createdEvents += $ev.CreatedEvent
        Write-Host "Created Contract : $($ev.CreatedEvent.contractId) (Template: $($ev.CreatedEvent.templateId))" -ForegroundColor Green
    }
}

# PHASE 3: Query ACS at the post-transaction ledger offset
Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host " POST-TRANSACTION ACS VERIFICATION" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$postLedgerOffset = (& curl.exe -s "$endpoint/v2/state/ledger-end" @headers | ConvertFrom-Json).offset
Write-Host "Post-Transaction Ledger Offset: $postLedgerOffset" -ForegroundColor White

# 1. Query Vault Active Contract
$vaultQueryBody = @"
{
  "activeAtOffset": $postLedgerOffset,
  "filter": {
    "filtersByParty": {
      "$party": {
        "cumulative": [
          {
            "identifierFilter": {
              "TemplateFilter": {
                "value": {
                  "templateId": "#quorumvault:Vault:Vault"
                }
              }
            }
          }
        ]
      }
    }
  },
  "verbose": true
}
"@

$vaultResRaw = & curl.exe -s -X POST "$endpoint/v2/state/active-contracts" @headers -d $vaultQueryBody
$vaultRes = $vaultResRaw | ConvertFrom-Json

Write-Host "`n=== 1. Active Vault State in ACS ===" -ForegroundColor Cyan
Write-Host "Active Vault Count: $($vaultRes.Count)" -ForegroundColor Green
if ($vaultRes.Count -gt 0) {
    $activeVaultEvent = $vaultRes[0].contractEntry.JsActiveContract.createdEvent
    $newVaultCid = $activeVaultEvent.contractId
    $newBalance = $activeVaultEvent.createArgument.balance
    $asset = $activeVaultEvent.createArgument.asset

    Write-Host "Active Vault Contract ID : $newVaultCid" -ForegroundColor White
    Write-Host "Original Vault Replaced  : $($newVaultCid -ne $targetVaultCid)" -ForegroundColor Green
    Write-Host "Current Balance on Ledger: $newBalance $asset" -ForegroundColor Green
    Write-Host "Debited from 100 to 90   : $($newBalance -eq '90.0000000000')" -ForegroundColor Green
}

# 2. Query WithdrawProposal Active Contract (Must be archived / count 0)
$proposalQueryBody = @"
{
  "activeAtOffset": $postLedgerOffset,
  "filter": {
    "filtersByParty": {
      "$party": {
        "cumulative": [
          {
            "identifierFilter": {
              "TemplateFilter": {
                "value": {
                  "templateId": "#quorumvault:Vault:WithdrawProposal"
                }
              }
            }
          }
        ]
      }
    }
  },
  "verbose": true
}
"@

$propResRaw = & curl.exe -s -X POST "$endpoint/v2/state/active-contracts" @headers -d $proposalQueryBody
$propRes = $propResRaw | ConvertFrom-Json

Write-Host "`n=== 2. Active Proposal State in ACS ===" -ForegroundColor Cyan
Write-Host "Active Proposal Count in ACS: $($propRes.Count) (Expected: 0 - completely archived)" -ForegroundColor Green
Write-Host "Proposal Successfully Consumed: $($propRes.Count -eq 0)" -ForegroundColor Green

# 3. Query WithdrawReceipt Active Contract
$receiptQueryBody = @"
{
  "activeAtOffset": $postLedgerOffset,
  "filter": {
    "filtersByParty": {
      "$party": {
        "cumulative": [
          {
            "identifierFilter": {
              "TemplateFilter": {
                "value": {
                  "templateId": "#quorumvault:Vault:WithdrawReceipt"
                }
              }
            }
          }
        ]
      }
    }
  },
  "verbose": true
}
"@

$receiptResRaw = & curl.exe -s -X POST "$endpoint/v2/state/active-contracts" @headers -d $receiptQueryBody
$receiptRes = $receiptResRaw | ConvertFrom-Json

Write-Host "`n=== 3. Active WithdrawReceipt State in ACS ===" -ForegroundColor Cyan
Write-Host "Active Receipt Count in ACS: $($receiptRes.Count) (Expected: 1)" -ForegroundColor Green

if ($receiptRes.Count -gt 0) {
    $receiptEvent = $receiptRes[0].contractEntry.JsActiveContract.createdEvent
    Write-Host "Receipt Contract ID: $($receiptEvent.contractId)" -ForegroundColor Yellow
    Write-Host "Receipt Payload Details:" -ForegroundColor White
    $receiptEvent.createArgument | ConvertTo-Json -Depth 5 | Write-Host
}
