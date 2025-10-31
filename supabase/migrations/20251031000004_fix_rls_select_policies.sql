-- Fix RLS SELECT policies to allow authenticated users to read all data
-- This fixes 406 errors by making SELECT policies less restrictive
-- INSERT/UPDATE/DELETE policies remain user-scoped for security

-- Fix monthly_targets
DO $$ 
BEGIN
    -- Drop old policies
    DROP POLICY IF EXISTS "Users can view their own monthly targets" ON public.monthly_targets;
    DROP POLICY IF EXISTS "Authenticated users can view monthly targets" ON public.monthly_targets;
    
    -- Create new permissive SELECT policy
    CREATE POLICY "Authenticated users can view monthly targets" 
    ON public.monthly_targets FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix jobs
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;
    DROP POLICY IF EXISTS "Authenticated users can view jobs" ON public.jobs;
    
    CREATE POLICY "Authenticated users can view jobs"
    ON public.jobs FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix job_budget_lines
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view budget lines for their jobs" ON public.job_budget_lines;
    DROP POLICY IF EXISTS "Authenticated users can view budget lines" ON public.job_budget_lines;
    
    CREATE POLICY "Authenticated users can view budget lines"
    ON public.job_budget_lines FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix job_bom_lines
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view BOM lines for their jobs" ON public.job_bom_lines;
    DROP POLICY IF EXISTS "Authenticated users can view BOM lines" ON public.job_bom_lines;
    
    CREATE POLICY "Authenticated users can view BOM lines"
    ON public.job_bom_lines FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix job_non_material_costs
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view non-material costs for their jobs" ON public.job_non_material_costs;
    DROP POLICY IF EXISTS "Authenticated users can view non-material costs" ON public.job_non_material_costs;
    
    CREATE POLICY "Authenticated users can view non-material costs"
    ON public.job_non_material_costs FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix job_purchase_orders
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view purchase orders for their jobs" ON public.job_purchase_orders;
    DROP POLICY IF EXISTS "Authenticated users can view purchase orders" ON public.job_purchase_orders;
    
    CREATE POLICY "Authenticated users can view purchase orders"
    ON public.job_purchase_orders FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Fix sales_targets
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own targets" ON public.sales_targets;
    DROP POLICY IF EXISTS "Users can view their own sales targets" ON public.sales_targets;
    DROP POLICY IF EXISTS "Authenticated users can view sales targets" ON public.sales_targets;
    
    CREATE POLICY "Authenticated users can view sales targets"
    ON public.sales_targets FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

