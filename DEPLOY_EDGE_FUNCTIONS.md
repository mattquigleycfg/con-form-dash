# 🚀 Deploy Edge Functions to Supabase

**Quick guide to deploy the `odoo-query` Edge Function**

---

## ❌ **What You Did Wrong**

You tried to run TypeScript code in the **SQL Editor**. Edge Functions are **NOT SQL** - they're Deno/TypeScript code that runs separately.

---

## ✅ **Correct Way: Deploy via Dashboard**

### **Step 1: Go to Edge Functions**

Open this URL:
```
https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/functions
```

### **Step 2: Create New Function**

1. Click **"Create a new function"** or **"New Edge Function"**
2. **Function name:** `odoo-query`
3. You'll see a code editor

### **Step 3: Copy the Function Code**

Open: `supabase/functions/odoo-query/index.ts`

Copy ALL the code (118 lines):

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, method, args, kwargs } = await req.json();
    
    let ODOO_URL = Deno.env.get('ODOO_URL');
    const ODOO_USERNAME = Deno.env.get('ODOO_USERNAME');
    const ODOO_PASSWORD = Deno.env.get('ODOO_PASSWORD');
    const ODOO_API_KEY = Deno.env.get('ODOO_API_KEY');

    if (!ODOO_URL || !ODOO_USERNAME || !ODOO_PASSWORD) {
      console.error('Missing Odoo credentials:', {
        hasUrl: !!ODOO_URL,
        hasUsername: !!ODOO_USERNAME,
        hasPassword: !!ODOO_PASSWORD
      });
      return new Response(
        JSON.stringify({ error: 'Odoo credentials not configured. Please check your environment variables.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Remove trailing slash from URL if present
    ODOO_URL = ODOO_URL.replace(/\/$/, '');

    console.log('Calling Odoo API:', { 
      url: ODOO_URL,
      model, 
      method, 
      argsCount: args?.length 
    });

    // Authenticate with Odoo
    const authResponse = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        params: {
          db: 'con-formgroup-main-10348162',
          login: ODOO_USERNAME,
          password: ODOO_PASSWORD,
        },
      }),
    });

    const authData = await authResponse.json();
    console.log('Odoo auth response:', JSON.stringify(authData, null, 2));

    if (!authData.result || !authData.result.uid) {
      const errorDetails = authData.error ? JSON.stringify(authData.error) : 'No error details';
      console.error('Odoo authentication failed. Details:', errorDetails);
      throw new Error(`Odoo authentication failed: ${errorDetails}`);
    }

    // Make the actual query
    const queryResponse = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authResponse.headers.get('set-cookie') || '',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model,
          method,
          args,
          kwargs: kwargs || {},
        },
      }),
    });

    const queryData = await queryResponse.json();
    const ok = queryResponse.ok && queryData && typeof queryData === 'object' && 'result' in queryData;
    console.log('Odoo query result:', ok && queryData.result ? 'success' : 'failed');

    if (!ok || !queryData.result) {
      const errorMsg = (queryData && (queryData.error?.data?.message || queryData.error?.message)) || 'Odoo returned no result';
      console.error('Odoo query error details:', JSON.stringify(queryData?.error || {}, null, 2));
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(queryData.result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in odoo-query:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### **Step 4: Paste and Deploy**

1. **Paste** the code into the Supabase function editor
2. Click **"Deploy"** or **"Save"**
3. Wait for deployment to complete (~30 seconds)

### **Step 5: Add Environment Variables (Secrets)**

After deploying, you need to add Odoo credentials:

1. In the same Functions page, look for **"Secrets"** or **"Environment Variables"**
2. OR go to: Settings → Edge Functions → Secrets
3. Add these 4 secrets:

| Key | Value |
|-----|-------|
| `ODOO_URL` | `https://con-formgroup.odoo.com` |
| `ODOO_USERNAME` | `admin@waoconnect.com.au` |
| `ODOO_PASSWORD` | `2i@YA-:/k/8/o.XNgwiO` |
| `ODOO_API_KEY` | `47977d425aad95e73b4445b37b75bbc9a624f365` |

⚠️ **Important:** Remove trailing slash from ODOO_URL!

### **Step 6: Test the Function**

After deployment, test it:

```bash
curl -i --location --request POST \
  'https://ibqgwakjmsnjtvwpkdns.supabase.co/functions/v1/odoo-query' \
  --header 'Authorization: Bearer YOUR_ANON_KEY_HERE' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "res.partner",
    "method": "search_read",
    "args": [[], ["name"]],
    "kwargs": {}
  }'
```

**OR** test in browser console:

```javascript
const { data, error } = await supabase.functions.invoke('odoo-query', {
  body: {
    model: 'res.partner',
    method: 'search_read',
    args: [[], ['name']],
  }
});

console.log('Data:', data);
console.log('Error:', error);
```

---

## 🔧 **Now Fix the RLS Policies (SQL)**

**This DOES go in SQL Editor:**

Go to: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/sql

Run this SQL (NOT the TypeScript):

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

-- Fix child table policies
DROP POLICY IF EXISTS "Users can view budget lines for their jobs" ON public.job_budget_lines;

CREATE POLICY "Authenticated users can view budget lines" ON public.job_budget_lines
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view BOM lines for their jobs" ON public.job_bom_lines;

CREATE POLICY "Authenticated users can view BOM lines" ON public.job_bom_lines
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view non-material costs for their jobs" ON public.job_non_material_costs;

CREATE POLICY "Authenticated users can view non-material costs" ON public.job_non_material_costs
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view purchase orders for their jobs" ON public.job_purchase_orders;

CREATE POLICY "Authenticated users can view purchase orders" ON public.job_purchase_orders
    FOR SELECT USING (auth.role() = 'authenticated');
```

---

## ✅ **Summary**

### **What Goes Where:**

| Type | Where to Put It |
|------|----------------|
| **Edge Functions** (TypeScript) | Dashboard → Functions → Create New Function |
| **SQL Migrations** (SQL) | Dashboard → SQL Editor → Run Query |
| **Environment Variables** | Dashboard → Functions → Secrets |

### **Correct Order:**

1. ✅ Deploy Edge Function (`odoo-query`) via Functions page
2. ✅ Add Secrets (Odoo credentials) via Functions → Secrets
3. ✅ Run SQL migration for RLS fixes via SQL Editor
4. ✅ Test function
5. ✅ Restart dev server

---

## 🎯 **Quick Links**

- **Deploy Function:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/functions
- **Add Secrets:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/settings/functions
- **Run SQL:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/sql
- **View Logs:** https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/functions/odoo-query/logs

---

## ⚡ **After Deployment**

1. **Restart your dev server:**
   ```powershell
   Stop-Process -Name "node" -Force
   npm run dev
   ```

2. **Sign in to your app**

3. **Click "Sync Odoo"** button

4. **Should work!** ✅

---

**Last Updated:** October 31, 2025  
**Status:** Ready to Deploy

