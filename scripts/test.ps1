# Run QuorumVault tests using dpm
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

Write-Host "Running QuorumVault Daml Script tests..." -ForegroundColor Cyan
dpm test
