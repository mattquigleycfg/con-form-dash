#!/usr/bin/env pwsh
# Deployment Verification Script
# Compares production build with expected local build

param(
    [string]$ProductionUrl = "https://con-form-dash.netlify.app"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Verification Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$issues = @()

# 1. Check local build exists
Write-Host "1. Checking local build..." -ForegroundColor Yellow
if (Test-Path "dist/index.html") {
    Write-Host "   ✅ Local dist folder exists" -ForegroundColor Green
    
    # Extract bundle hash from local build
    $localHtml = Get-Content "dist/index.html" -Raw
    if ($localHtml -match '/assets/index-([^.]+)\.js') {
        $localHash = $matches[1]
        Write-Host "   Local JS bundle hash: $localHash" -ForegroundColor Cyan
    } else {
        Write-Host "   ⚠️  Could not extract JS hash from local build" -ForegroundColor Yellow
        $issues += "Could not parse local build hashes"
    }
} else {
    Write-Host "   ❌ Local dist folder not found" -ForegroundColor Red
    Write-Host "   Run: npm run build" -ForegroundColor Cyan
    $issues += "Local build missing"
}

Write-Host ""

# 2. Check production build
Write-Host "2. Checking production deployment..." -ForegroundColor Yellow
try {
    $prodHtml = Invoke-WebRequest -Uri $ProductionUrl -UseBasicParsing -TimeoutSec 10
    Write-Host "   ✅ Production site is accessible" -ForegroundColor Green
    
    # Extract bundle hash from production
    if ($prodHtml.Content -match '/assets/index-([^.]+)\.js') {
        $prodHash = $matches[1]
        Write-Host "   Production JS bundle hash: $prodHash" -ForegroundColor Cyan
    } else {
        Write-Host "   ⚠️  Could not extract JS hash from production" -ForegroundColor Yellow
        $issues += "Could not parse production build hashes"
    }
} catch {
    Write-Host "   ❌ Cannot access production site" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    $issues += "Production site inaccessible"
    $prodHash = $null
}

Write-Host ""

# 3. Compare hashes
Write-Host "3. Comparing build versions..." -ForegroundColor Yellow
if ($localHash -and $prodHash) {
    if ($localHash -eq $prodHash) {
        Write-Host "   ✅ Production matches local build!" -ForegroundColor Green
        Write-Host "   Both use bundle: index-$localHash.js" -ForegroundColor Green
    } else {
        Write-Host "   ❌ MISMATCH: Production is outdated!" -ForegroundColor Red
        Write-Host "   Local:      index-$localHash.js" -ForegroundColor Yellow
        Write-Host "   Production: index-$prodHash.js" -ForegroundColor Yellow
        $issues += "Production build hash does not match local"
    }
} else {
    Write-Host "   ⚠️  Cannot compare (missing hash information)" -ForegroundColor Yellow
}

Write-Host ""

# 4. Check for specific features in production
Write-Host "4. Checking for missing features..." -ForegroundColor Yellow

if ($prodHash) {
    try {
        $prodJsUrl = "$ProductionUrl/assets/index-$prodHash.js"
        Write-Host "   Fetching production bundle (this may take a moment)..." -ForegroundColor Cyan
        $prodJs = Invoke-WebRequest -Uri $prodJsUrl -UseBasicParsing -TimeoutSec 30
        
        # Check for BudgetCircleChart
        if ($prodJs.Content -match "BudgetCircleChart|PieChart.*innerRadius") {
            Write-Host "   ✅ BudgetCircleChart (donut charts) found in bundle" -ForegroundColor Green
        } else {
            Write-Host "   ❌ BudgetCircleChart NOT found in production bundle" -ForegroundColor Red
            $issues += "BudgetCircleChart missing from production"
        }
        
        # Check for material/non-material categorization
        if ($prodJs.Content -match "cost_category.*material|materialAnalyticLines") {
            Write-Host "   ✅ Material/Non-Material categorization found" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Material categorization NOT found in production" -ForegroundColor Red
            $issues += "Material categorization missing"
        }
        
    } catch {
        Write-Host "   ⚠️  Could not fetch production bundle for analysis" -ForegroundColor Yellow
        Write-Host "   Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "   ⏭️  Skipped (no production hash)" -ForegroundColor Yellow
}

Write-Host ""

# 5. Check git status
Write-Host "5. Checking git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "   ⚠️  You have uncommitted changes" -ForegroundColor Yellow
    $issues += "Uncommitted local changes"
} else {
    Write-Host "   ✅ Working tree is clean" -ForegroundColor Green
}

$ahead = git log origin/main..main --oneline
if ($ahead) {
    Write-Host "   ⚠️  You have unpushed commits" -ForegroundColor Yellow
    $issues += "Unpushed commits"
} else {
    Write-Host "   ✅ Local is in sync with origin/main" -ForegroundColor Green
}

Write-Host ""

# 6. Verify key commits are in git
Write-Host "6. Verifying key commits..." -ForegroundColor Yellow
$commitCheck = git log --oneline --all | Select-String "2a0d694"
if ($commitCheck) {
    Write-Host "   ✅ Commit 2a0d694 (BudgetCircleChart) found in git" -ForegroundColor Green
} else {
    Write-Host "   ❌ Key commit 2a0d694 NOT found" -ForegroundColor Red
    $issues += "Missing key commits"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($issues.Count -eq 0) {
    Write-Host "✅ Everything looks good!" -ForegroundColor Green
    Write-Host ""
    Write-Host "If features are still missing in production:" -ForegroundColor Yellow
    Write-Host "1. Clear your browser cache (Ctrl+Shift+R)" -ForegroundColor White
    Write-Host "2. Try opening in incognito/private window" -ForegroundColor White
    Write-Host "3. Check browser console for errors (F12)" -ForegroundColor White
} else {
    Write-Host "❌ Found $($issues.Count) issue(s):" -ForegroundColor Red
    Write-Host ""
    foreach ($issue in $issues) {
        Write-Host "  • $issue" -ForegroundColor Yellow
    }
    Write-Host ""
    
    if ($issues -contains "Production build hash does not match local") {
        Write-Host "🔥 ACTION REQUIRED: Redeploy to Netlify" -ForegroundColor Red
        Write-Host ""
        Write-Host "In Netlify Dashboard:" -ForegroundColor Cyan
        Write-Host "1. Go to Deploys tab" -ForegroundColor White
        Write-Host "2. Click 'Trigger deploy' → 'Clear cache and deploy site'" -ForegroundColor White
        Write-Host "3. Wait 5 minutes for build to complete" -ForegroundColor White
        Write-Host "4. Run this script again to verify" -ForegroundColor White
    }
    
    if ($issues -contains "Uncommitted local changes" -or $issues -contains "Unpushed commits") {
        Write-Host ""
        Write-Host "⚠️  Make sure to commit and push your changes:" -ForegroundColor Yellow
        Write-Host "   git add ." -ForegroundColor White
        Write-Host "   git commit -m 'your message'" -ForegroundColor White
        Write-Host "   git push origin main" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "For detailed diagnosis, see: NETLIFY_DEPLOYMENT_DIAGNOSIS.md" -ForegroundColor Cyan
Write-Host ""

