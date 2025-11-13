#!/usr/bin/env pwsh
# Deployment Status Check Script for Con-form Dashboard
# This script helps diagnose why changes aren't appearing in production

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Con-form Dashboard Deployment Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Git Status
Write-Host "1. Checking Git Status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "   ⚠️  You have uncommitted changes:" -ForegroundColor Red
    git status --short
    Write-Host ""
} else {
    Write-Host "   ✅ Working tree is clean" -ForegroundColor Green
}

# 2. Check if local is ahead of origin
Write-Host "2. Checking if local is ahead of remote..." -ForegroundColor Yellow
$ahead = git log origin/main..main --oneline
if ($ahead) {
    Write-Host "   ⚠️  You have unpushed commits:" -ForegroundColor Red
    Write-Host $ahead
    Write-Host "   Run: git push origin main" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "   ✅ Local is in sync with origin/main" -ForegroundColor Green
}

# 3. Check recent commits
Write-Host "3. Recent commits on main:" -ForegroundColor Yellow
git log --oneline -5
Write-Host ""

# 4. Check if netlify.toml exists
Write-Host "4. Checking Netlify configuration..." -ForegroundColor Yellow
if (Test-Path "netlify.toml") {
    Write-Host "   ✅ netlify.toml found" -ForegroundColor Green
} else {
    Write-Host "   ❌ netlify.toml NOT found!" -ForegroundColor Red
    Write-Host "   This file is required for Netlify deployment" -ForegroundColor Yellow
}

# 5. Check environment variables
Write-Host "5. Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "   ✅ .env file found (for local dev)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "   Create one from env.example for local development" -ForegroundColor Cyan
}

# 6. Check if dist is gitignored
Write-Host "6. Checking .gitignore..." -ForegroundColor Yellow
$gitignoreContent = Get-Content ".gitignore" -Raw
if ($gitignoreContent -match "^dist$" -or $gitignoreContent -match "^\s*dist\s*$") {
    Write-Host "   ✅ dist folder is NOT gitignored (correct for Netlify)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  dist may be gitignored" -ForegroundColor Yellow
}

# 7. Test build locally
Write-Host "7. Testing local build..." -ForegroundColor Yellow
Write-Host "   Running: npm run build" -ForegroundColor Cyan
$buildSuccess = $false
try {
    npm run build 2>&1 | Out-Null
    if (Test-Path "dist/index.html") {
        Write-Host "   ✅ Build successful! dist/index.html created" -ForegroundColor Green
        $buildSuccess = $true
    } else {
        Write-Host "   ❌ Build completed but dist/index.html not found" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Build failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (!$gitStatus -and !$ahead -and $buildSuccess) {
    Write-Host "✅ Everything looks good!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Check your Netlify dashboard for build logs" -ForegroundColor White
    Write-Host "2. Verify environment variables are set in Netlify" -ForegroundColor White
    Write-Host "3. Try 'Clear cache and deploy site' in Netlify" -ForegroundColor White
    Write-Host "4. Clear your browser cache (Ctrl+Shift+R)" -ForegroundColor White
} else {
    Write-Host "⚠️  Issues detected. Please review the checks above." -ForegroundColor Yellow
    Write-Host ""
    if ($gitStatus) {
        Write-Host "→ Commit your changes: git add . && git commit -m 'your message'" -ForegroundColor Cyan
    }
    if ($ahead) {
        Write-Host "→ Push to GitHub: git push origin main" -ForegroundColor Cyan
    }
}

Write-Host ""

