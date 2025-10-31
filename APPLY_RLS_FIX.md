# 🔐 Apply RLS Policy Fixes

## Step 1: Go to SQL Editor

Open: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/sql/new

## Step 2: Run This SQL

Copy and paste this entire SQL script:

```sql
-- ========================================
-- RLS Policy Fixes for Con-form Dashboard
-- Fixes 406 errors by allowing authenticated users to read data
-- ========================================

-- Fix monthly_targets policies
DROP POLICY IF EXISTS "Users can view their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Authenticated users can view monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can create their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can insert their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can update their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can delete their own monthly targets" ON public.monthly_targets;

CREATE POLICY "Authenticated users can view monthly targets" 
ON public.monthly_targets FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own monthly targets"
ON public.monthly_targets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly targets"
ON public.monthly_targets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly targets"
ON public.monthly_targets FOR DELETE
USING (auth.uid() = user_id);

-- Fix sales_targets policies
DROP POLICY IF EXISTS "Users can view their own targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Authenticated users can view sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can view their own sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can create their own targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can insert their own sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can update their own targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can update their own sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can delete their own targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can delete their own sales targets" ON public.sales_targets;

CREATE POLICY "Authenticated users can view sales targets"
ON public.sales_targets FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own sales targets"
ON public.sales_targets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales targets"
ON public.sales_targets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales targets"
ON public.sales_targets FOR DELETE
USING (auth.uid() = user_id);

-- Fix jobs policies
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can create their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON public.jobs;

CREATE POLICY "Authenticated users can view jobs"
ON public.jobs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own jobs"
ON public.jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
ON public.jobs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
ON public.jobs FOR DELETE
USING (auth.uid() = user_id);

-- Fix job_budget_lines policies
DROP POLICY IF EXISTS "Users can view budget lines for their jobs" ON public.job_budget_lines;
DROP POLICY IF EXISTS "Authenticated users can view budget lines" ON public.job_budget_lines;
DROP POLICY IF EXISTS "Users can create budget lines for their jobs" ON public.job_budget_lines;
DROP POLICY IF EXISTS "Users can insert budget lines for their jobs" ON public.job_budget_lines;
DROP POLICY IF EXISTS "Users can update budget lines for their jobs" ON public.job_budget_lines;
DROP POLICY IF EXISTS "Users can delete budget lines for their jobs" ON public.job_budget_lines;

CREATE POLICY "Authenticated users can view budget lines"
ON public.job_budget_lines FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert budget lines for their jobs"
ON public.job_budget_lines FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_budget_lines.job_id AND auth.uid() = jobs.user_id));

CREATE POLICY "Users can update budget lines for their jobs"
ON public.job_budget_lines FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_budget_lines.job_id AND auth.uid() = jobs.user_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_budget_lines.job_id AND auth.uid() = jobs.user_id));

CREATE POLICY "Users can delete budget lines for their jobs"
ON public.job_budget_lines FOR DELETE
USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_budget_lines.job_id AND auth.uid() = jobs.user_id));

-- Fix job_bom_lines policies
DROP POLICY IF EXISTS "Users can view BOM lines for their jobs" ON public.job_bom_lines;
DROP POLICY IF EXISTS "Authenticated users can view BOM lines" ON public.job_bom_lines;
DROP POLICY IF EXISTS "Users can create BOM lines for their jobs" ON public.job_bom_lines;
DROP POLICY IF EXISTS "Users can insert BOM lines for their jobs" ON public.job_bom_lines;
DROP POLICY IF EXISTS "Users can update BOM lines for their jobs" ON public.job_bom_lines;
DROP POLICY IF EXISTS "Users can delete BOM lines for their jobs" ON public.job_bom_lines;

CREATE POLICY "Authenticated users can view BOM lines"
ON public.job_bom_lines FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert BOM lines for their jobs"
ON public.job_bom_lines FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_bom_lines.job_id AND auth.uid() = jobs.user_id));

CREATE POLICY "Users can update BOM lines for their jobs"
ON public.job_bom_lines FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_bom_lines.job_id AND auth.uid() = jobs.user_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_bom_lines.job_id AND auth.uid() = jobs.user_id));

CREATE POLICY "Users can delete BOM lines for their jobs"
ON public.job_bom_lines FOR DELETE
USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_bom_lines.job_id AND auth.uid() = jobs.user_id));

-- Fix job_non_material_costs policies
DROP POLICY IF EXISTS "Users can view non-material costs for their jobs" ON public.job_non_material_costs;
DROP POLICY IF EXISTS "Authenticated users can view non-material costs" ON public.job_non_material_costs;
DROP POLICY IF EXISTS "Users can create non-material costs for their jobs" ON public.job_non_material_costs;
DROP POLICY IF EXISTS "Users can insert non-material costs for their jobs" ON public.job_non_material_costs;
DROP POLICY IF EXISTS "Users can update non-material costs for their jobs" ON public.job_non_material_costs;
DROP POLICY IF EXISTS "Users can delete non-material costs for their jobs" ON public.job_non_material_costs;

CREATE POLICY "Authenticated users can view non-material costs"
ON public.job_non_material_costs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert non-material costs for their jobs"
ON public.job_non_material_costs FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_non_material_costs.job_id AND auth.uid() = jobs.user_id));

CREATE POLICY "Users can update non-material costs for their jobs"
ON public.job_non_material_costs FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_non_material_costs.job_id AND auth.uid() = jobs.user_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_non_material_costs.job_id AND auth.uid() = jobs.user_id));

CREATE POLICY "Users can delete non-material costs for their jobs"
ON public.job_non_material_costs FOR DELETE
USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_non_material_costs.job_id AND auth.uid() = jobs.user_id));

-- Fix job_purchase_orders policies
DROP POLICY IF EXISTS "Users can view purchase orders for their jobs" ON public.job_purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can view purchase orders" ON public.job_purchase_orders;
DROP POLICY IF EXISTS "Users can create purchase orders for their jobs" ON public.job_purchase_orders;
DROP POLICY IF EXISTS "Users can insert purchase orders for their jobs" ON public.job_purchase_orders;
DROP POLICY IF EXISTS "Users can update purchase orders for their jobs" ON public.job_purchase_orders;
DROP POLICY IF EXISTS "Users can delete purchase orders for their jobs" ON public.job_purchase_orders;

CREATE POLICY "Authenticated users can view purchase orders"
ON public.job_purchase_orders FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert purchase orders for their jobs"
ON public.job_purchase_orders FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_purchase_orders.job_id AND auth.uid() = jobs.user_id));

CREATE POLICY "Users can update purchase orders for their jobs"
ON public.job_purchase_orders FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_purchase_orders.job_id AND auth.uid() = jobs.user_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_purchase_orders.job_id AND auth.uid() = jobs.user_id));

CREATE POLICY "Users can delete purchase orders for their jobs"
ON public.job_purchase_orders FOR DELETE
USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_purchase_orders.job_id AND auth.uid() = jobs.user_id));
```

## Step 3: Verify Policies

After running the SQL, verify the policies were created:

```sql
-- Check RLS policies
SELECT tablename, policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('jobs', 'job_budget_lines', 'job_bom_lines', 'job_non_material_costs', 
                     'job_purchase_orders', 'monthly_targets', 'sales_targets')
ORDER BY tablename, policyname;
```

## Expected Result:

You should see:
- **SELECT policies:** `(auth.role() = 'authenticated'::text)` - Allows all authenticated users to read
- **INSERT/UPDATE/DELETE policies:** `(auth.uid() = user_id)` - Restricts writes to own data

## Step 4: Test the App

1. Restart dev server (if running)
2. Sign in to the app
3. Check that:
   - ✅ No 406 errors in console
   - ✅ Dashboard loads with data
   - ✅ Targets page works
   - ✅ Job costing page works

---

**Status:** Ready to apply! 🚀

