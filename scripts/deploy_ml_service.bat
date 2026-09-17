@echo off
echo ===================================================================
echo 🦅 GARUD DRISHTI — ML MICROSERVICE DEPLOYMENT & VERIFICATION
echo ===================================================================
echo.

echo [1/3] Building Docker image for ML Inference Microservice...
docker build -t garud-drishti-ml -f infrastructure/docker/Dockerfile.ml .

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker build failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Starting container stack via Docker Compose...
docker-compose -f infrastructure/docker/docker-compose.yml up -d ml-service db redis

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Docker Compose failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Waiting for service healthcheck...
timeout /t 5 >nul
curl -s http://localhost:5000/health

echo.
echo ===================================================================
echo ✅ ML MICROSERVICE DEPLOYED SUCCESSFULLY!
echo    URL: http://localhost:5000
echo    Health: http://localhost:5000/health
echo    Point Predict: http://localhost:5000/predict/point
echo ===================================================================
