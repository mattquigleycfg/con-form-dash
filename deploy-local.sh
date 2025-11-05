#!/bin/bash

# Con-form Dashboard - Local Deployment Script
# This script builds and deploys the application locally for testing

echo "========================================"
echo "  Con-form Dashboard - Local Deploy"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check Node.js installation
echo -e "${YELLOW}[1/6] Checking Node.js installation...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

# Check npm installation
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm $NPM_VERSION installed${NC}"
else
    echo -e "${RED}✗ npm not found. Please install npm first.${NC}"
    exit 1
fi

echo ""

# Check environment configuration
echo -e "${YELLOW}[2/6] Checking environment configuration...${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file found${NC}"
    
    # Verify required variables
    if grep -q "VITE_SUPABASE_URL=https://" .env && grep -q "VITE_SUPABASE_PUBLISHABLE_KEY=" .env; then
        echo -e "${GREEN}✓ Required environment variables configured${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Some environment variables may be missing${NC}"
        echo -e "${YELLOW}  Please check .env file and compare with env.example${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env file not found. Creating from env.example...${NC}"
    if [ -f env.example ]; then
        cp env.example .env
        echo -e "${GREEN}✓ .env created. Please configure it with your credentials.${NC}"
        echo ""
        echo -e "${CYAN}Required variables:${NC}"
        echo -e "${CYAN}  - VITE_SUPABASE_URL${NC}"
        echo -e "${CYAN}  - VITE_SUPABASE_PUBLISHABLE_KEY${NC}"
        echo ""
        echo -e "${YELLOW}Edit .env file and run this script again.${NC}"
        exit 1
    else
        echo -e "${RED}✗ env.example not found${NC}"
        exit 1
    fi
fi

echo ""

# Install dependencies
echo -e "${YELLOW}[3/6] Installing dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed successfully${NC}"
else
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
fi

echo ""

# Build application
echo -e "${YELLOW}[4/6] Building application for production...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build completed successfully${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""

# Verify build artifacts
echo -e "${YELLOW}[5/6] Verifying build artifacts...${NC}"
if [ -f dist/index.html ]; then
    echo -e "${GREEN}✓ dist/index.html found${NC}"
else
    echo -e "${RED}✗ dist/index.html not found${NC}"
    exit 1
fi

if [ -d dist/assets ]; then
    ASSET_COUNT=$(ls -1 dist/assets | wc -l)
    echo -e "${GREEN}✓ dist/assets folder found ($ASSET_COUNT files)${NC}"
else
    echo -e "${RED}✗ dist/assets folder not found${NC}"
    exit 1
fi

echo ""

# Calculate build size
DIST_SIZE=$(du -sh dist | cut -f1)
echo -e "${CYAN}Build size: $DIST_SIZE${NC}"

echo ""

# Start preview server
echo -e "${YELLOW}[6/6] Starting preview server...${NC}"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ✓ DEPLOYMENT SUCCESSFUL${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${GREEN}Your application is ready!${NC}"
echo ""
echo -e "${CYAN}Preview server will start in 3 seconds...${NC}"
echo -e "${CYAN}Access at: http://localhost:4173${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

sleep 3

# Start preview server
npm run preview

