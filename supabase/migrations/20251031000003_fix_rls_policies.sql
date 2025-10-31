-- Fix RLS policies to allow authenticated users to access their data
-- This migration addresses 406 errors from overly restrictive RLS

-- First, drop existing restrictive policies for monthly_targets
DROP POLICY IF EXISTS "Users can view their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can insert their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can update their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can delete their own monthly targets" ON public.monthly_targets;

-- Create more permissive policies for monthly_targets
-- Allow authenticated users to view all monthly targets (for dashboard aggregations)
CREATE POLICY "Authenticated users can view monthly targets" ON public.monthly_targets
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only insert their own targets
CREATE POLICY "Users can insert their own monthly targets" ON public.monthly_targets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own targets
CREATE POLICY "Users can update their own monthly targets" ON public.monthly_targets
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own targets
CREATE POLICY "Users can delete their own monthly targets" ON public.monthly_targets
    FOR DELETE USING (auth.uid() = user_id);

-- Same for sales_targets
DROP POLICY IF EXISTS "Users can view their own sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can insert their own sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can update their own sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can delete their own sales targets" ON public.sales_targets;

CREATE POLICY "Authenticated users can view sales targets" ON public.sales_targets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own sales targets" ON public.sales_targets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales targets" ON public.sales_targets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales targets" ON public.sales_targets
    FOR DELETE USING (auth.uid() = user_id);

-- Also update jobs table policies for better access
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;

CREATE POLICY "Authenticated users can view jobs" ON public.jobs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Add anon access for public dashboards (optional - comment out if not needed)
-- CREATE POLICY "Allow public read access to jobs" ON public.jobs
--     FOR SELECT USING (true);

