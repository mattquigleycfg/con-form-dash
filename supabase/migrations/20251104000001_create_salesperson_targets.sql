-- Create salesperson_targets table for individual sales rep targets
CREATE TABLE IF NOT EXISTS public.salesperson_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  salesperson_name TEXT NOT NULL,
  financial_year TEXT NOT NULL,
  period_type TEXT NOT NULL, -- 'weekly', 'monthly', 'quarterly', 'yearly'
  period_name TEXT NOT NULL, -- e.g., 'Jul-25', 'Q1', 'Week 1', 'FY25-26'
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Con-form Division (CFG) Targets
  cfg_sales_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cfg_invoice_target NUMERIC(12, 2) DEFAULT 0,
  
  -- Actuals (populated from Odoo)
  cfg_sales_actual NUMERIC(12, 2) DEFAULT 0,
  cfg_invoice_actual NUMERIC(12, 2) DEFAULT 0,
  
  -- Calculated variance
  cfg_sales_variance NUMERIC(12, 2) GENERATED ALWAYS AS (COALESCE(cfg_sales_actual, 0) - cfg_sales_target) STORED,
  cfg_invoice_variance NUMERIC(12, 2) GENERATED ALWAYS AS (COALESCE(cfg_invoice_actual, 0) - COALESCE(cfg_invoice_target, 0)) STORED,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, salesperson_name, financial_year, period_type, period_name)
);

-- Enable Row Level Security
ALTER TABLE public.salesperson_targets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own salesperson targets"
ON public.salesperson_targets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own salesperson targets"
ON public.salesperson_targets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own salesperson targets"
ON public.salesperson_targets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own salesperson targets"
ON public.salesperson_targets
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_salesperson_targets_updated_at
BEFORE UPDATE ON public.salesperson_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_salesperson_targets_user_fy ON public.salesperson_targets(user_id, financial_year);
CREATE INDEX idx_salesperson_targets_salesperson ON public.salesperson_targets(salesperson_name);
CREATE INDEX idx_salesperson_targets_period ON public.salesperson_targets(period_type, period_start_date);

