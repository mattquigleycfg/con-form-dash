# Netlify Configuration Guide

## 🌐 Environment Variables for Netlify

### Copy These Values to Netlify Dashboard

**Access:** https://app.netlify.com/sites/[your-site-name]/configuration/env

---

## Variable 1: Supabase URL

```
Key: VITE_SUPABASE_URL
Value: https://ibqgwakjmsnjtvwpkdns.supabase.co
Scopes: All (Production, Deploy Previews, Branch deploys)
```

---

## Variable 2: Supabase Publishable Key

```
Key: VITE_SUPABASE_PUBLISHABLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlicWd3YWtqbXNuanR2d3BrZG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NzU3MjIsImV4cCI6MjA3NzM1MTcyMn0.mufRIN2JjlfrVqHZ6PnFypkTxvGWW562CO6IHO2skdI
Scopes: All (Production, Deploy Previews, Branch deploys)
```

---

## ⚠️ Important Notes

1. **Do NOT add Odoo credentials to Netlify**
   - ODOO_URL - ❌ Don't add
   - ODOO_USERNAME - ❌ Don't add
   - ODOO_PASSWORD - ❌ Don't add
   - ODOO_API_KEY - ❌ Don't add

2. **These stay in Supabase Edge Functions only**

---

## 📋 Step-by-Step Instructions

### Option 1: Using Netlify UI (Recommended)

1. **Login to Netlify:** https://app.netlify.com/
2. **Select your site** from the sites list
3. **Navigate:** Site configuration → Environment variables
4. **Click:** "Add a variable" button
5. **Enter Key:** `VITE_SUPABASE_URL`
6. **Enter Value:** `https://ibqgwakjmsnjtvwpkdns.supabase.co`
7. **Select Scopes:** Check all boxes (Production, Deploy Previews, Branch deploys)
8. **Click:** "Create variable"
9. **Repeat steps 4-8** for `VITE_SUPABASE_PUBLISHABLE_KEY`
10. **Trigger new deployment:** Deploys → Trigger deploy → Deploy site

### Option 2: Using Netlify CLI

If you have Netlify CLI installed:

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to your site (if not already linked)
netlify link

# Add environment variables
netlify env:set VITE_SUPABASE_URL "https://ibqgwakjmsnjtvwpkdns.supabase.co"
netlify env:set VITE_SUPABASE_PUBLISHABLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlicWd3YWtqbXNuanR2d3BrZG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NzU3MjIsImV4cCI6MjA3NzM1MTcyMn0.mufRIN2JjlfrVqHZ6PnFypkTxvGWW562CO6IHO2skdI"

# Trigger new deployment
netlify deploy --prod
```

---

## 🧪 Verification

After adding variables and redeploying:

1. **Open your deployed site**
2. **Open browser DevTools** (F12)
3. **Go to Console tab**
4. **Run:**
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL);
   ```
5. **Should display:** `https://ibqgwakjmsnjtvwpkdns.supabase.co`

---

## 🚀 Build Settings

While you're in Netlify, verify these settings:

**Site configuration → Build & deploy → Build settings:**

```
Base directory: (leave empty)
Build command: npm run build
Publish directory: dist
```

**Deploy contexts:**
- Production branch: main
- Branch deploys: All branches
- Deploy previews: Automatically build deploy previews for all PRs

---

## 🔍 Troubleshooting

### Issue: "Environment variables not loading"

**Solution:**
1. Verify variables are added in Netlify dashboard
2. Check spelling exactly matches (case-sensitive)
3. Trigger a new deployment (don't use cached build)
4. Clear browser cache

### Issue: "Supabase connection fails in production"

**Checklist:**
- ✅ Both variables added to Netlify?
- ✅ Values match exactly (no extra spaces)?
- ✅ Scopes include "Production"?
- ✅ Site redeployed after adding variables?

### Issue: "Build fails after adding variables"

**Check:**
1. Build command is correct: `npm run build`
2. Node version is compatible (18 or 20)
3. Check build logs for specific errors

---

## 📊 Expected Deploy Time

- **Build time:** ~5-10 seconds
- **Deploy time:** ~30 seconds
- **Total:** ~1 minute from trigger to live

---

## ✅ Checklist

Before deploying:

- [ ] Netlify account set up
- [ ] Site connected to Git repository
- [ ] Build settings configured
- [ ] `VITE_SUPABASE_URL` added
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` added
- [ ] Variables applied to all scopes
- [ ] New deployment triggered
- [ ] Site loads successfully
- [ ] Can sign in/up
- [ ] No console errors

---

## 🎯 Quick Copy-Paste

For easy copying:

**Variable 1:**
```
VITE_SUPABASE_URL=https://ibqgwakjmsnjtvwpkdns.supabase.co
```

**Variable 2:**
```
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlicWd3YWtqbXNuanR2d3BrZG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NzU3MjIsImV4cCI6MjA3NzM1MTcyMn0.mufRIN2JjlfrVqHZ6PnFypkTxvGWW562CO6IHO2skdI
```

---

**Last Updated:** October 30, 2025  
**Status:** Ready to Deploy

