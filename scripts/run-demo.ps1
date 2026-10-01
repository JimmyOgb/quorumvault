# Run QuorumVault LocalNet demo script
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

Write-Host "Running QuorumVault LocalNet Demo..." -ForegroundColor Cyan
dpm script --dar .daml/dist/quorumvault-0.1.0.dar --script-name Demo:demo
