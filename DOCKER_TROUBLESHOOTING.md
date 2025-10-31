# 🐳 Docker Troubleshooting Guide

Common issues and solutions when running Con-form Dashboard in Docker.

---

## 🔐 Authentication Error: "Invalid API key"

### Error Message:
```
AuthApiError: Invalid API key
Failed to load resource: the server responded with a status of 401
```

### Cause:
The `.env` file has a placeholder instead of the actual Supabase anon key.

### Solution:

**✅ FIXED!** Your `.env` file now has the correct key.

**To verify:**
```powershell
Get-Content .env | Select-String "VITE_SUPABASE"
```

Should show:
```
VITE_SUPABASE_URL=https://ibqgwakjmsnjtvwpkdns.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**After fixing `.env`, rebuild Docker:**
```powershell
# Stop current container
docker-compose -f docker-compose.dev.yml down

# Restart with new environment variables
.\docker-dev.ps1
```

---

## 🔄 Environment Variables Not Loading in Docker

### Symptoms:
- Authentication fails
- "Invalid API key" errors
- Environment variables show as `undefined`

### Why This Happens:

Docker builds the image with environment variables **at build time**, not at runtime. If you change `.env` after building, you must rebuild.

### Solution:

```powershell
# Always rebuild after changing .env
docker-compose -f docker-compose.dev.yml up --build

# Or use the helper script (rebuilds automatically)
.\docker-dev.ps1
```

---

## 🚨 Port 8080 Already in Use

### Error:
```
Error: ports are not available
bind: Only one usage of each socket address is normally permitted
```

### Solution:

**Use the helper script (auto-fixes):**
```powershell
.\docker-dev.ps1
```

**Or manually:**
```powershell
# Find what's using port 8080
netstat -ano | findstr :8080

# Stop Node processes
Stop-Process -Name "node" -Force

# Start Docker
docker-compose -f docker-compose.dev.yml up
```

---

## 🐋 Docker Desktop Not Running

### Error:
```
error during connect: Get "http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.24/containers/json"
Cannot connect to the Docker daemon
```

### Solution:

1. **Start Docker Desktop:**
   - Open Docker Desktop application
   - Wait for it to fully start (whale icon in tray)

2. **Verify Docker is running:**
   ```powershell
   docker --version
   docker ps
   ```

3. **Then start your container:**
   ```powershell
   .\docker-dev.ps1
   ```

---

## 🔄 Hot Reload Not Working in Development

### Symptoms:
- Changes to code don't reflect in browser
- Need to restart container for changes

### Cause:
Volume mounts not working properly on Windows.

### Solution:

**For Windows, add polling:**

Edit `docker-compose.dev.yml`:
```yaml
environment:
  - NODE_ENV=development
  - CHOKIDAR_USEPOLLING=true  # Add this line
  - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
  - VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
```

Then rebuild:
```powershell
docker-compose -f docker-compose.dev.yml up --build
```

---

## 📦 Build Fails: npm install errors

### Error:
```
npm ERR! code ENOTFOUND
npm ERR! network request to https://registry.npmjs.org failed
```

### Solutions:

**1. Check Internet Connection**
```powershell
ping registry.npmjs.org
```

**2. Clear Docker Cache**
```powershell
docker builder prune -a
docker-compose -f docker-compose.dev.yml build --no-cache
```

**3. Check npm Registry**
```powershell
# In Dockerfile or locally
npm config get registry
# Should be: https://registry.npmjs.org/
```

---

## 🐌 Docker Container Slow to Start

### Symptoms:
- Takes 2-3 minutes to start
- High CPU usage during startup

### Causes & Solutions:

**1. First-time build** (normal)
- First build takes longer (~1-2 minutes)
- Subsequent builds use cache (~10-20 seconds)

**2. No cache being used**
```powershell
# Build with cache
docker-compose -f docker-compose.dev.yml up --build

# NOT this (forces no cache)
docker-compose -f docker-compose.dev.yml build --no-cache
```

**3. Too many containers running**
```powershell
# Check running containers
docker ps

# Stop unused containers
docker stop $(docker ps -aq)

# Clean up
docker system prune
```

---

## 🧹 Clean Up Docker Resources

### Remove Stopped Containers
```powershell
docker container prune
```

### Remove Unused Images
```powershell
docker image prune -a
```

### Remove Everything (Nuclear Option)
```powershell
# ⚠️ This removes EVERYTHING (all projects)
docker system prune -a --volumes

# Safer: Just this project
docker-compose -f docker-compose.dev.yml down -v
docker-compose down -v
```

---

## 📊 Check Docker Resource Usage

### View Stats
```powershell
# All containers
docker stats

# Specific container
docker stats con-form-dashboard-dev
```

### Check Disk Usage
```powershell
docker system df
```

Should show:
```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          X         X         XXX MB    XXX MB
Containers      X         X         XXX MB    XXX MB
Local Volumes   X         X         XXX MB    XXX MB
Build Cache     X         X         XXX MB    XXX MB
```

---

## 🔍 Debug Container Issues

### View Container Logs
```powershell
# Development logs
docker-compose -f docker-compose.dev.yml logs -f

# Production logs
docker-compose logs -f

# Last 50 lines
docker logs --tail 50 con-form-dashboard-dev
```

### Execute Commands in Container
```powershell
# Open shell in container
docker exec -it con-form-dashboard-dev sh

# Run specific command
docker exec con-form-dashboard-dev ls -la /app

# Check environment variables
docker exec con-form-dashboard-dev env
```

### Inspect Container
```powershell
# Full container details
docker inspect con-form-dashboard-dev

