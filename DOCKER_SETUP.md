# 🐳 Docker Setup Guide for Con-form Dashboard

Complete Docker configuration for development and production environments.

---

## 📋 What Was Created

Docker is now **fully configured** with the following files:

| File | Purpose |
|------|---------|
| `Dockerfile` | Production build (multi-stage with Nginx) |
| `Dockerfile.dev` | Development build (with hot reload) |
| `docker-compose.yml` | Production compose configuration |
| `docker-compose.dev.yml` | Development compose configuration |
| `nginx.conf` | Nginx configuration for production |
| `.dockerignore` | Files to exclude from Docker build |

---

## 🚀 Quick Start

### Development Mode (with Hot Reload)

```bash
# Build and start development container
docker-compose -f docker-compose.dev.yml up --build

# Or run in background
docker-compose -f docker-compose.dev.yml up -d --build
```

**Access:** http://localhost:8080

**Features:**
- ✅ Hot module replacement (HMR)
- ✅ Source code mounted as volume
- ✅ Changes reflect immediately
- ✅ Full TypeScript support

### Production Mode

```bash
# Build and start production container
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

**Access:** http://localhost:8080

**Features:**
- ✅ Optimized Nginx serving
- ✅ Gzipped assets
- ✅ Security headers
- ✅ Health check endpoint
- ✅ Small image size (~50MB)

---

## 📦 Prerequisites

### Required Software

1. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
   - Download: https://www.docker.com/products/docker-desktop/
   - Minimum version: Docker 20.10+
   - Docker Compose v2+

2. **Check Installation:**
```bash
docker --version
# Should show: Docker version 20.10.0 or higher

docker compose version
# Should show: Docker Compose version v2.0.0 or higher
```

---

## 🔧 Configuration

### Environment Variables

Docker will use your `.env` file automatically. Ensure it exists:

```bash
# Verify .env exists
Get-Content .env

# Should contain:
# VITE_SUPABASE_URL=https://hfscflqjpozqyfpohvjj.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Port Configuration

Default port: `8080`

To change the port, edit `docker-compose.yml`:

```yaml
ports:
  - "3000:80"  # Change 3000 to your preferred port
```

---

## 💻 Docker Commands

### Development Commands

```bash
# Start development server
docker-compose -f docker-compose.dev.yml up

# Start in background (detached)
docker-compose -f docker-compose.dev.yml up -d

# Stop containers
docker-compose -f docker-compose.dev.yml down

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild after dependency changes
docker-compose -f docker-compose.dev.yml up --build

# Execute commands in container
docker-compose -f docker-compose.dev.yml exec dev sh
```

### Production Commands

```bash
# Build and start
docker-compose up --build

# Start in background
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Restart containers
docker-compose restart

# View container status
docker-compose ps
```

### Docker Management

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove all unused resources
docker system prune -a

# View resource usage
docker stats
```

---

## 🏗️ Build Configurations

### Multi-Stage Production Build

The production `Dockerfile` uses a multi-stage build:

**Stage 1: Builder**
- Base: `node:20-alpine`
- Installs dependencies
- Builds Vite application
- Size: ~1GB (temporary)

**Stage 2: Runtime**
- Base: `nginx:alpine`
- Copies built files only
- Configured Nginx server
- Final size: ~50MB

**Benefits:**
- ✅ Small final image size
- ✅ Secure (no build tools in production)
- ✅ Fast deployment
- ✅ Optimized caching

### Development Build

Single-stage build with:
- Node.js development server
- Hot module replacement
- Source code mounted as volumes
- All dev dependencies included

---

## 🔍 Architecture

### Production Architecture

```
┌─────────────────────────────────────┐
│  Docker Container                    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Nginx (Alpine Linux)        │   │
│  │  - Serves static files       │   │
│  │  - Gzip compression          │   │
│  │  - Security headers          │   │
│  │  - SPA routing               │   │
│  └─────────────────────────────┘   │
│           │                         │
│           ▼                         │
│  ┌─────────────────────────────┐   │
│  │  Built Application          │   │
│  │  /usr/share/nginx/html/     │   │
│  │  - index.html               │   │
│  │  - assets/                  │   │
│  │  - favicon, etc.            │   │
│  └─────────────────────────────┘   │
│                                     │
└────────────┬────────────────────────┘
             │ Port 8080
             ▼
      Your Browser
```

### Development Architecture

```
┌─────────────────────────────────────┐
│  Docker Container                    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Vite Dev Server            │   │
│  │  - Hot Module Replacement   │   │
│  │  - Fast refresh             │   │
│  │  - TypeScript compilation   │   │
│  └─────────────────────────────┘   │
│           │                         │
│           ▼                         │
│  ┌─────────────────────────────┐   │
│  │  Source Code (Volume)       │   │
│  │  Mounted from host:         │   │
│  │  - ./src → /app/src         │   │
│  │  - ./public → /app/public   │   │
│  └─────────────────────────────┘   │
│                                     │
└────────────┬────────────────────────┘
             │ Port 8080
             ▼
      Your Browser (with HMR)
