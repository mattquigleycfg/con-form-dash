# 🐳 Docker Quick Start

**Problem Solved:** Port conflicts between npm dev server and Docker

---

## ⚡ Quick Commands

### Easy Way (PowerShell Scripts)

```powershell
# Development mode (with hot reload)
.\docker-dev.ps1

# Production mode (optimized)
.\docker-prod.ps1

# Stop all containers
.\docker-stop.ps1
```

**Benefits:**
- ✅ Automatically stops npm dev server
- ✅ Checks if Docker is running
- ✅ Frees port 8080
- ✅ Handles cleanup
- ✅ Color-coded output

---

## 🔧 Manual Commands

### Development Mode

```bash
# Stop npm dev server first
Stop-Process -Name "node" -Force

# Start Docker development
docker-compose -f docker-compose.dev.yml up --build
```

### Production Mode

```bash
# Stop npm dev server first
Stop-Process -Name "node" -Force

# Start Docker production
docker-compose up --build
```

### Stop Docker

```bash
# Stop development
docker-compose -f docker-compose.dev.yml down

# Stop production
docker-compose down
```

---

## 🚨 Troubleshooting Port 8080

### Error: "port is already allocated"

**Cause:** npm dev server or another process is using port 8080

**Quick Fix:**

```powershell
# Find what's using port 8080
netstat -ano | findstr :8080

# Stop all Node processes
Stop-Process -Name "node" -Force

# Or stop specific process
Stop-Process -Id <PID> -Force

# Then start Docker again
.\docker-dev.ps1
```

---

## 🎯 When to Use What

| Scenario | Command |
|----------|---------|
| **Local development** | `npm run dev` |
| **Docker development** | `.\docker-dev.ps1` |
| **Docker production test** | `.\docker-prod.ps1` |
| **Deploy to server** | `docker-compose up -d` |

---

## 📋 Port Usage Guide

### Option 1: npm dev server (No Docker)
```bash
npm run dev
# Uses: http://localhost:8080
# Hot reload: ✅
# Docker: ❌
```

### Option 2: Docker development
```bash
.\docker-dev.ps1
# Uses: http://localhost:8080
# Hot reload: ✅
# Containerized: ✅
```

### Option 3: Docker production
```bash
.\docker-prod.ps1
# Uses: http://localhost:8080
# Optimized: ✅
# Nginx serving: ✅
```

**⚠️ You can only use ONE at a time!**

---

## 🔄 Switching Between npm and Docker

### From npm to Docker:

```powershell
# Stop npm
Stop-Process -Name "node" -Force

# Start Docker
.\docker-dev.ps1
```

### From Docker to npm:

```powershell
# Stop Docker
.\docker-stop.ps1

# Start npm
npm run dev
```

---

## 💡 Pro Tips

### 1. Check What's Running

```powershell
# Check port 8080
netstat -ano | findstr :8080

# Check Docker containers
docker ps

# Check Node processes
Get-Process -Name "node"
```

### 2. Clean Everything

```powershell
# Stop all Node processes
Stop-Process -Name "node" -Force

# Stop all Docker containers
docker-compose -f docker-compose.dev.yml down
docker-compose down

# Remove Docker images (optional)
docker image prune -a
```

### 3. View Logs

```powershell
# Docker development logs
docker-compose -f docker-compose.dev.yml logs -f

# Docker production logs
docker-compose logs -f

# Specific service logs
docker logs con-form-dashboard
```

---

## 🎬 Recommended Workflow

### Daily Development:

1. **Use npm for development** (faster, no Docker overhead)
   ```bash
   npm run dev
   ```

2. **Test in Docker weekly** (ensure containerization works)
   ```powershell
   .\docker-stop.ps1  # Stop npm first
   .\docker-dev.ps1    # Test Docker
   ```

3. **Before deployment** (test production build)
   ```powershell
   .\docker-prod.ps1
   ```

---

## 📊 Performance Comparison

| Method | Startup Time | Hot Reload | Memory | Best For |
|--------|--------------|------------|--------|----------|
| npm dev | ~5 sec | ✅ Fast | ~200MB | Daily dev |
| Docker dev | ~15 sec | ✅ Medium | ~300MB | Testing containers |
| Docker prod | ~20 sec | ❌ No | ~100MB | Pre-deploy testing |

---

## ✅ Checklist Before Running Docker

- [ ] Port 8080 is free (no npm dev server running)
- [ ] Docker Desktop is running
- [ ] `.env` file exists
- [ ] Environment variables are set

---

## 🚀 What You Just Fixed

**Before:**
```
❌ Error: ports are not available
❌ Port 8080 already in use by npm
❌ Conflict between npm and Docker
```

**After:**
```
✅ Port 8080 freed
✅ npm dev server stopped
✅ Docker can now use port 8080
✅ Helper scripts created
```

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Start Docker dev | `.\docker-dev.ps1` |
| Start Docker prod | `.\docker-prod.ps1` |
| Stop all Docker | `.\docker-stop.ps1` |
| Start npm dev | `npm run dev` |
| Stop npm | `Stop-Process -Name "node" -Force` |
| Check port 8080 | `netstat -ano \| findstr :8080` |
| View Docker logs | `docker-compose logs -f` |
| Check containers | `docker ps` |

---

## 🎯 Now You Can Run:

```powershell
# Try it now!
.\docker-dev.ps1
```

Then open: **http://localhost:8080** 🚀

---

**Last Updated:** October 30, 2025  
**Status:** ✅ Port Conflict Resolved