# Just the environment variables
docker inspect -f '{{.Config.Env}}' con-form-dashboard-dev
```

---

## 🌐 Cannot Access http://localhost:8080

### Checklist:

1. **Container running?**
   ```powershell
   docker ps
   # Should see: con-form-dashboard-dev
   ```

2. **Port mapping correct?**
   ```powershell
   docker ps
   # Should show: 0.0.0.0:8080->8080/tcp
   ```

3. **Check container logs:**
   ```powershell
   docker logs con-form-dashboard-dev
   # Look for "ready in XXXms" or similar
   ```

4. **Try different localhost:**
   - http://localhost:8080
   - http://127.0.0.1:8080
   - http://0.0.0.0:8080

5. **Check Windows Firewall:**
   - Allow Docker Desktop through firewall
   - Allow port 8080

---

## 📱 React Router Warnings

### Warning:
```
React Router Future Flag Warning: v7_startTransition
React Router Future Flag Warning: v7_relativeSplatPath
```

### What This Means:
- These are **warnings**, not errors
- App still works fine
- React Router is preparing for version 7

### To Fix (Optional):

Edit `src/App.tsx`:
```typescript
<BrowserRouter
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }}
>
  {/* Your routes */}
</BrowserRouter>
```

---

## 🔐 Supabase Connection Issues

### Error: "Failed to fetch"
```
Failed to load resource: net::ERR_FAILED
```

### Solutions:

**1. Check Environment Variables:**
```powershell
# Inside container
docker exec con-form-dashboard-dev env | findstr VITE

# Should show both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
```

**2. Verify Supabase Project is Active:**
- Go to: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns
- Check project status

**3. Check Network:**
```powershell
# From host
curl https://ibqgwakjmsnjtvwpkdns.supabase.co

# From container
docker exec con-form-dashboard-dev wget -O- https://ibqgwakjmsnjtvwpkdns.supabase.co
```

---

## 🔄 Changes Not Reflecting

### Development Mode:

**1. Check volume mounts:**
```powershell
docker inspect con-form-dashboard-dev
# Look for "Mounts" section
```

**2. Verify file is mounted:**
```powershell
# Edit a file in src/
# Then check in container:
docker exec con-form-dashboard-dev cat /app/src/App.tsx
```

**3. Check HMR connection:**
- Open browser console
- Should see: `[vite] connected.`

### Production Mode:

Production mode doesn't support hot reload. Rebuild for changes:
```powershell
docker-compose down
docker-compose up --build
```

---

## 🐛 Common Mistakes

### ❌ Don't Do This:

1. **Running npm and Docker simultaneously**
   ```bash
   npm run dev  # Port 8080
   docker-compose up  # Also wants port 8080
   # ❌ Conflict!
   ```

2. **Forgetting to rebuild after .env changes**
   ```bash
   # Edit .env
   docker-compose up  # ❌ Uses old environment
   ```
   Should be:
   ```bash
   docker-compose up --build  # ✅ Rebuilds
   ```

3. **Using production Dockerfile for development**
   ```bash
   docker-compose up  # ❌ Production (no hot reload)
   ```
   Should be:
   ```bash
   docker-compose -f docker-compose.dev.yml up  # ✅ Development
   ```

### ✅ Do This:

1. **Use helper scripts:**
   ```powershell
   .\docker-dev.ps1  # Auto-handles everything
   ```

2. **Always rebuild after .env changes:**
   ```powershell
   .\docker-dev.ps1  # Rebuilds automatically
   ```

3. **Stop npm before Docker:**
   ```powershell
   .\docker-stop.ps1  # Cleans everything
   .\docker-dev.ps1   # Starts fresh
   ```

---

## 📋 Health Check Failing

### Error:
```
Health check failed: container unhealthy
```

### Solutions:

**1. Check health endpoint:**
```powershell
# Should return "healthy"
curl http://localhost:8080/health
```

**2. Check container logs:**
```powershell
docker logs con-form-dashboard
```

**3. Inspect health status:**
```powershell
docker inspect --format='{{.State.Health.Status}}' con-form-dashboard
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' con-form-dashboard
```

---

## 🆘 Nuclear Reset (Last Resort)

If nothing works, completely reset Docker for this project:

```powershell
# 1. Stop everything
docker-compose -f docker-compose.dev.yml down -v
docker-compose down -v

# 2. Remove images
docker rmi con-form-dashboard con-form-dash-dev

# 3. Clean Docker
docker system prune -a

# 4. Verify .env is correct
Get-Content .env

# 5. Start fresh
.\docker-dev.ps1
```

---

## ✅ Quick Diagnostics Checklist

Run these to diagnose issues:

```powershell
# 1. Docker running?
docker --version

# 2. Container running?
docker ps

# 3. Environment correct?
Get-Content .env

# 4. Port 8080 free?
netstat -ano | findstr :8080

# 5. Can access Supabase?
curl https://ibqgwakjmsnjtvwpkdns.supabase.co

# 6. Container logs?
docker logs con-form-dashboard-dev --tail 50

# 7. Resource usage?
docker stats --no-stream
```

---

## 📞 Quick Solutions Reference

| Issue | Quick Fix |
|-------|-----------|
| Invalid API key | Rebuild: `.\docker-dev.ps1` |
| Port in use | Stop Node: `Stop-Process -Name "node" -Force` |
| Docker not running | Start Docker Desktop |
| Changes not reflecting | Ensure in dev mode: `docker-compose.dev.yml` |
| Build fails | Clear cache: `docker builder prune -a` |
| Slow startup | Normal on first run, cache used after |
| Can't access site | Check `docker ps` for port mapping |
| Environment not loading | Rebuild: `docker-compose up --build` |

---

**Last Updated:** October 30, 2025  
**Status:** ✅ All Common Issues Documented

