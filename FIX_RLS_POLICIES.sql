-- Fix RLS Policies - Update existing policies to allow authenticated users to read all data
-- This fixes the 406 errors by making SELECT policies less restrictive

-- monthly_targets: Allow all authenticated users to read
DROP POLICY IF EXISTS "Users can view their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Authenticated users can view monthly targets" ON public.monthly_targets;

CREATE POLICY "Authenticated users can view monthly targets" 
ON public.monthly_targets FOR SELECT
USING (auth.role() = 'authenticated');

-- sales_targets: Allow all authenticated users to read
DROP POLICY IF EXISTS "Users can view their own sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Authenticated users can view sales targets" ON public.sales_targets;

CREATE POLICY "Authenticated users can view sales targets"
ON public.sales_targets FOR SELECT
USING (auth.role() = 'authenticated');

-- jobs: Allow all authenticated users to read
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can view jobs" ON public.jobs;

CREATE POLICY "Authenticated users can view jobs"
ON public.jobs FOR SELECT
USING (auth.role() = 'authenticated');

-- job_budget_lines: Allow all authenticated users to read
DROP POLICY IF EXISTS "Users can view budget lines for their jobs" ON public.job_budget_lines;
DROP POLICY IF EXISTS "Authenticated users can view budget lines" ON public.job_budget_lines;

CREATE POLICY "Authenticated users can view budget lines"
ON public.job_budget_lines FOR SELECT
USING (auth.role() = 'authenticated');

-- job_bom_lines: Allow all authenticated users to read
DROP POLICY IF EXISTS "Users can view BOM lines for their jobs" ON public.job_bom_lines;
DROP POLICY IF EXISTS "Authenticated users can view BOM lines" ON public.job_bom_lines;

CREATE POLICY "Authenticated users can view BOM lines"
ON public.job_bom_lines FOR SELECT
USING (auth.role() = 'authenticated');

-- job_non_material_costs: Allow all authenticated users to read
DROP POLICY IF EXISTS "Users can view non-material costs for their jobs" ON public.job_non_material_costs;
DROP POLICY IF EXISTS "Authenticated users can view non-material costs" ON public.job_non_material_costs;

CREATE POLICY "Authenticated users can view non-material costs"
ON public.job_non_material_costs FOR SELECT
USING (auth.role() = 'authenticated');

-- job_purchase_orders: Allow all authenticated users to read
DROP POLICY IF EXISTS "Users can view purchase orders for their jobs" ON public.job_purchase_orders;
DROP POLICY IF EXISTS "Authenticated users can view purchase orders" ON public.job_purchase_orders;

CREATE POLICY "Authenticated users can view purchase orders"
ON public.job_purchase_orders FOR SELECT
USING (auth.role() = 'authenticated');

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('monthly_targets', 'sales_targets', 'jobs', 'job_budget_lines', 'job_bom_lines', 'job_non_material_costs', 'job_purchase_orders')
ORDER BY tablename, policyname;

