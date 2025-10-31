# 🚀 Deploy Con-form Dashboard to Netlify

**Quick Guide:** Get your dashboard deployed to Netlify in 5 minutes

---

## 📋 Prerequisites

- ✅ Netlify CLI installed (you have v21.6.0)
- ✅ Logged into Netlify (matthew.james.quigley@gmail.com)
- ✅ GitHub repository: https://github.com/mattquigleycfg/con-form-dash
- ✅ Local build works (`npm run build` ✅)

---

## 🎯 Option 1: Automatic Deploy (Recommended - 2 minutes)

### Step 1: Create New Site on Netlify

Run this command in your terminal:

```bash
netlify init
```

**Follow the prompts:**

1. **What would you like to do?**  
   → Select: `Create & configure a new site`

2. **Team:**  
   → Select: `matthewjquigley's team`

3. **Site name (optional):**  
   → Enter: `con-form-dashboard` (or leave blank for auto-generated)

4. **Your build command:**  
   → Enter: `npm run build`

5. **Directory to deploy:**  
   → Enter: `dist`

6. **Netlify functions folder:**  
   → Press Enter (skip)

7. **Add environment variables?**  
   → Select: `Yes`

8. **Add variables:**
   ```
   VITE_SUPABASE_URL = https://hfscflqjpozqyfpohvjj.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmc2NmbHFqcG96cXlmcG9odmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0Mzg5ODUsImV4cCI6MjA0NDAxNDk4NX0.VF0RBEsJJNUzQv8_Jt3zv5TC9D5rLKU8v5OmPvGPpYs
   ```

9. **Done!** Your site will be created and deployed.

---

## 🎯 Option 2: Manual Setup (If init doesn't work)

### Step 1: Create Site via Dashboard

1. Go to: https://app.netlify.com/
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **"GitHub"**
4. Choose repository: **mattquigleycfg/con-form-dash**
5. Configure build settings:
   ```
   Base directory: (leave empty)
   Build command: npm run build
   Publish directory: dist
   ```
6. Click **"Deploy site"**

### Step 2: Add Environment Variables

After the site is created, I'll add the environment variables for you via CLI.

---

## 💻 Commands to Run

Since you have Netlify CLI, I've prepared the commands. Run these in order:

### Command 1: Initialize Netlify Site
```bash
netlify init
```

**OR if the site already exists on Netlify:**

### Command 2: Link to Existing Site
```bash
netlify link
```
Then select the con-form site from the list.

### Command 3: Add Environment Variables
```bash
netlify env:set VITE_SUPABASE_URL "https://hfscflqjpozqyfpohvjj.supabase.co" --context production --context deploy-preview --context branch-deploy
```

```bash
netlify env:set VITE_SUPABASE_PUBLISHABLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmc2NmbHFqcG96cXlmcG9odmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0Mzg5ODUsImV4cCI6MjA0NDAxNDk4NX0.VF0RBEsJJNUzQv8_Jt3zv5TC9D5rLKU8v5OmPvGPpYs" --context production --context deploy-preview --context branch-deploy
```

### Command 4: Verify Environment Variables
```bash
netlify env:list
```

### Command 5: Deploy
```bash
netlify deploy --prod
```

---

## 📝 Manual Steps (Via Netlify Dashboard)

If you prefer using the web interface:

### 1. Create Site

**URL:** https://app.netlify.com/team/matthewjquigley/sites

1. Click **"Add new site"**
2. Select **"Import an existing project"**
3. Choose **GitHub**
4. Search for: `con-form-dash`
5. Click on: `mattquigleycfg/con-form-dash`

### 2. Configure Build

```
Branch to deploy: main
Base directory: (leave empty)
Build command: npm run build
Publish directory: dist
```

Click **"Deploy site"**

### 3. Add Environment Variables

After deployment starts:

1. Go to: **Site configuration** → **Environment variables**
2. Click **"Add a variable"**

**Variable 1:**
```
Key: VITE_SUPABASE_URL
Value: https://hfscflqjpozqyfpohvjj.supabase.co
Scopes: ✅ Production ✅ Deploy previews ✅ Branch deploys
```

