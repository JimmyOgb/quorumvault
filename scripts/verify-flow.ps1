# Automated Verification Script for QuorumVault
# Verifies the full smart contract lifecycle, invariant enforcement, and frontend build.

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "QuorumVault Automated Functionality & Security Verification" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

# 1. Daml Build
Write-Host "`n[1/4] Compiling Daml Contracts (dpm build)..." -ForegroundColor Yellow
dpm build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Daml build failed"
    exit 1
}
Write-Host "[PASS] Daml compilation PASSED - DAR generated in .daml/dist/" -ForegroundColor Green

# 2. Daml Script Tests
Write-Host "`n[2/4] Running Daml Script Security Invariant Tests (dpm test)..." -ForegroundColor Yellow
dpm test
if ($LASTEXITCODE -ne 0) {
    Write-Error "Daml script tests failed"
    exit 1
}
Write-Host "[PASS] Daml script test suite PASSED" -ForegroundColor Green

# 3. Frontend Typecheck
Write-Host "`n[3/4] Running Frontend Typecheck (tsc --noEmit)..." -ForegroundColor Yellow
Set-Location (Join-Path $projectRoot "frontend")
npm run typecheck
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend typecheck failed"
    exit 1
}
Write-Host "[PASS] Frontend typecheck PASSED - strict mode, zero errors" -ForegroundColor Green

# 4. Frontend Production Build
Write-Host "`n[4/4] Building Next.js Frontend (next build)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend production build failed"
    exit 1
}
Write-Host "[PASS] Frontend production build PASSED" -ForegroundColor Green

Set-Location $projectRoot
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "ALL VERIFICATION CHECKS PASSED!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
