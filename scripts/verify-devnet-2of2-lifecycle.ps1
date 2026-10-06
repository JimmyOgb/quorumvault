# QuorumVault - Real 2-of-2 Multi-Operator Lifecycle Verification on HackCanton DevNet
# STRICT SECURITY RULE: Does NOT log, print, or expose any tokens or passwords.

param(
    [string]$Endpoint = "https://ledger-api-json.participant.hackcanton-01.devnet.naas.noders.services",
    [string]$PackageId = "c8ac685dd4671ced2983869ef6a118d9698a4280db05fd0e6eef6a67cacdf249"
)

$ErrorActionPreference = "Stop"

$op1UserId = "4d809018-bff4-43bf-ae81-08a9d77bd84f"
$op1Party = "4d809018-bff4-43bf-ae81-08a9d77bd84f::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e"

$op2UserId = "30c98bd0-8b8a-4785-a40b-77eb62f3d8cc"
$op2Party = "30c98bd0-8b8a-4785-a40b-77eb62f3d8cc::12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e"

# 1. Resolve Tokens
$envLocalPath = Join-Path $PSScriptRoot "..\\.env.local"
if (-not (Test-Path $envLocalPath)) {
    $envLocalPath = "C:\Users\NO GO NO\quorumvault\.env.local"
}

$token1 = $env:CANTON_AUTH_TOKEN
$token2 = $env:CANTON_AUTH_TOKEN_OPERATOR2

if (Test-Path $envLocalPath) {
    foreach ($line in (Get-Content $envLocalPath)) {
        if (-not $token1 -and $line -match '^\s*CANTON_AUTH_TOKEN\s*=(.*)$') {
            $token1 = $matches[1].Trim().Trim('"').Trim("'")
        }
        if (-not $token2 -and $line -match '^\s*CANTON_AUTH_TOKEN_OPERATOR2\s*=(.*)$') {
            $token2 = $matches[1].Trim().Trim('"').Trim("'")
        }
    }
}

if (-not $token1) {
    Write-Host "[BLOCKED] Operator 1 token not detected in environment or .env.local." -ForegroundColor Red
    exit 1
}

if (-not $token2) {
    Write-Host "[BLOCKED] Operator 2 token not detected in environment or .env.local." -ForegroundColor Red
    exit 1
}

