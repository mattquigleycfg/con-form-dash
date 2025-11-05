# Con-form Dashboard - Local Deployment Script
# This script builds and deploys the application locally for testing

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Con-form Dashboard - Local Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
Write-Host "[1/6] Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node.js $nodeVersion installed" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check npm installation
$npmVersion = npm --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ npm $npmVersion installed" -ForegroundColor Green
} else {
    Write-Host "✗ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check environment configuration
Write-Host "[2/6] Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path .env) {
    Write-Host "✓ .env file found" -ForegroundColor Green
    
    # Verify required variables
    $envContent = Get-Content .env -Raw
    $hasSupabaseUrl = $envContent -match "VITE_SUPABASE_URL=https://"
    $hasSupabaseKey = $envContent -match "VITE_SUPABASE_PUBLISHABLE_KEY=\w+"
    
    if ($hasSupabaseUrl -and $hasSupabaseKey) {
        Write-Host "✓ Required environment variables configured" -ForegroundColor Green
    } else {
        Write-Host "⚠ Warning: Some environment variables may be missing" -ForegroundColor Yellow
        Write-Host "  Please check .env file and compare with env.example" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ .env file not found. Creating from env.example..." -ForegroundColor Yellow
    if (Test-Path env.example) {
        Copy-Item env.example .env
        Write-Host "✓ .env created. Please configure it with your credentials." -ForegroundColor Green
        Write-Host ""
        Write-Host "Required variables:" -ForegroundColor Cyan
        Write-Host "  - VITE_SUPABASE_URL" -ForegroundColor Cyan
        Write-Host "  - VITE_SUPABASE_PUBLISHABLE_KEY" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Edit .env file and run this script again." -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "✗ env.example not found" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Install dependencies
Write-Host "[3/6] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Build application
Write-Host "[4/6] Building application for production..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Build completed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Verify build artifacts
Write-Host "[5/6] Verifying build artifacts..." -ForegroundColor Yellow
if (Test-Path dist/index.html) {
    Write-Host "✓ dist/index.html found" -ForegroundColor Green
} else {
    Write-Host "✗ dist/index.html not found" -ForegroundColor Red
    exit 1
}

if (Test-Path dist/assets) {
    $assetCount = (Get-ChildItem dist/assets -File).Count
    Write-Host "✓ dist/assets folder found ($assetCount files)" -ForegroundColor Green
} else {
    Write-Host "✗ dist/assets folder not found" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Calculate build size
$distSize = (Get-ChildItem dist -Recurse | Measure-Object -Property Length -Sum).Sum
$distSizeMB = [math]::Round($distSize / 1MB, 2)
Write-Host "Build size: $distSizeMB MB" -ForegroundColor Cyan

Write-Host ""

# Start preview server
Write-Host "[6/6] Starting preview server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ DEPLOYMENT SUCCESSFUL" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your application is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Preview server will start in 3 seconds..." -ForegroundColor Cyan
Write-Host "Access at: http://localhost:4173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 3

# Start preview server
npm run preview