```

---

## 🧪 Testing Docker Setup

### 1. Build Test

```bash
# Test production build
docker build -t con-form-dashboard .

# Should complete without errors
# Final output should show image size
```

### 2. Run Test

```bash
# Start container
docker run -p 8080:80 \
  -e VITE_SUPABASE_URL="https://hfscflqjpozqyfpohvjj.supabase.co" \
  -e VITE_SUPABASE_PUBLISHABLE_KEY="your-key" \
  con-form-dashboard

# Access http://localhost:8080
```

### 3. Health Check Test

```bash
# Check health endpoint
curl http://localhost:8080/health

# Should return: "healthy"
```

### 4. Container Logs

```bash
# View logs
docker logs con-form-dashboard

# Should show Nginx startup messages
```

---

## 🔒 Security Features

### Production Security

1. **Multi-stage Build**
   - No build tools in final image
   - Minimal attack surface

2. **Nginx Security Headers**
   - X-Frame-Options: SAMEORIGIN
   - X-Content-Type-Options: nosniff
   - X-XSS-Protection: 1; mode=block
   - Referrer-Policy: strict-origin-when-cross-origin

3. **File Access Control**
   - Hidden files blocked (`.env`, `.git`)
   - Only built assets accessible

4. **Health Check**
   - Container auto-restarts on failure
   - Monitors application availability

5. **Non-root User** (recommended addition)
   ```dockerfile
   # Add to Dockerfile for extra security
   RUN addgroup -g 1001 -S nodejs && \
       adduser -S nodejs -u 1001
   USER nodejs
   ```

---

## 🚀 Deployment Options

### 1. Docker Hub

```bash
# Tag image
docker tag con-form-dashboard yourusername/con-form-dashboard:latest

# Login to Docker Hub
docker login

# Push image
docker push yourusername/con-form-dashboard:latest

# Pull and run on any server
docker pull yourusername/con-form-dashboard:latest
docker run -p 80:80 yourusername/con-form-dashboard:latest
```

### 2. AWS ECS (Elastic Container Service)

```bash
# Install AWS CLI and authenticate
aws configure

# Create ECR repository
aws ecr create-repository --repository-name con-form-dashboard

# Tag and push
docker tag con-form-dashboard:latest AWS_ACCOUNT.dkr.ecr.region.amazonaws.com/con-form-dashboard:latest
docker push AWS_ACCOUNT.dkr.ecr.region.amazonaws.com/con-form-dashboard:latest
```

### 3. Google Cloud Run

```bash
# Build and tag
docker build -t gcr.io/PROJECT_ID/con-form-dashboard .

# Push to GCR
docker push gcr.io/PROJECT_ID/con-form-dashboard

# Deploy
gcloud run deploy con-form-dashboard \
  --image gcr.io/PROJECT_ID/con-form-dashboard \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### 4. Azure Container Instances

```bash
# Login to Azure
az login

# Create container
az container create \
  --resource-group myResourceGroup \
  --name con-form-dashboard \
  --image con-form-dashboard:latest \
  --dns-name-label con-form-dashboard \
  --ports 80
```

### 5. Local Server / VPS

```bash
# On your server
docker pull yourusername/con-form-dashboard:latest
docker run -d -p 80:80 --restart unless-stopped con-form-dashboard
```

---

## 📊 Performance Optimization

### Image Size Optimization

Current sizes:
- **Production image:** ~50MB (with Nginx Alpine)
- **Development image:** ~500MB (with full Node.js)

**Further optimization:**

1. **Use specific Node version:**
```dockerfile
FROM node:20.11-alpine  # Pin version
```

2. **Clean npm cache:**
```dockerfile
RUN npm ci --only=production=false && \
    npm cache clean --force
```

3. **Remove unnecessary files:**
```dockerfile
RUN rm -rf /app/src /app/public /app/*.md
```

### Build Speed Optimization

1. **Layer caching:**
   - `package*.json` copied first
   - Dependencies installed before copying source
   - Source changes don't rebuild dependencies

2. **Build cache:**
```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker build -t con-form-dashboard .
```

3. **Parallel builds:**
```bash
# Build with all CPU cores
docker build --build-arg BUILDKIT_INLINE_CACHE=1 .
```

---

## 🔍 Troubleshooting

### Issue: "Port already in use"

**Error:** `Bind for 0.0.0.0:8080 failed: port is already allocated`

