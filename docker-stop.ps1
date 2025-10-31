# Con-form Dashboard - Stop Docker Containers
# This script stops all Docker containers for this project

Write-Host "🛑 Stopping Con-form Dashboard Docker Containers" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

# Stop development containers
Write-Host "Stopping development containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml down 2>$null

# Stop production containers
Write-Host "Stopping production containers..." -ForegroundColor Yellow
docker-compose down 2>$null

Write-Host ""
Write-Host "✅ All containers stopped" -ForegroundColor Green
Write-Host ""

# Show remaining Docker processes (if any)
$containers = docker ps --filter "name=con-form" --format "table {{.Names}}\t{{.Status}}"
if ($containers) {
    Write-Host "Remaining containers:" -ForegroundColor Cyan
    Write-Host $containers
} else {
    Write-Host "No Con-form containers running" -ForegroundColor Green
}

