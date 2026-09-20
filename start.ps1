Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Starting TriHub Recharge Place (TriHub Technologies)..." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start PostgreSQL Docker container
Write-Host "`n[1/3] Starting TriHub PostgreSQL Database..." -ForegroundColor Yellow
docker compose up -d

# Give Postgres 2 seconds to be ready
Start-Sleep -Seconds 2

# 2. Run DB Migration & Seeds
Write-Host "`n[2/3] Checking Database Schema & Seeds..." -ForegroundColor Yellow
Set-Location -Path "backend"
npm run db:init
Set-Location -Path ".."

# 3. Start Backend in a new window
Write-Host "`n[3/3] Launching Backend & Frontend Services..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "✅ All Services Started!" -ForegroundColor Green
Write-Host "📱 Shop PWA & Admin Panel:  http://localhost:3000" -ForegroundColor White
Write-Host "📡 Backend API Server:     http://localhost:5000" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
