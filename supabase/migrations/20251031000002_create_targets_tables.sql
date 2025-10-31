-- Targets Tables Migration
-- Creates monthly and sales targets tables

CREATE TABLE IF NOT EXISTS public.monthly_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    financial_year TEXT NOT NULL, -- e.g., 'FY25-26'
    month TEXT NOT NULL, -- e.g., 'Jul-25'
    month_date DATE NOT NULL,
    
    -- CFG (Con-Form Group) targets
    cfg_sales_target DECIMAL(12,2) DEFAULT 0,
    cfg_invoice_target DECIMAL(12,2) DEFAULT 0,
    cfg_sales_actual DECIMAL(12,2) DEFAULT 0,
    cfg_invoice_actual DECIMAL(12,2) DEFAULT 0,
    cfg_sales_variance DECIMAL(12,2) DEFAULT 0,
    cfg_invoice_variance DECIMAL(12,2) DEFAULT 0,
    
    -- DSF (Design, Supply, Fabricate) targets
    dsf_sales_target DECIMAL(12,2) DEFAULT 0,
    dsf_invoice_target DECIMAL(12,2) DEFAULT 0,
    dsf_sales_actual DECIMAL(12,2) DEFAULT 0,
    dsf_invoice_actual DECIMAL(12,2) DEFAULT 0,
    dsf_sales_variance DECIMAL(12,2) DEFAULT 0,
    dsf_invoice_variance DECIMAL(12,2) DEFAULT 0,
    
    -- Total targets (CFG + DSF)
    total_sales_target DECIMAL(12,2) DEFAULT 0,
    total_invoice_target DECIMAL(12,2) DEFAULT 0,
    total_sales_actual DECIMAL(12,2) DEFAULT 0,
    total_invoice_actual DECIMAL(12,2) DEFAULT 0,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique combination of user, financial year, and month
    CONSTRAINT unique_user_month_target UNIQUE (user_id, financial_year, month)
);

-- Create sales_targets table
CREATE TABLE IF NOT EXISTS public.sales_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_value DECIMAL(12,2) DEFAULT 0,
    period TEXT CHECK (period IN ('monthly', 'quarterly', 'yearly', 'custom')),
    metric TEXT CHECK (metric IN ('sales', 'invoices', 'margin', 'deals', 'revenue')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_monthly_targets_user_id ON public.monthly_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_targets_financial_year ON public.monthly_targets(financial_year);
CREATE INDEX IF NOT EXISTS idx_monthly_targets_month_date ON public.monthly_targets(month_date);
CREATE INDEX IF NOT EXISTS idx_monthly_targets_created_at ON public.monthly_targets(created_at);

CREATE INDEX IF NOT EXISTS idx_sales_targets_user_id ON public.sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_period ON public.sales_targets(period);
CREATE INDEX IF NOT EXISTS idx_sales_targets_metric ON public.sales_targets(metric);

-- Enable Row Level Security (RLS)
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monthly_targets table
CREATE POLICY "Users can view their own monthly targets" ON public.monthly_targets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly targets" ON public.monthly_targets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly targets" ON public.monthly_targets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly targets" ON public.monthly_targets
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sales_targets table
CREATE POLICY "Users can view their own sales targets" ON public.sales_targets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales targets" ON public.sales_targets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales targets" ON public.sales_targets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales targets" ON public.sales_targets
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE TRIGGER update_monthly_targets_updated_at BEFORE UPDATE ON public.monthly_targets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_targets_updated_at BEFORE UPDATE ON public.sales_targets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically calculate variance
CREATE OR REPLACE FUNCTION calculate_monthly_target_variances()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate CFG variances
    NEW.cfg_sales_variance = NEW.cfg_sales_actual - NEW.cfg_sales_target;
    NEW.cfg_invoice_variance = NEW.cfg_invoice_actual - NEW.cfg_invoice_target;
    
    -- Calculate DSF variances
    NEW.dsf_sales_variance = NEW.dsf_sales_actual - NEW.dsf_sales_target;
    NEW.dsf_invoice_variance = NEW.dsf_invoice_actual - NEW.dsf_invoice_target;
    
    -- Calculate totals
    NEW.total_sales_target = NEW.cfg_sales_target + NEW.dsf_sales_target;
    NEW.total_invoice_target = NEW.cfg_invoice_target + NEW.dsf_invoice_target;
    NEW.total_sales_actual = NEW.cfg_sales_actual + NEW.dsf_sales_actual;
    NEW.total_invoice_actual = NEW.cfg_invoice_actual + NEW.dsf_invoice_actual;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_variances_before_insert_update 
    BEFORE INSERT OR UPDATE ON public.monthly_targets
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_monthly_target_variances();

-- Create view for quick monthly target analysis
CREATE OR REPLACE VIEW monthly_targets_summary AS
SELECT 
    financial_year,
    month,
    month_date,
    SUM(total_sales_target) as total_sales_target,
    SUM(total_sales_actual) as total_sales_actual,
    SUM(total_sales_actual) - SUM(total_sales_target) as sales_variance,
    SUM(total_invoice_target) as total_invoice_target,
    SUM(total_invoice_actual) as total_invoice_actual,
    SUM(total_invoice_actual) - SUM(total_invoice_target) as invoice_variance,
    CASE 
        WHEN SUM(total_sales_target) > 0 
        THEN ROUND((SUM(total_sales_actual) / SUM(total_sales_target) * 100)::numeric, 2)
        ELSE 0 
    END as sales_achievement_percentage,
    CASE 
        WHEN SUM(total_invoice_target) > 0 
        THEN ROUND((SUM(total_invoice_actual) / SUM(total_invoice_target) * 100)::numeric, 2)
        ELSE 0 
    END as invoice_achievement_percentage
FROM public.monthly_targets
GROUP BY financial_year, month, month_date
ORDER BY month_date;

