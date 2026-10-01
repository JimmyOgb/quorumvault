# Deploy QuorumVault DAR to Canton LocalNet
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
Set-Location $projectRoot

$darPath = Join-Path $projectRoot ".daml/dist/quorumvault-0.1.0.dar"

if (-not (Test-Path $darPath)) {
    Write-Host "DAR not found at $darPath. Building now..." -ForegroundColor Yellow
    dpm build
}

if (-not (Test-Path $darPath)) {
    Write-Error "Failed to build DAR. Ensure dpm build succeeds first."
    exit 1
}

Write-Host "Deploying DAR to Canton LocalNet (localhost:5011)..." -ForegroundColor Cyan
# Using Canton ledger API or dpm deployment
dpm dar upload --dar $darPath --host localhost --port 5011
Write-Host "DAR deployment initiated." -ForegroundColor Green
