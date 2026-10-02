# QuorumVault - Real DevNet ProposeWithdrawal Exercise & ACS Verification
# Submits the real ProposeWithdrawal exercise transaction to HackCanton DevNet Canton v2 Commands API.
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
$proposalTemplateId = "$packageId`:Vault:WithdrawProposal"

$vaultContractId = "00e78dbb3b996e732dd98a5e5cddc5e2d557d021b3bc543213947f8d22468d2332ca121220136a6a8a972f52a328dc027918ee2e3575dbbc8645dd36e2b06623cd555ee8bf"

$commandId = "qv-propose-withdraw-" + [System.Guid]::NewGuid().ToString()

$proposeAmount = "10.0"
$memo = "DevNet test supplier withdrawal #001"

$exercisePayload = @{
    commands = @{
        commandId = $commandId
        userId = $userId
        actAs = @($party)
        commands = @(
            @{
                ExerciseCommand = @{
                    templateId = $vaultTemplateId
                    contractId = $vaultContractId
                    choice = "ProposeWithdrawal"
                    choiceArgument = @{
                        proposer = $party
                        recipient = $party
                        amount = $proposeAmount
                        memo = $memo
                    }
                }
            }
        )
    }
}

$jsonBody = $exercisePayload | ConvertTo-Json -Depth 10

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " SUBMITTING REAL ProposeWithdrawal TO HACKCANTON DEVNET" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Endpoint       : $endpoint/v2/commands/submit-and-wait-for-transaction" -ForegroundColor White
Write-Host "CommandId      : $commandId" -ForegroundColor White
Write-Host "Target VaultCid: $vaultContractId" -ForegroundColor White
Write-Host "Choice         : ProposeWithdrawal" -ForegroundColor White
Write-Host "Proposer       : $party" -ForegroundColor White
Write-Host "Recipient      : $party" -ForegroundColor White
Write-Host "Amount         : $proposeAmount CBTC" -ForegroundColor White
Write-Host "Memo           : '$memo'`n" -ForegroundColor White

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

Write-Host "[SUCCESS] ProposeWithdrawal committed on HackCanton DevNet!" -ForegroundColor Green

$txObj = $bodyText | ConvertFrom-Json
$transaction = if ($txObj.transaction) { $txObj.transaction } else { $txObj }

$updateId = $transaction.updateId
$txOffset = $transaction.offset
$effectiveAt = $transaction.effectiveAt

Write-Host "Transaction/Update ID : $updateId" -ForegroundColor Green
Write-Host "Ledger Offset         : $txOffset" -ForegroundColor Green
Write-Host "Effective Time        : $effectiveAt" -ForegroundColor Green

# Extract created WithdrawProposal contract ID and exercised event
$createdProposalCid = $null
$proposalArgs = $null

foreach ($ev in $transaction.events) {
    if ($ev.CreatedEvent -and $ev.CreatedEvent.templateId -match "WithdrawProposal") {
        $createdProposalCid = $ev.CreatedEvent.contractId
        $proposalArgs = $ev.CreatedEvent.createArgument
        Write-Host "Created WithdrawProposal Cid: $createdProposalCid" -ForegroundColor Yellow
    }
}

# PHASE 3: Query ACS with activeAtOffset to verify Vault balance and WithdrawProposal
Write-Host "`n================================================================================" -ForegroundColor Cyan
Write-Host " VERIFYING ACS STATE AT CURRENT LEDGER OFFSET" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

$ledgerEndOffset = (& curl.exe -s "$endpoint/v2/state/ledger-end" @headers | ConvertFrom-Json).offset
Write-Host "Current Ledger End Offset: $ledgerEndOffset" -ForegroundColor White

# 1. Query Vault contract
$vaultAcsBody = @"
{
  "activeAtOffset": $ledgerEndOffset,
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

$vaultAcsRaw = & curl.exe -s -X POST "$endpoint/v2/state/active-contracts" @headers -d $vaultAcsBody
$vaultAcs = $vaultAcsRaw | ConvertFrom-Json

Write-Host "`n--- 1. Vault Contract Verification in ACS ---" -ForegroundColor Cyan
Write-Host "Active Vault Contracts Found: $($vaultAcs.Count)" -ForegroundColor Green

$currentVault = $null
if ($vaultAcs.Count -gt 0) {
    $currentVault = $vaultAcs[0].contractEntry.JsActiveContract.createdEvent
    Write-Host "Vault Contract ID : $($currentVault.contractId)" -ForegroundColor White
    Write-Host "Vault Balance     : $($currentVault.createArgument.balance) $($currentVault.createArgument.asset)" -ForegroundColor Green
    Write-Host "Is Untouched (100): $($currentVault.createArgument.balance -eq '100.0000000000')" -ForegroundColor Green
}

# 2. Query WithdrawProposal contract
$proposalAcsBody = @"
{
  "activeAtOffset": $ledgerEndOffset,
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

$proposalAcsRaw = & curl.exe -s -X POST "$endpoint/v2/state/active-contracts" @headers -d $proposalAcsBody
$proposalAcs = $proposalAcsRaw | ConvertFrom-Json

Write-Host "`n--- 2. WithdrawProposal Verification in ACS ---" -ForegroundColor Cyan
Write-Host "Active Proposal Contracts Found: $($proposalAcs.Count)" -ForegroundColor Green

if ($proposalAcs.Count -gt 0) {
    $proposalEvent = $proposalAcs[0].contractEntry.JsActiveContract.createdEvent
    Write-Host "Proposal Contract ID : $($proposalEvent.contractId)" -ForegroundColor White
    Write-Host "Decoded Proposal Payload:" -ForegroundColor White
    $proposalEvent.createArgument | ConvertTo-Json -Depth 5 | Write-Host
}

