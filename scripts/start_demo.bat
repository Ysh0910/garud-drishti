@echo off
echo ===================================================================
echo 🦅 GARUD DRISHTI — ALL SERVICES LAUNCHER (SIH'26 HACKATHON DEMO)
echo ===================================================================
echo.

echo [1/4] Starting Python ML Inference Microservice (Port 5000)...
start "GARUD DRISHTI - Python ML Service (Port 5000)" cmd /k "python ml/inference/server.py"

timeout /t 2 >nul

echo [2/4] Starting Express Backend & PostGIS API Gateway (Port 8000)...
start "GARUD DRISHTI - Backend API (Port 8000)" cmd /k "cd backend && npm run dev"

timeout /t 2 >nul

echo [3/4] Starting Authority Web Command Center (Port 3000)...
start "GARUD DRISHTI - Authority Web UI (Port 3000)" cmd /k "cd apps/authority-web && npm run dev"

timeout /t 2 >nul

echo [4/4] Starting Citizen Mobile Hazard Reporter (Port 3001)...
start "GARUD DRISHTI - Citizen Mobile App (Port 3001)" cmd /k "cd apps/citizen-mobile && npm run web"

echo.
echo ===================================================================
echo ✅ ALL SERVICES ARE ACTIVE AND LISTENING:
echo   - Authority Web:   http://localhost:3000
echo   - Citizen Mobile:  http://localhost:3001
echo   - Backend API:     http://localhost:8000
echo   - Python ML:       http://localhost:5000
echo ===================================================================
echo.
pause
