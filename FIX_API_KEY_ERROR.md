# 🔐 Fix: "Invalid API Key" Error

**Error:** `AuthApiError: Invalid API key` (401 Unauthorized)

---

## ✅ Git Status - RESOLVED

- ✅ All changes committed
- ✅ Pushed to origin/main successfully
- ✅ No merge conflicts
- ✅ Branch is up to date

---

## 🔑 Supabase API Key Issue

The API key in your `.env` file may be incorrect or outdated from Lovable.

### Current Setup:
```env
VITE_SUPABASE_URL=https://ibqgwakjmsnjtvwpkdns.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🎯 Solution: Get Fresh Credentials from Supabase

Since this project was set up from Lovable, the Supabase project exists. You need to get the **correct** anon/public key.

### Step 1: Get Your Supabase Credentials

1. **Go to Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/settings/api
   - Or: Dashboard → Project Settings → API

2. **Copy These Values:**

   **Project URL:**
   ```
   https://ibqgwakjmsnjtvwpkdns.supabase.co
   ```

   **anon/public key:** (Under "Project API keys" → "anon public")
   ```
   eyJhbGci...  (this is the one you need!)
   ```

3. **Update Your `.env` File:**

   Replace the `VITE_SUPABASE_PUBLISHABLE_KEY` with the correct key from Supabase dashboard.

### Step 2: Update `.env` File

```powershell
# Open .env in your editor
notepad .env

# Or update via PowerShell:
@"
VITE_SUPABASE_URL=https://ibqgwakjmsnjtvwpkdns.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ACTUAL_KEY_FROM_SUPABASE_DASHBOARD
"@ | Out-File -FilePath .env -Encoding utf8
```

### Step 3: Restart Development Server

**IMPORTANT:** Vite caches environment variables!

```powershell
# Stop any running Node processes
Stop-Process -Name "node" -Force

# Start fresh
npm run dev
```

### Step 4: Test the Connection

```bash
# Optional: Test Supabase connection
node test-supabase.js
```

---

## 🔍 Why This Happens

1. **Lovable generates project** → Creates Supabase project
2. **Keys might be regenerated** → Old keys become invalid
3. **Local .env has old key** → Authentication fails
4. **Vite caches env vars** → Restart required even after fixing

---

## 🧪 Verify Your Key is Valid

### Quick Check:

The key should:
- ✅ Start with `eyJhbGci`
- ✅ Contain the project ref: `ibqgwakjmsnjtvwpkdns`
- ✅ Be the **anon/public** key (not service_role)
- ✅ Match exactly what's in Supabase dashboard

### Decode Your Key (Optional):

You can decode the JWT to verify:

```javascript
// In browser console or Node.js
const key = 'your_key_here';
const payload = JSON.parse(atob(key.split('.')[1]));
console.log(payload);

// Should show:
// {
//   iss: "supabase",
//   ref: "ibqgwakjmsnjtvwpkdns",
//   role: "anon",
//   iat: 1728438985,
//   exp: 2044014985
// }
```

---

## 🚨 Common Mistakes

### ❌ DON'T:

1. **Use service_role key in frontend**
   ```env
   # ❌ WRONG - This is for backend only
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...service_role...
   ```

2. **Forget to restart dev server**
   ```bash
   # Edit .env
   # ❌ Keep old server running (uses cached env)
   ```

3. **Use expired or regenerated key**
   - If keys were regenerated in Supabase dashboard
   - Old keys become invalid immediately

### ✅ DO:

1. **Use anon/public key**
   ```env
   # ✅ CORRECT - anon key for frontend
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...anon...
   ```

2. **Always restart after .env changes**
   ```powershell
   Stop-Process -Name "node" -Force
   npm run dev
   ```

3. **Get fresh key from dashboard**
   - Always check Supabase dashboard for current key
   - Copy directly from there

---

## 📋 Step-by-Step Checklist

- [ ] Go to Supabase Dashboard
- [ ] Navigate to Project Settings → API
- [ ] Copy **anon public** key
- [ ] Paste into `.env` file as `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Save `.env` file
- [ ] Stop Node processes: `Stop-Process -Name "node" -Force`
- [ ] Start dev server: `npm run dev`
- [ ] Try signing in
- [ ] Should work now! ✅

---

## 🔗 Helpful Links

**Supabase Dashboard:**
- **Main:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns
- **API Settings:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/settings/api
- **Auth Settings:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/auth/users

**Lovable Project:**
- **URL:** https://lovable.dev/projects/d5056f6f-e114-4e35-a8da-e68395a164c6

---

## 🆘 Still Not Working?

### 1. Check if Supabase Project is Active

```powershell
# Test if project is reachable
curl https://ibqgwakjmsnjtvwpkdns.supabase.co
```

Should return HTML (not error).

### 2. Verify Environment Variables are Loaded

In browser console (after starting dev server):

```javascript
console.log(import.meta.env.VITE_SUPABASE_URL);
console.log(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
```

Both should show actual values (not undefined).

### 3. Check Browser Network Tab

- Open DevTools → Network
- Try signing in
- Look for request to `/auth/v1/token`
- Check request headers for `apikey`
- Verify it matches your `.env` file

### 4. Clear Vite Cache

```powershell
# Remove Vite cache
Remove-Item -Recurse -Force node_modules\.vite

# Restart
npm run dev
```

### 5. Check Supabase Service Status

Visit: https://status.supabase.com/

Ensure all services are operational.

---

## 💡 Pro Tips

### For Docker Users:

If using Docker, environment variables are baked into build:

```powershell
# Stop container
docker-compose -f docker-compose.dev.yml down

# Update .env with correct key

# Rebuild with new env vars
docker-compose -f docker-compose.dev.yml up --build
```

### For npm Users:

```powershell
# Always restart after .env changes
Stop-Process -Name "node" -Force
npm run dev
```

---

## 🎯 Expected Outcome

After following these steps:

```
✅ No "Invalid API key" errors
✅ Sign in/Sign up works
✅ Authentication successful
✅ Can access dashboard
```

---

## 📞 Quick Commands

```powershell
# Stop dev server
Stop-Process -Name "node" -Force

# Start dev server
npm run dev

# Test Supabase connection
node test-supabase.js

# Check environment variables
Get-Content .env | Select-String "VITE_SUPABASE"

# Check if dev server loaded env vars (in browser console)
# console.log(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
```

---

**Last Updated:** October 31, 2025  
**Status:** Waiting for correct Supabase key from dashboard

