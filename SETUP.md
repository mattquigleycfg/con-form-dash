# Con-form Dashboard - Setup Guide

This guide will help you set up and run the Con-form Dashboard locally.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables (see below)
# Copy env.example to .env and fill in values

# 3. Start development server
npm run dev

# 4. Open browser
# Navigate to http://localhost:8080
```

---

## 📋 Prerequisites

### Required Software

- **Node.js** >= 18.0.0 (recommended: 20.x LTS)
- **npm** >= 9.0.0
- **Git**

### Check your versions:

```bash
node --version   # Should be v18+ or v20+
npm --version    # Should be v9+
```

### Installation

If you need to install Node.js, use [nvm](https://github.com/nvm-sh/nvm):

```bash
# Install Node.js 20 LTS
nvm install 20
nvm use 20
```

---

## 🔧 Environment Setup

### 1. Supabase Configuration

You need Supabase credentials to connect to the backend:

1. **Get Supabase URL and Key:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/settings/api)
   - Copy your **Project URL**
   - Copy your **anon public** key

2. **Create `.env` file:**

```bash
# Copy the example file
cp env.example .env
```

3. **Edit `.env`** and add your credentials:

```env
VITE_SUPABASE_URL=https://ibqgwakjmsnjtvwpkdns.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_actual_anon_key_here
```

### 2. Odoo Integration (Backend)

Odoo credentials are configured in **Supabase Edge Functions** (not in your local `.env`):

1. Go to [Supabase Dashboard > Edge Functions > Secrets](https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/functions)
2. Add these secrets:
   - `ODOO_URL` - Your Odoo instance URL (e.g., `https://your-company.odoo.com`)
   - `ODOO_USERNAME` - Your Odoo login email
   - `ODOO_PASSWORD` - Your Odoo password
   - `ODOO_API_KEY` - (Optional) If using API key authentication

> ⚠️ **Note:** Without Odoo credentials, the app will run but data won't sync from Odoo.

---

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at:
- **Local:** http://localhost:8080
- **Network:** http://[your-ip]:8080

Features:
- ✅ Hot Module Replacement (HMR)
- ✅ Fast Refresh
- ✅ TypeScript checking
- ✅ ESLint

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

The built files will be in the `dist/` directory.

### Development Build

```bash
# Build with development mode
npm run build:dev
```

---

## 📁 Project Structure

```
con-form-dash/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui base components
│   │   ├── filters/        # Filter system
│   │   └── job-costing/    # Job costing module
│   ├── contexts/           # React Context providers
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Route pages
│   ├── integrations/       # Supabase integration
│   ├── lib/                # Utilities
│   └── utils/              # Helper functions
├── supabase/
│   ├── functions/          # Edge Functions
│   └── migrations/         # Database migrations
├── public/                 # Static assets
└── dist/                   # Production build (generated)
```

---

## 🔑 Authentication

The application uses **Supabase Auth** for authentication.

### Default Login Flow

1. Navigate to `/auth`
2. Sign in with email/password
3. Or sign up for a new account

### Creating Admin Users

Users can be created through:
1. The signup form in the app
2. Supabase Dashboard > Authentication > Users

---

## 🧪 Development Tools

### Linting

```bash
# Run ESLint
npm run lint
```

### Type Checking

TypeScript is checked automatically during build. For manual checking:

```bash
# Check types
npx tsc --noEmit
```

### Code Formatting

The project uses consistent formatting. Recommended VS Code extensions:
- ESLint
- Prettier (if configured)
- Tailwind CSS IntelliSense

---

## 🔍 Troubleshooting

### Port 8080 Already in Use

If port 8080 is occupied, modify `vite.config.ts`:

```typescript
server: {
  host: "::",
  port: 3000,  // Change to your preferred port
}
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Vite Cache Issues

```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Build Errors

```bash
# Clean build
rm -rf dist
npm run build
```

### Environment Variables Not Loading

- Ensure `.env` file is in the project root
- Variable names must start with `VITE_`
- Restart the dev server after changing `.env`

### Supabase Connection Issues

1. Verify your Supabase URL and key are correct
2. Check if your Supabase project is active
3. Check browser console for errors
4. Verify network connectivity

### Odoo Sync Not Working

1. Verify Odoo credentials in Supabase Edge Functions
2. Check Odoo URL is correct (no trailing slash)
3. Ensure Odoo user has proper permissions
4. Check browser console and Supabase logs

---

## 🔐 Security Notes

### Environment Variables

- ✅ `.env` is in `.gitignore` - **never commit it**
- ✅ `VITE_` prefix makes variables public (embedded in build)
- ❌ Don't put secrets in `VITE_*` variables
- ✅ Odoo credentials stay server-side (Supabase Edge Functions)

### API Keys

- The Supabase anon key is **public** - it's safe in the frontend
- Row Level Security (RLS) policies protect your data
- Never expose Odoo credentials in frontend code

---

## 📊 Performance Optimization

### Bundle Size

Current production bundle: ~1.3MB (unminified), ~364KB (gzipped)

**Optimization recommendations:**

1. **Code Splitting:**
```typescript
// Lazy load routes
const JobCosting = lazy(() => import('./pages/JobCosting'));
```

2. **Chunk Analysis:**
```bash
# Install analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.ts and build
npm run build
```

3. **Tree Shaking:**
- Import only what you need from libraries
- Example: `import { Button } from '@/components/ui/button'`

---

## 🐛 Debugging

### Browser DevTools

1. **React DevTools** - Install browser extension
2. **Network Tab** - Monitor API calls
3. **Console** - Check for errors
4. **Application Tab** - Inspect localStorage, session

### VS Code Debugging

Add to `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:8080",
      "webRoot": "${workspaceFolder}/src"
    }
  ]
}
```

### Logging

The app uses a custom logger utility (`src/utils/logger.ts`).

---

## 📚 Additional Documentation

- [AUDIT.md](./AUDIT.md) - Comprehensive codebase audit
- [README.md](./README.md) - Project overview
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

---

## 🤝 Contributing

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Run linter: `npm run lint`
4. Test locally: `npm run dev`
5. Build: `npm run build`
6. Commit changes
7. Push and create PR

### Code Style

- Follow existing patterns
- Use TypeScript for new files
- Add JSDoc comments for complex functions
- Keep components small and focused
- Use custom hooks for business logic

---

## 🆘 Getting Help

### Issues

- Check existing issues on GitHub
- Search documentation
- Check browser console for errors
- Review Supabase logs

### Resources

- **Lovable Platform:** https://lovable.dev/projects/d5056f6f-e114-4e35-a8da-e68395a164c6
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns
- **Odoo Documentation:** https://www.odoo.com/documentation

---

## ✅ Setup Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file created from `env.example`
- [ ] Supabase credentials added to `.env`
- [ ] Odoo credentials configured in Supabase (if needed)
- [ ] Dev server running (`npm run dev`)
- [ ] Application accessible at http://localhost:8080
- [ ] No console errors
- [ ] Authentication working (can sign in/up)
- [ ] Production build successful (`npm run build`)

---

## 🎉 Next Steps

Once setup is complete:

1. **Explore the Dashboard** - Check out all the features
2. **Connect to Odoo** - Configure Odoo credentials for data sync
3. **Review the Code** - Familiarize yourself with the structure
4. **Read the Audit** - Check [AUDIT.md](./AUDIT.md) for insights
5. **Start Developing** - Build new features or fix issues

---

**Last Updated:** October 29, 2025  
**Status:** ✅ Setup Complete - Development Ready

