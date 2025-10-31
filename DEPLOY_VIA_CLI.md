# 🚀 Deploy Edge Functions via Supabase CLI

## Step 1: Get Your Access Token

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Give it a name: `CLI Deploy Token`
4. Copy the token (it will look like: `sbp_abc123...`)

## Step 2: Set Environment Variable

**In PowerShell, run:**

```powershell
$env:SUPABASE_ACCESS_TOKEN="sbp_163094896cda1f04731391ae3b15751c552ad3c6"
```

**Replace** `sbp_YOUR_TOKEN_HERE` with your actual token.

## Step 3: Deploy the Function

```powershell
npx supabase functions deploy odoo-query --project-ref ibqgwakjmsnjtvwpkdns
```

## Step 4: Set Secrets (Environment Variables)

After deploying, set the Odoo credentials:

```powershell
npx supabase secrets set ODOO_URL="https://con-formgroup.odoo.com" --project-ref ibqgwakjmsnjtvwpkdns

npx supabase secrets set ODOO_USERNAME="admin@waoconnect.com.au" --project-ref ibqgwakjmsnjtvwpkdns

npx supabase secrets set ODOO_PASSWORD="2i@YA-:/k/8/o.XNgwiO" --project-ref ibqgwakjmsnjtvwpkdns

npx supabase secrets set ODOO_API_KEY="47977d425aad95e73b4445b37b75bbc9a624f365" --project-ref ibqgwakjmsnjtvwpkdns
```

## Step 5: Run RLS SQL Fix

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

## Step 6: Test

Restart your dev server and test the Odoo sync!

---

## All Commands in Order:

```powershell
# 1. Get token from: https://supabase.com/dashboard/account/tokens
# 2. Set token
$env:SUPABASE_ACCESS_TOKEN="sbp_YOUR_TOKEN_HERE"

# 3. Deploy function
npx supabase functions deploy odoo-query --project-ref ibqgwakjmsnjtvwpkdns

# 4. Set secrets
npx supabase secrets set ODOO_URL="https://con-formgroup.odoo.com" --project-ref ibqgwakjmsnjtvwpkdns
npx supabase secrets set ODOO_USERNAME="admin@waoconnect.com.au" --project-ref ibqgwakjmsnjtvwpkdns
npx supabase secrets set ODOO_PASSWORD="2i@YA-:/k/8/o.XNgwiO" --project-ref ibqgwakjmsnjtvwpkdns
npx supabase secrets set ODOO_API_KEY="47977d425aad95e73b4445b37b75bbc9a624f365" --project-ref ibqgwakjmsnjtvwpkdns

# 5. Run SQL fix (in dashboard SQL editor)
# 6. Restart dev server
```

---

**Status:** Ready to execute! Just get your access token first. 🚀

