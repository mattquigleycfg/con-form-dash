-- Add INSERT, UPDATE, DELETE policies for jobs table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/sql/new

-- For jobs table
DROP POLICY IF EXISTS "Users can insert their own jobs" ON public.jobs;
CREATE POLICY "Users can insert their own jobs"
ON public.jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own jobs" ON public.jobs;
CREATE POLICY "Users can update their own jobs"
ON public.jobs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own jobs" ON public.jobs;
CREATE POLICY "Users can delete their own jobs"
ON public.jobs FOR DELETE
USING (auth.uid() = user_id);

-- For job_budget_lines table
DROP POLICY IF EXISTS "Users can insert budget lines for their jobs" ON public.job_budget_lines;
CREATE POLICY "Users can insert budget lines for their jobs"
ON public.job_budget_lines FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_budget_lines.job_id 
  AND auth.uid() = jobs.user_id
));

DROP POLICY IF EXISTS "Users can update budget lines for their jobs" ON public.job_budget_lines;
CREATE POLICY "Users can update budget lines for their jobs"
ON public.job_budget_lines FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_budget_lines.job_id 
  AND auth.uid() = jobs.user_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_budget_lines.job_id 
  AND auth.uid() = jobs.user_id
));

DROP POLICY IF EXISTS "Users can delete budget lines for their jobs" ON public.job_budget_lines;
CREATE POLICY "Users can delete budget lines for their jobs"
ON public.job_budget_lines FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_budget_lines.job_id 
  AND auth.uid() = jobs.user_id
));

-- For job_bom_lines table
DROP POLICY IF EXISTS "Users can insert BOM lines for their jobs" ON public.job_bom_lines;
CREATE POLICY "Users can insert BOM lines for their jobs"
ON public.job_bom_lines FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_bom_lines.job_id 
  AND auth.uid() = jobs.user_id
));

DROP POLICY IF EXISTS "Users can update BOM lines for their jobs" ON public.job_bom_lines;
CREATE POLICY "Users can update BOM lines for their jobs"
ON public.job_bom_lines FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_bom_lines.job_id 
  AND auth.uid() = jobs.user_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_bom_lines.job_id 
  AND auth.uid() = jobs.user_id
));

DROP POLICY IF EXISTS "Users can delete BOM lines for their jobs" ON public.job_bom_lines;
CREATE POLICY "Users can delete BOM lines for their jobs"
ON public.job_bom_lines FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_bom_lines.job_id 
  AND auth.uid() = jobs.user_id
));

-- For job_non_material_costs table
DROP POLICY IF EXISTS "Users can insert non-material costs for their jobs" ON public.job_non_material_costs;
CREATE POLICY "Users can insert non-material costs for their jobs"
ON public.job_non_material_costs FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_non_material_costs.job_id 
  AND auth.uid() = jobs.user_id
));

DROP POLICY IF EXISTS "Users can update non-material costs for their jobs" ON public.job_non_material_costs;
CREATE POLICY "Users can update non-material costs for their jobs"
ON public.job_non_material_costs FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_non_material_costs.job_id 
  AND auth.uid() = jobs.user_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_non_material_costs.job_id 
  AND auth.uid() = jobs.user_id
));

DROP POLICY IF EXISTS "Users can delete non-material costs for their jobs" ON public.job_non_material_costs;
CREATE POLICY "Users can delete non-material costs for their jobs"
ON public.job_non_material_costs FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_non_material_costs.job_id 
  AND auth.uid() = jobs.user_id
));

-- For job_purchase_orders table
DROP POLICY IF EXISTS "Users can insert purchase orders for their jobs" ON public.job_purchase_orders;
CREATE POLICY "Users can insert purchase orders for their jobs"
ON public.job_purchase_orders FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_purchase_orders.job_id 
  AND auth.uid() = jobs.user_id
));

DROP POLICY IF EXISTS "Users can update purchase orders for their jobs" ON public.job_purchase_orders;
CREATE POLICY "Users can update purchase orders for their jobs"
ON public.job_purchase_orders FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_purchase_orders.job_id 
  AND auth.uid() = jobs.user_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_purchase_orders.job_id 
  AND auth.uid() = jobs.user_id
));

DROP POLICY IF EXISTS "Users can delete purchase orders for their jobs" ON public.job_purchase_orders;
CREATE POLICY "Users can delete purchase orders for their jobs"
ON public.job_purchase_orders FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.jobs 
  WHERE jobs.id = job_purchase_orders.job_id 
  AND auth.uid() = jobs.user_id
));

-- Verify the policies were created
SELECT 
    tablename, 
    policyname, 
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('jobs', 'job_budget_lines', 'job_bom_lines', 
                     'job_non_material_costs', 'job_purchase_orders')
ORDER BY tablename, cmd, policyname;

