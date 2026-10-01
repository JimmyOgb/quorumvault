# Build QuorumVault DAR package using dpm
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

Write-Host "Building QuorumVault DAR package..." -ForegroundColor Cyan
dpm build