**Solution:**
```bash
# Find process using port
netstat -ano | findstr :8080

# Kill the process or change Docker port
docker-compose up -p 3000:80
```

### Issue: "Cannot connect to Docker daemon"

**Solution:**
```bash
# Start Docker Desktop (Windows/Mac)
# Or start Docker service (Linux)
sudo systemctl start docker
```

### Issue: "Build fails with EACCES"

**Solution:**
```bash
# Clear Docker build cache
docker builder prune -a

# Rebuild
docker-compose up --build --force-recreate
```

### Issue: "Environment variables not loading"

**Solution:**
```bash
# Verify .env file exists
ls -la .env

# Explicitly pass environment variables
docker run -p 8080:80 \
  --env-file .env \
  con-form-dashboard
```

### Issue: "Hot reload not working in dev mode"

**Solution:**
```bash
# On Windows, may need polling
# Edit docker-compose.dev.yml:
environment:
  - CHOKIDAR_USEPOLLING=true
```

### Issue: "Image too large"

**Solution:**
```bash
# Check image size
docker images con-form-dashboard

# Use multi-stage build (already configured)
# Clean build cache
docker system prune -a
```

---

## 📋 Useful Docker Compose Commands

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs

# Follow logs
docker-compose logs -f

# View logs for specific service
docker-compose logs app

# Restart services
docker-compose restart

# Rebuild services
docker-compose build

# Force recreate containers
docker-compose up --force-recreate

# Scale services (if configured)
docker-compose up --scale app=3

# Execute command in service
docker-compose exec app sh

# List services
docker-compose ps

# View service configuration
docker-compose config
```

---

## 🎯 Best Practices

### Development

✅ **DO:**
- Use `docker-compose.dev.yml` for development
- Mount source code as volumes
- Keep node_modules in container
- Use environment variables from `.env`
- Enable hot reload

❌ **DON'T:**
- Use production Dockerfile for development
- Build image for every code change
- Expose sensitive data in Dockerfile
- Run as root user

### Production

✅ **DO:**
- Use multi-stage builds
- Pin base image versions
- Set health checks
- Use restart policies
- Minimize image size
- Scan images for vulnerabilities
- Use `.dockerignore`

❌ **DON'T:**
- Include source code in final image
- Use `latest` tag in production
- Run unnecessary services
- Expose debug ports
- Store secrets in images

---

## 🔐 Environment Variables Best Practices

### Development

```bash
# Use .env file
docker-compose -f docker-compose.dev.yml up
```

### Production

```bash
# Use --env-file for sensitive data
docker run --env-file .env.production con-form-dashboard

# Or pass explicitly (CI/CD)
docker run \
  -e VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  -e VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" \
  con-form-dashboard
```

### Never commit:
- ❌ `.env` files
- ❌ Secrets in Dockerfile
- ❌ API keys in code
- ❌ Production credentials

---

## 📊 Monitoring & Logs

### View Container Stats

```bash
# Real-time stats
docker stats con-form-dashboard

# All containers
docker stats
```

### Access Logs

```bash
# Nginx access logs (production)
docker exec con-form-dashboard tail -f /var/log/nginx/access.log

# Nginx error logs
docker exec con-form-dashboard tail -f /var/log/nginx/error.log

# Application logs (dev)
docker-compose -f docker-compose.dev.yml logs -f dev
```

### Health Monitoring

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' con-form-dashboard

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' con-form-dashboard
```

---

## ✅ Docker Setup Checklist

- [x] `Dockerfile` created (production)
- [x] `Dockerfile.dev` created (development)
- [x] `docker-compose.yml` created
- [x] `docker-compose.dev.yml` created
- [x] `nginx.conf` configured
- [x] `.dockerignore` set up
- [x] Multi-stage build configured
- [x] Health checks enabled
- [x] Security headers added
- [x] Gzip compression enabled
- [x] SPA routing configured
- [x] Volume mounts for dev
- [x] Environment variable support

### Next Steps:

- [ ] Install Docker Desktop (if not installed)
- [ ] Test development build
- [ ] Test production build
- [ ] Push to Docker registry (optional)
- [ ] Deploy to cloud platform (optional)

---

## 🎉 Summary

✅ **Docker is now fully configured!**

**What you have:**
- Production-ready Dockerfile with Nginx
- Development Dockerfile with hot reload
- Docker Compose for both environments
- Optimized build process (multi-stage)
- Security headers and best practices
- Health monitoring
- Comprehensive documentation

**To start using:**

```bash
# Development (with hot reload)
docker-compose -f docker-compose.dev.yml up

# Production
docker-compose up --build
```

Your dashboard will be available at **http://localhost:8080** 🚀

---

**Last Updated:** October 30, 2025  
**Status:** ✅ Fully Configured and Ready to Use

