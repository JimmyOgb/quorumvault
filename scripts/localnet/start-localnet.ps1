# Starts a Canton LocalNet participant node with HTTP Ledger API enabled
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Starting Canton LocalNet with memory storage..." -ForegroundColor Cyan
Write-Host "Ledger JSON API will be available at http://localhost:7575" -ForegroundColor Yellow

if (Get-Command canton -ErrorAction SilentlyContinue) {
    canton -c canton-local.conf
} else {
    Write-Warning "Canton executable not found in PATH."
    Write-Host "Please ensure Canton is installed or run via Docker."
}
