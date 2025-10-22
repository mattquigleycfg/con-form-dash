-- Create monthly_targets table for tracking monthly sales and invoice targets
CREATE TABLE IF NOT EXISTS public.monthly_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  financial_year TEXT NOT NULL,
  month TEXT NOT NULL,
  month_date DATE NOT NULL,
  
  -- Con-form Division Targets
  cfg_sales_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cfg_invoice_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- DiamondSteel Division Targets
  dsf_sales_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
  dsf_invoice_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Actuals (populated from Odoo)
  cfg_sales_actual NUMERIC(12, 2) DEFAULT 0,
  cfg_invoice_actual NUMERIC(12, 2) DEFAULT 0,
  dsf_sales_actual NUMERIC(12, 2) DEFAULT 0,
  dsf_invoice_actual NUMERIC(12, 2) DEFAULT 0,
  
  -- Calculated fields
  cfg_sales_variance NUMERIC(12, 2) GENERATED ALWAYS AS (cfg_sales_actual - cfg_sales_target) STORED,
  cfg_invoice_variance NUMERIC(12, 2) GENERATED ALWAYS AS (cfg_invoice_actual - cfg_invoice_target) STORED,
  dsf_sales_variance NUMERIC(12, 2) GENERATED ALWAYS AS (dsf_sales_actual - dsf_sales_target) STORED,
  dsf_invoice_variance NUMERIC(12, 2) GENERATED ALWAYS AS (dsf_invoice_actual - dsf_invoice_target) STORED,
  
  total_sales_target NUMERIC(12, 2) GENERATED ALWAYS AS (cfg_sales_target + dsf_sales_target) STORED,
  total_invoice_target NUMERIC(12, 2) GENERATED ALWAYS AS (cfg_invoice_target + dsf_invoice_target) STORED,
  total_sales_actual NUMERIC(12, 2) GENERATED ALWAYS AS (COALESCE(cfg_sales_actual, 0) + COALESCE(dsf_sales_actual, 0)) STORED,
  total_invoice_actual NUMERIC(12, 2) GENERATED ALWAYS AS (COALESCE(cfg_invoice_actual, 0) + COALESCE(dsf_invoice_actual, 0)) STORED,
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, financial_year, month_date)
);

-- Enable Row Level Security
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own monthly targets"
  ON public.monthly_targets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly targets"
  ON public.monthly_targets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly targets"
  ON public.monthly_targets
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly targets"
  ON public.monthly_targets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_monthly_targets_updated_at
  BEFORE UPDATE ON public.monthly_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better query performance
CREATE INDEX idx_monthly_targets_user_fy ON public.monthly_targets(user_id, financial_year);
CREATE INDEX idx_monthly_targets_month_date ON public.monthly_targets(month_date);