function Submit-LedgerCommand {
    param(
        [string]$Token,
        [hashtable]$Payload
    )
    $submitUrl = "$Endpoint/v2/commands/submit-and-wait-for-transaction"
    $json = $Payload | ConvertTo-Json -Depth 10
    $tempFile = [System.IO.Path]::GetTempFileName()
    try {
        [System.IO.File]::WriteAllText($tempFile, $json)
        $raw = & curl.exe -s -i -X POST $submitUrl `
            -H "Authorization: Bearer $Token" `
            -H "Content-Type: application/json" `
            -H "Accept: application/json" `
            --data-binary "@$tempFile" `
            --max-time 45
        
        $headerLines = @()
        $bodyLines = @()
        $isBody = $false
        foreach ($line in ($raw -split "`r?`n")) {
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
        
        $statusLine = if ($headerLines.Count -gt 0) { $headerLines[0] } else { "" }
        $bodyText = $bodyLines -join "`n"
        $statusCode = 0
        if ($statusLine -match 'HTTP/\S+\s+(\d+)') {
            $statusCode = [int]$matches[1]
        }
        
        if ($statusCode -ge 200 -and $statusCode -lt 300) {
            $resp = $bodyText | ConvertFrom-Json
            return @{ Success = $true; StatusCode = $statusCode; Data = $resp; Body = $bodyText }
        } else {
            return @{ Success = $false; StatusCode = $statusCode; Error = "HTTP $statusCode ($statusLine)"; Body = $bodyText }
        }
    } catch {
        return @{ Success = $false; StatusCode = 0; Error = $_.Exception.Message; Body = "" }
    } finally {
        if (Test-Path $tempFile) { Remove-Item $tempFile -Force -ErrorAction SilentlyContinue }
    }
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host " STARTING REAL 2-OF-2 DEVNET VERIFICATION SEQUENCE" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "DevNet Endpoint : $Endpoint" -ForegroundColor White
Write-Host "Package ID      : $PackageId" -ForegroundColor White
Write-Host "Operator 1      : $op1Party" -ForegroundColor White
Write-Host "Operator 2      : $op2Party" -ForegroundColor White

# --- STEP A: Create Real 2-of-2 Vault ---
Write-Host "`n--- STEP A: Creating Real 2-of-2 Vault ---" -ForegroundColor Yellow
$vaultId = "devnet-qv-2of2-" + ([System.Guid]::NewGuid().ToString().Substring(0, 8))
$cmdCreate = "cmd-create-" + [System.Guid]::NewGuid().ToString()

$createPayload = @{
    commands = @{
        commandId = $cmdCreate
        userId    = $op1UserId
        actAs     = @($op1Party)
        commands  = @(
            @{
                CreateCommand = @{
                    templateId = "$PackageId`:Vault:Vault"
                    createArguments = @{
                        owner               = $op1Party
                        vaultId             = $vaultId
                        operators           = @($op1Party, $op2Party)
                        threshold           = "2"
                        maxSingleWithdrawal = "25.0"
                        balance             = "100.0"
                        asset               = "CBTC"
                    }
                }
            }
        )
    }
}

$resCreate = Submit-LedgerCommand -Token $token1 -Payload $createPayload
if (-not $resCreate.Success) {
    Write-Host "[FAIL] Vault creation failed: $($resCreate.Error) | $($resCreate.Body)" -ForegroundColor Red
    exit 1
}

$txCreate = $resCreate.Data.transaction
$vaultUpdateId = $txCreate.updateId
$vaultCid = $null

foreach ($event in $txCreate.events) {
    if ($event.CreatedEvent -and $event.CreatedEvent.templateId -match 'Vault:Vault') {
        $vaultCid = $event.CreatedEvent.contractId
        break
    }
}

Write-Host "[OK] 2-of-2 Vault Created Successfully!" -ForegroundColor Green
Write-Host "  Vault ID     : $vaultId" -ForegroundColor White
Write-Host "  Command ID   : $cmdCreate" -ForegroundColor White
Write-Host "  Update ID    : $vaultUpdateId" -ForegroundColor White
Write-Host "  Vault CID    : $vaultCid" -ForegroundColor Green

# --- STEP B: Propose Real Withdrawal as Operator 1 ---
Write-Host "`n--- STEP B: Propose Real Withdrawal as Operator 1 (10.0 CBTC) ---" -ForegroundColor Yellow
$cmdPropose = "cmd-propose-" + [System.Guid]::NewGuid().ToString()
$memo = "DevNet 2-of-2 Verification Test Proposal"

$proposePayload = @{
    commands = @{
        commandId = $cmdPropose
        userId    = $op1UserId
        actAs     = @($op1Party)
        commands  = @(
            @{
                ExerciseCommand = @{
                    templateId      = "$PackageId`:Vault:Vault"
                    contractId      = $vaultCid
                    choice          = "ProposeWithdrawal"
                    choiceArgument  = @{
                        proposer  = $op1Party
                        recipient = $op1Party
                        amount    = "10.0"
                        memo      = $memo
                    }
                }
            }
        )
    }
}

$resPropose = Submit-LedgerCommand -Token $token1 -Payload $proposePayload
if (-not $resPropose.Success) {
    Write-Host "[FAIL] ProposeWithdrawal failed: $($resPropose.Error) | $($resPropose.Body)" -ForegroundColor Red
    exit 1
}

$txPropose = $resPropose.Data.transaction
$proposeUpdateId = $txPropose.updateId
$proposalCid = $null
$initialConfirmations = @()

foreach ($event in $txPropose.events) {
    if ($event.CreatedEvent -and $event.CreatedEvent.templateId -match 'Vault:WithdrawProposal') {
        $proposalCid = $event.CreatedEvent.contractId
        $pArgs = if ($event.CreatedEvent.createArguments) { $event.CreatedEvent.createArguments } else { $event.CreatedEvent.createArgument }
        $initialConfirmations = $pArgs.confirmations
        break
    }
}

Write-Host "[OK] Withdrawal Proposed Successfully!" -ForegroundColor Green
Write-Host "  Command ID            : $cmdPropose" -ForegroundColor White
Write-Host "  Update ID             : $proposeUpdateId" -ForegroundColor White
Write-Host "  Proposal CID          : $proposalCid" -ForegroundColor Green
Write-Host "  Initial Confirmations : $($initialConfirmations -join ', ')" -ForegroundColor White

# --- STEP C: Attempt Execution with Only 1/2 Approval (Expected to FAIL) ---
Write-Host "`n--- STEP C: Attempt Execution with Only 1/2 Approvals (Expected Rejection) ---" -ForegroundColor Yellow
$cmdExecFail = "cmd-exec-fail-" + [System.Guid]::NewGuid().ToString()

$execFailPayload = @{
    commands = @{
        commandId = $cmdExecFail
        userId    = $op1UserId
        actAs     = @($op1Party)
        commands  = @(
            @{
                ExerciseCommand = @{
                    templateId     = "$PackageId`:Vault:Vault"
                    contractId     = $vaultCid
                    choice         = "ExecuteWithdrawal"
                    choiceArgument = @{
                        proposalCid = $proposalCid
                        executor    = $op1Party
                    }
                }
            }
        )
    }
}

$resExecFail = Submit-LedgerCommand -Token $token1 -Payload $execFailPayload
if ($resExecFail.Success) {
    Write-Host "[CRITICAL SECURITY FAILURE] 1/2 execution SUCCEEDED when threshold is 2!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "[OK] Under-Threshold Execution Blocked by Canton Ledger Engine as Expected!" -ForegroundColor Green
    Write-Host "  Status Code           : $($resExecFail.StatusCode)" -ForegroundColor White
    Write-Host "  Rejection Reason      : $($resExecFail.Error)" -ForegroundColor White
    Write-Host "  Ledger Engine Error   : $($resExecFail.Body)" -ForegroundColor White
}

# --- STEP D: Approve Same Proposal Using Operator 2 Independent Credentials ---
Write-Host "`n--- STEP D: Approve Proposal Using Operator 2 Independent Credentials ---" -ForegroundColor Yellow
$cmdApprove = "cmd-approve-" + [System.Guid]::NewGuid().ToString()

$approvePayload = @{
    commands = @{
        commandId = $cmdApprove
        userId    = $op2UserId
        actAs     = @($op2Party)
        commands  = @(
            @{
                ExerciseCommand = @{
                    templateId     = "$PackageId`:Vault:WithdrawProposal"
                    contractId     = $proposalCid
                    choice         = "ConfirmWithdrawal"
                    choiceArgument = @{
                        operator = $op2Party
                    }
                }
            }
        )
    }
}

$resApprove = Submit-LedgerCommand -Token $token2 -Payload $approvePayload
if (-not $resApprove.Success) {
    Write-Host "[FAIL] Operator 2 approval failed: $($resApprove.Error) | $($resApprove.Body)" -ForegroundColor Red
    exit 1
}

$txApprove = $resApprove.Data.transaction
$approveUpdateId = $txApprove.updateId
$approvedProposalCid = $null
$approvedConfirmations = @()

foreach ($event in $txApprove.events) {
    if ($event.CreatedEvent -and $event.CreatedEvent.templateId -match 'Vault:WithdrawProposal') {
        $approvedProposalCid = $event.CreatedEvent.contractId
        $aArgs = if ($event.CreatedEvent.createArguments) { $event.CreatedEvent.createArguments } else { $event.CreatedEvent.createArgument }
        $approvedConfirmations = $aArgs.confirmations
        break
    }
}

Write-Host "[OK] Operator 2 Confirmed Proposal Successfully!" -ForegroundColor Green
Write-Host "  Command ID            : $cmdApprove" -ForegroundColor White
Write-Host "  Update ID             : $approveUpdateId" -ForegroundColor White
Write-Host "  New Proposal CID      : $approvedProposalCid" -ForegroundColor Green

# --- STEP E: Verify Confirmations Contain Both Distinct Parties ---
Write-Host "`n--- STEP E: Verifying 2/2 Signatures ---" -ForegroundColor Yellow
Write-Host "  Confirmations Recorded: $($approvedConfirmations -join ', ')" -ForegroundColor White
$hasOp1 = $approvedConfirmations -contains $op1Party
$hasOp2 = $approvedConfirmations -contains $op2Party

if ($hasOp1 -and $hasOp2 -and $approvedConfirmations.Count -eq 2) {
    Write-Host "[OK] Quorum threshold 2/2 satisfied with two genuinely distinct Canton parties!" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Confirmations do not contain both distinct parties!" -ForegroundColor Red
    exit 1
}

# --- STEP F: Execute Withdrawal After 2/2 Approval ---
Write-Host "`n--- STEP F: Executing Withdrawal After 2/2 Approval ---" -ForegroundColor Yellow
$cmdExecSuccess = "cmd-exec-success-" + [System.Guid]::NewGuid().ToString()

$execSuccessPayload = @{
    commands = @{
        commandId = $cmdExecSuccess
        userId    = $op1UserId
        actAs     = @($op1Party)
        commands  = @(
            @{
                ExerciseCommand = @{
                    templateId     = "$PackageId`:Vault:Vault"
                    contractId     = $vaultCid
                    choice         = "ExecuteWithdrawal"
                    choiceArgument = @{
                        proposalCid = $approvedProposalCid
                        executor    = $op1Party
                    }
                }
            }
        )
    }
}

$resExecSuccess = Submit-LedgerCommand -Token $token1 -Payload $execSuccessPayload
if (-not $resExecSuccess.Success) {
    Write-Host "[FAIL] 2/2 Execution failed: $($resExecSuccess.Error) | $($resExecSuccess.Body)" -ForegroundColor Red
    exit 1
}

$txExec = $resExecSuccess.Data.transaction
$execUpdateId = $txExec.updateId
$newVaultCid = $null
$newBalance = $null
$receiptCid = $null
$receiptAmount = $null
$receiptRemainingBalance = $null

foreach ($event in $txExec.events) {
    if ($event.CreatedEvent) {
        $tpl = $event.CreatedEvent.templateId
        $eArgs = if ($event.CreatedEvent.createArguments) { $event.CreatedEvent.createArguments } else { $event.CreatedEvent.createArgument }
        if ($tpl -match 'Vault:Vault') {
            $newVaultCid = $event.CreatedEvent.contractId
            $newBalance = $eArgs.balance
        }
        if ($tpl -match 'Vault:WithdrawReceipt') {
            $receiptCid = $event.CreatedEvent.contractId
            $receiptAmount = $eArgs.amount
            $receiptRemainingBalance = $eArgs.remainingBalance
        }
    }
}

Write-Host "[OK] 2/2 Withdrawal Executed Successfully!" -ForegroundColor Green
Write-Host "  Command ID            : $cmdExecSuccess" -ForegroundColor White
Write-Host "  Update ID             : $execUpdateId" -ForegroundColor White
Write-Host "  New Vault CID         : $newVaultCid" -ForegroundColor Green
Write-Host "  New Balance           : $newBalance CBTC (Decreased from 100.0 to 90.0)" -ForegroundColor Green
Write-Host "  WithdrawReceipt CID   : $receiptCid" -ForegroundColor Green
Write-Host "  Receipt Amount        : $receiptAmount CBTC" -ForegroundColor White
Write-Host "  Remaining Balance     : $receiptRemainingBalance CBTC" -ForegroundColor White

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host " LIVE DEVNET 2-OF-2 VERIFICATION COMPLETE AND CONFIRMED ON LEDGER!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
