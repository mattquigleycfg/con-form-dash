# Con-form Dashboard - Docker Development Helper Script
# This script stops any running npm dev server and starts Docker

Write-Host "🐳 Con-form Dashboard - Docker Development Mode" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = Get-Process "com.docker.backend" -ErrorAction SilentlyContinue
if (-not $dockerRunning) {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "   Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green

# Check if port 8080 is in use
Write-Host ""
Write-Host "Checking port 8080..." -ForegroundColor Yellow
$port8080 = netstat -ano | findstr ":8080.*LISTENING"
if ($port8080) {
    Write-Host "⚠️  Port 8080 is in use" -ForegroundColor Yellow
    
    # Extract PID
    $pid = ($port8080 -split '\s+')[-1]
    $processName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
    
    Write-Host "   Process: $processName (PID: $pid)" -ForegroundColor Yellow
    Write-Host "   Stopping process..." -ForegroundColor Yellow
    
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    
    Write-Host "✅ Port 8080 is now free" -ForegroundColor Green
} else {
    Write-Host "✅ Port 8080 is available" -ForegroundColor Green
}

# Check if .env file exists
Write-Host ""
Write-Host "Checking environment variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file found" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Red
    Write-Host "   Creating from env.example..." -ForegroundColor Yellow
    if (Test-Path "env.example") {
        Copy-Item "env.example" ".env"
        Write-Host "✅ .env file created" -ForegroundColor Green
        Write-Host "   Please edit .env with your credentials" -ForegroundColor Yellow
    } else {
        Write-Host "❌ env.example not found!" -ForegroundColor Red
        exit 1
    }
}

# Stop any running Docker containers
Write-Host ""
Write-Host "Stopping any existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.dev.yml down 2>$null
Write-Host "✅ Cleaned up existing containers" -ForegroundColor Green

# Start Docker development environment
Write-Host ""
Write-Host "Starting Docker development environment..." -ForegroundColor Yellow
Write-Host "This may take a minute on first run..." -ForegroundColor Cyan
Write-Host ""

docker-compose -f docker-compose.dev.yml up --build

# This line only executes if Docker is stopped (Ctrl+C)
Write-Host ""
Write-Host "🛑 Docker stopped" -ForegroundColor Yellow

