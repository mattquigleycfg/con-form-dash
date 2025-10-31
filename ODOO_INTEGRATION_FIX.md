# 🔧 Odoo Integration Error Fix Guide

**Errors:** CORS + 406 Not Acceptable

---

## 🐛 **Problems Identified**

### 1. **CORS Error - Edge Functions**
```
Access to fetch at 'https://ibqgwakjmsnjtvwpkdns.supabase.co/functions/v1/odoo-query' 
from origin 'http://localhost:8080' has been blocked by CORS policy
```

**Cause:** Edge Functions not deployed to Supabase

### 2. **406 Not Acceptable - Database**
```
https://ibqgwakjmsnjtvwpkdns.supabase.co/rest/v1/monthly_targets?select=*
Failed to load resource: the server responded with a status of 406
```

**Cause:** Row Level Security (RLS) policies too restrictive

---

## ✅ **Solutions**

### **Fix 1: Deploy Edge Functions**

#### **Option A: Via Supabase Dashboard (Easiest)**

1. **Go to Edge Functions:**
   ```
   https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/functions
   ```

2. **Deploy odoo-query function:**
   - Click "Create a new function"
   - Name: `odoo-query`
   - Copy contents from: `supabase/functions/odoo-query/index.ts`
   - Click "Deploy function"

3. **Verify Environment Variables:**
   - Go to: Edge Functions → Secrets
   - Ensure these exist:
     ```
     ODOO_URL=https://con-formgroup.odoo.com
     ODOO_USERNAME=admin@waoconnect.com.au
     ODOO_PASSWORD=2i@YA-:/k/8/o.XNgwiO
     ODOO_API_KEY=47977d425aad95e73b4445b37b75bbc9a624f365
     ```

4. **Test Function:**
   ```bash
   curl -i --location --request POST \
     'https://ibqgwakjmsnjtvwpkdns.supabase.co/functions/v1/odoo-query' \
     --header 'Authorization: Bearer YOUR_ANON_KEY' \
     --header 'Content-Type: application/json' \
     --data '{"model":"res.partner","method":"search_read","args":[[],["name"]]}'
   ```

#### **Option B: Via Supabase CLI**

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref ibqgwakjmsnjtvwpkdns

# Deploy functions
supabase functions deploy odoo-query

# Set secrets
supabase secrets set ODOO_URL=https://con-formgroup.odoo.com
supabase secrets set ODOO_USERNAME=admin@waoconnect.com.au
supabase secrets set ODOO_PASSWORD='2i@YA-:/k/8/o.XNgwiO'
supabase secrets set ODOO_API_KEY=47977d425aad95e73b4445b37b75bbc9a624f365
```

---

### **Fix 2: Update RLS Policies**

#### **Run This Migration:**

Go to: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/sql

Run this SQL:

```sql
-- Fix RLS policies for monthly_targets
DROP POLICY IF EXISTS "Users can view their own monthly targets" ON public.monthly_targets;

CREATE POLICY "Authenticated users can view monthly targets" ON public.monthly_targets
    FOR SELECT USING (auth.role() = 'authenticated');

-- Fix for sales_targets
DROP POLICY IF EXISTS "Users can view their own sales targets" ON public.sales_targets;

CREATE POLICY "Authenticated users can view sales targets" ON public.sales_targets
    FOR SELECT USING (auth.role() = 'authenticated');

-- Fix for jobs
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;

CREATE POLICY "Authenticated users can view jobs" ON public.jobs
    FOR SELECT USING (auth.role() = 'authenticated');
```

**OR** run the migration file:
- Copy contents from: `supabase/migrations/20251031000003_fix_rls_policies.sql`
- Paste in SQL Editor
- Click "Run"

---

## 🧪 **Testing**

### **1. Test Edge Function**

Open browser console (F12) and run:

```javascript
const { data, error } = await supabase.functions.invoke('odoo-query', {
  body: {
    model: 'res.partner',
    method: 'search_read',
    args: [[], ['name']],
  }
});

console.log('Result:', data);
console.log('Error:', error);
```

**Expected:** Should return Odoo partner data

### **2. Test Database Access**

```javascript
const { data, error } = await supabase
  .from('monthly_targets')
  .select('*')
  .limit(5);

