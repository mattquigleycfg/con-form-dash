-- Fix all RLS policies for targets tables
-- This ensures authenticated users can create, read, update, and delete their own targets

-- ============================================
-- FIX MONTHLY_TARGETS POLICIES
-- ============================================

-- Drop all existing policies for monthly_targets
DROP POLICY IF EXISTS "Users can view their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can create their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can insert their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can update their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Users can delete their own monthly targets" ON public.monthly_targets;
DROP POLICY IF EXISTS "Authenticated users can view monthly targets" ON public.monthly_targets;

-- Create new policies for monthly_targets
-- Allow all authenticated users to view all monthly targets (for dashboard)
CREATE POLICY "Authenticated users can view monthly targets" 
ON public.monthly_targets 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Allow users to insert their own monthly targets
CREATE POLICY "Users can insert monthly targets" 
ON public.monthly_targets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own monthly targets
CREATE POLICY "Users can update monthly targets" 
ON public.monthly_targets 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own monthly targets
CREATE POLICY "Users can delete monthly targets" 
ON public.monthly_targets 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- FIX SALES_TARGETS POLICIES
-- ============================================

-- Drop all existing policies for sales_targets
DROP POLICY IF EXISTS "Users can view their own targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can create their own targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can insert their own targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can insert their own sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can update their own targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can update their own sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can delete their own targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Users can delete their own sales targets" ON public.sales_targets;
DROP POLICY IF EXISTS "Authenticated users can view sales targets" ON public.sales_targets;

-- Create new policies for sales_targets
CREATE POLICY "Authenticated users can view sales targets" 
ON public.sales_targets 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert sales targets" 
ON public.sales_targets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update sales targets" 
ON public.sales_targets 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete sales targets" 
ON public.sales_targets 
FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- CREATE SALESPERSON_TARGETS TABLE IF NOT EXISTS
-- ============================================

-- Create salesperson_targets table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.salesperson_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  salesperson_name TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  period_type TEXT NOT NULL,
  period_name TEXT NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  cfg_sales_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cfg_invoice_target NUMERIC(12, 2) DEFAULT 0,
  cfg_sales_actual NUMERIC(12, 2) DEFAULT 0,
  cfg_invoice_actual NUMERIC(12, 2) DEFAULT 0,
  
  cfg_sales_variance NUMERIC(12, 2) GENERATED ALWAYS AS (COALESCE(cfg_sales_actual, 0) - cfg_sales_target) STORED,
  cfg_invoice_variance NUMERIC(12, 2) GENERATED ALWAYS AS (COALESCE(cfg_invoice_actual, 0) - COALESCE(cfg_invoice_target, 0)) STORED,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, salesperson_name, financial_year, period_type, period_name)
);

-- Enable RLS on salesperson_targets
ALTER TABLE public.salesperson_targets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for salesperson_targets if any
DROP POLICY IF EXISTS "Users can view their own salesperson targets" ON public.salesperson_targets;
DROP POLICY IF EXISTS "Users can create their own salesperson targets" ON public.salesperson_targets;
DROP POLICY IF EXISTS "Users can insert their own salesperson targets" ON public.salesperson_targets;
DROP POLICY IF EXISTS "Users can update their own salesperson targets" ON public.salesperson_targets;
DROP POLICY IF EXISTS "Users can delete their own salesperson targets" ON public.salesperson_targets;
DROP POLICY IF EXISTS "Authenticated users can view salesperson targets" ON public.salesperson_targets;

-- Create policies for salesperson_targets
CREATE POLICY "Authenticated users can view salesperson targets" 
ON public.salesperson_targets 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert salesperson targets" 
ON public.salesperson_targets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update salesperson targets" 
ON public.salesperson_targets 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete salesperson targets" 
ON public.salesperson_targets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_salesperson_targets_updated_at'
  ) THEN
    CREATE TRIGGER update_salesperson_targets_updated_at
    BEFORE UPDATE ON public.salesperson_targets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_salesperson_targets_user_fy 
ON public.salesperson_targets(user_id, financial_year);

CREATE INDEX IF NOT EXISTS idx_salesperson_targets_salesperson 
ON public.salesperson_targets(salesperson_name);

CREATE INDEX IF NOT EXISTS idx_salesperson_targets_period 
ON public.salesperson_targets(period_type, period_start_date);

-- Grant necessary permissions (if needed)
GRANT ALL ON public.salesperson_targets TO authenticated;
GRANT ALL ON public.monthly_targets TO authenticated;
GRANT ALL ON public.sales_targets TO authenticated;

