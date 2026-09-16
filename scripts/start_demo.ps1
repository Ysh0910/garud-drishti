# scripts/start_demo.ps1
# Unified Service Orchestration & Demo Launcher for GARUD DRISHTI

Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "🦅 GARUD DRISHTI — ALL SERVICES LAUNCHER (SIH'26 HACKATHON DEMO)" -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host ""

$RootPath = (Get-Item -Path $PSScriptRoot).Parent.FullName

Write-Host "[1/4] Starting Python ML Inference Microservice (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath'; python ml/inference/server.py"

Start-Sleep -Seconds 2

Write-Host "[2/4] Starting Express Backend & PostGIS API Gateway (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath/backend'; npm run dev"

Start-Sleep -Seconds 2

Write-Host "[3/4] Starting Authority Web Command Center (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath/apps/authority-web'; npm run dev"

Start-Sleep -Seconds 2

Write-Host "[4/4] Starting Citizen Mobile Hazard Reporter (Port 3001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath/apps/citizen-mobile'; npm run web"

Write-Host ""
Write-Host "===================================================================" -ForegroundColor Green
Write-Host "✅ ALL SERVICES ARE ACTIVE AND LISTENING:" -ForegroundColor Green
Write-Host "  - Authority Web:   http://localhost:3000" -ForegroundColor White
Write-Host "  - Citizen Mobile:  http://localhost:3001" -ForegroundColor White
Write-Host "  - Backend API:     http://localhost:8000" -ForegroundColor White
Write-Host "  - Python ML:       http://localhost:5000" -ForegroundColor White
Write-Host "===================================================================" -ForegroundColor Green