console.log('Targets:', data);
console.log('Error:', error);
```

**Expected:** Should return monthly targets data (or empty array)

### **3. Test Odoo Sync**

In your dashboard:
1. Click "Sync Odoo" button
2. Check console for errors
3. Should see "Sync successful" toast

---

## 🔍 **Verify Setup**

### **Check 1: Edge Function Deployed**

```bash
curl https://ibqgwakjmsnjtvwpkdns.supabase.co/functions/v1/odoo-query
```

**Should NOT return:**
- CORS error
- 404 Not Found
- ERR_FAILED

**Should return:**
- 400 or 500 with JSON error (function exists but needs proper request)

### **Check 2: Secrets Configured**

Go to: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/settings/functions

**Verify these secrets exist:**
- ✅ ODOO_URL
- ✅ ODOO_USERNAME
- ✅ ODOO_PASSWORD
- ✅ ODOO_API_KEY

### **Check 3: RLS Policies**

Run in SQL Editor:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('monthly_targets', 'sales_targets', 'jobs')
ORDER BY tablename, policyname;
```

**Should show:**
- Policies exist for SELECT, INSERT, UPDATE, DELETE
- SELECT policy uses `auth.role() = 'authenticated'`

---

## 🚨 **Common Issues**

### **Issue: Still Getting CORS Errors**

**Solution:**
1. Ensure function is deployed (check Supabase dashboard)
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R)
4. Check function logs for errors:
   ```
   https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/functions/odoo-query/logs
   ```

### **Issue: Still Getting 406 Errors**

**Solution:**
1. Verify you're signed in (check Auth state)
2. Run RLS fix migration
3. Check if user_id column matches auth.uid():
   ```sql
   SELECT id, user_id, auth.uid() as current_user
   FROM monthly_targets
   LIMIT 1;
   ```

### **Issue: "Odoo credentials not configured"**

**Solution:**
1. Go to Edge Functions → Secrets
2. Add all 4 Odoo secrets
3. Redeploy function
4. Test again

### **Issue: "Odoo authentication failed"**

**Solution:**
1. Verify Odoo URL: https://con-formgroup.odoo.com (no trailing slash)
2. Test Odoo login manually at that URL
3. Check username/password are correct
4. Ensure Odoo instance is accessible

---

## 📝 **Quick Fix Checklist**

- [ ] **Deploy Edge Function:**
  - [ ] Go to Supabase Dashboard
  - [ ] Functions → Create new function
  - [ ] Name: `odoo-query`
  - [ ] Copy code from `supabase/functions/odoo-query/index.ts`
  - [ ] Click "Deploy"

- [ ] **Add Secrets:**
  - [ ] Go to Edge Functions → Secrets
  - [ ] Add `ODOO_URL`
  - [ ] Add `ODOO_USERNAME`
  - [ ] Add `ODOO_PASSWORD`
  - [ ] Add `ODOO_API_KEY`

- [ ] **Fix RLS Policies:**
  - [ ] Go to SQL Editor
  - [ ] Run migration `20251031000003_fix_rls_policies.sql`
  - [ ] OR run fix SQL from above

- [ ] **Test:**
  - [ ] Restart dev server
  - [ ] Sign in to app
  - [ ] Click "Sync Odoo"
  - [ ] Check for errors

---

## 🎯 **Expected Results After Fix**

### **No More CORS Errors:**
```
✅ Edge Function responds
✅ Odoo data syncs successfully
✅ Dashboard populates with data
```

### **No More 406 Errors:**
```
✅ monthly_targets data loads
✅ Dashboard metrics display
✅ No RLS blocking errors
```

### **Working Dashboard:**
```
✅ Authentication works
✅ Odoo sync button works
✅ Data displays correctly
✅ No console errors
```

---

## 🔧 **Alternative: Temporarily Disable RLS (DEV ONLY)**

**⚠️ WARNING: Only for development/testing!**

```sql
-- Disable RLS temporarily
ALTER TABLE monthly_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;

-- Test your app...

-- Re-enable RLS (IMPORTANT!)
ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
```

---

## 📞 **Support Links**

- **Supabase Functions:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/functions
- **SQL Editor:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/sql
- **Function Logs:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/functions/odoo-query/logs
- **Database Tables:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/editor

---

## ✅ **Summary**

**Two main fixes needed:**

1. **Deploy `odoo-query` Edge Function** with Odoo credentials
2. **Update RLS policies** to allow authenticated user access

**After these fixes:**
- ✅ CORS errors will disappear
- ✅ 406 errors will be resolved
- ✅ Odoo integration will work
- ✅ Dashboard will load data

---

**Last Updated:** October 31, 2025  
**Status:** Ready to Fix