**Variable 2:**
```
Key: VITE_SUPABASE_PUBLISHABLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmc2NmbHFqcG96cXlmcG9odmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0Mzg5ODUsImV4cCI6MjA0NDAxNDk4NX0.VF0RBEsJJNUzQv8_Jt3zv5TC9D5rLKU8v5OmPvGPpYs
Scopes: ✅ Production ✅ Deploy previews ✅ Branch deploys
```

### 4. Trigger Redeploy

1. Go to **Deploys** tab
2. Click **"Trigger deploy"** → **"Deploy site"**

---

## 🧪 Testing After Deployment

1. **Wait for deploy to complete** (~1-2 minutes)
2. **Open your site URL** (will be shown after deploy)
3. **Test authentication:**
   - Click "Sign Up" or "Sign In"
   - Create an account or log in
   - Should work without errors
4. **Check browser console:**
   - No Supabase connection errors
   - Environment variables loaded

---

## 🔍 Troubleshooting

### Issue: "Cannot connect to Supabase"

**Check:**
```bash
netlify env:list
```

Ensure both variables are listed. If not:
```bash
netlify env:set VITE_SUPABASE_URL "https://hfscflqjpozqyfpohvjj.supabase.co"
netlify env:set VITE_SUPABASE_PUBLISHABLE_KEY "your-key-here"
```

Then redeploy:
```bash
netlify deploy --prod
```

### Issue: "Build fails"

**Check build logs:**
1. Netlify Dashboard → Your site → Deploys → Latest deploy
2. Click on the failed deploy
3. Check "Deploy log" for errors

**Common fixes:**
- Ensure `package.json` has `"build": "vite build"`
- Check Node version (should be 18 or 20)
- Verify all dependencies are in `package.json`

### Issue: "Site not found"

**Link the site:**
```bash
netlify link
```
Select your site from the list.

---

## 📊 Expected Results

### Successful Deploy:

```
Deploy is live!

Website URL:       https://con-form-dashboard.netlify.app
Admin URL:         https://app.netlify.com/sites/con-form-dashboard
Deploy ID:         [unique-id]
Deploy time:       45s
```

### Build Stats:
- **Build time:** ~5-10 seconds
- **Deploy time:** ~30-45 seconds  
- **Bundle size:** ~1.3 MB (364 KB gzipped)

---

## ⚡ Quick Start Commands

**All-in-one setup:**

```bash
# Initialize and deploy
netlify init

# OR if site exists, link and deploy
netlify link
netlify env:set VITE_SUPABASE_URL "https://hfscflqjpozqyfpohvjj.supabase.co"
netlify env:set VITE_SUPABASE_PUBLISHABLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhmc2NmbHFqcG96cXlmcG9odmpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0Mzg5ODUsImV4cCI6MjA0NDAxNDk4NX0.VF0RBEsJJNUzQv8_Jt3zv5TC9D5rLKU8v5OmPvGPpYs"
netlify deploy --prod
```

---

## 📋 Deployment Checklist

- [ ] GitHub repository connected
- [ ] Netlify site created
- [ ] Build settings configured
- [ ] Environment variables added
- [ ] Site deployed successfully
- [ ] URL accessible
- [ ] Authentication works
- [ ] No console errors
- [ ] Data loads correctly

---

## 🎯 What's Next?

After successful deployment:

1. **Custom Domain** (optional)
   - Site configuration → Domain management
   - Add your custom domain

2. **Configure Odoo**
   - Add Odoo credentials to Supabase (see ODOO_CREDENTIALS_SETUP.md)
   - Test Odoo data sync

3. **Enable Continuous Deployment**
   - Already enabled! Push to `main` branch auto-deploys

4. **Monitor**
   - Check deploy notifications
   - Monitor error logs
   - Review analytics

---

## 📞 Quick Links

- **Netlify Dashboard:** https://app.netlify.com/team/matthewjquigley
- **GitHub Repo:** https://github.com/mattquigleycfg/con-form-dash
- **Supabase Dashboard:** https://supabase.com/dashboard/project/hfscflqjpozqyfpohvjj
- **Local Dev:** http://localhost:8080

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ Site URL is live
- ✅ No build errors
- ✅ Authentication works
- ✅ Supabase connection active
- ✅ UI loads correctly
- ✅ No console errors

---

**Ready to deploy?** Run `netlify init` to get started! 🚀

**Last Updated:** October 30, 2025  
**Status:** Ready to Deploy

