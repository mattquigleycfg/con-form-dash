-- Jobs Tables Migration
-- Creates all job costing tables with RLS and relationships

CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    odoo_sale_order_id INTEGER,
    sale_order_name TEXT,
    analytic_account_id INTEGER,
    analytic_account_name TEXT,
    customer_name TEXT,
    total_budget DECIMAL(12,2) DEFAULT 0,
    material_budget DECIMAL(12,2) DEFAULT 0,
    non_material_budget DECIMAL(12,2) DEFAULT 0,
    total_actual DECIMAL(12,2) DEFAULT 0,
    material_actual DECIMAL(12,2) DEFAULT 0,
    non_material_actual DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'on_hold')),
    opportunity_name TEXT,
    project_manager_name TEXT,
    sales_person_name TEXT,
    date_order TIMESTAMPTZ,
    project_stage_id INTEGER,
    project_stage_name TEXT DEFAULT 'Unassigned',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create job_budget_lines table
CREATE TABLE IF NOT EXISTS public.job_budget_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    odoo_line_id INTEGER,
    product_id INTEGER,
    product_name TEXT,
    product_type TEXT CHECK (product_type IN ('consu', 'service', 'product')),
    quantity DECIMAL(12,3) DEFAULT 0,
    unit_price DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) DEFAULT 0,
    cost_category TEXT CHECK (cost_category IN ('material', 'non_material', 'labor', 'equipment')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create job_bom_lines table  
CREATE TABLE IF NOT EXISTS public.job_bom_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    odoo_product_id INTEGER,
    product_name TEXT,
    quantity DECIMAL(12,3) DEFAULT 0,
    unit_cost DECIMAL(12,2) DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create job_non_material_costs table
CREATE TABLE IF NOT EXISTS public.job_non_material_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    cost_type TEXT CHECK (cost_type IN ('installation', 'engineering', 'transport', 'labor', 'equipment', 'other')),
    description TEXT,
    amount DECIMAL(12,2) DEFAULT 0,
    odoo_purchase_order_id INTEGER,
    is_from_odoo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create job_purchase_orders table
CREATE TABLE IF NOT EXISTS public.job_purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    odoo_po_id INTEGER,
    po_name TEXT,
    vendor_name TEXT,
    amount_total DECIMAL(12,2) DEFAULT 0,
    cost_category TEXT CHECK (cost_category IN ('material', 'non_material', 'labor', 'equipment')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_odoo_sale_order_id ON public.jobs(odoo_sale_order_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_name ON public.jobs(customer_name);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_job_budget_lines_job_id ON public.job_budget_lines(job_id);
CREATE INDEX IF NOT EXISTS idx_job_budget_lines_cost_category ON public.job_budget_lines(cost_category);

CREATE INDEX IF NOT EXISTS idx_job_bom_lines_job_id ON public.job_bom_lines(job_id);

CREATE INDEX IF NOT EXISTS idx_job_non_material_costs_job_id ON public.job_non_material_costs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_non_material_costs_cost_type ON public.job_non_material_costs(cost_type);

CREATE INDEX IF NOT EXISTS idx_job_purchase_orders_job_id ON public.job_purchase_orders(job_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_non_material_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_purchase_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs table
CREATE POLICY "Users can view their own jobs" ON public.jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON public.jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON public.jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" ON public.jobs
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for job_budget_lines table
CREATE POLICY "Users can view budget lines for their jobs" ON public.job_budget_lines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_budget_lines.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert budget lines for their jobs" ON public.job_budget_lines
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_budget_lines.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update budget lines for their jobs" ON public.job_budget_lines
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_budget_lines.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete budget lines for their jobs" ON public.job_budget_lines
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_budget_lines.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

-- RLS Policies for job_bom_lines table
CREATE POLICY "Users can view BOM lines for their jobs" ON public.job_bom_lines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_bom_lines.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert BOM lines for their jobs" ON public.job_bom_lines
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_bom_lines.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update BOM lines for their jobs" ON public.job_bom_lines
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_bom_lines.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete BOM lines for their jobs" ON public.job_bom_lines
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_bom_lines.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

-- RLS Policies for job_non_material_costs table
CREATE POLICY "Users can view non-material costs for their jobs" ON public.job_non_material_costs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_non_material_costs.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert non-material costs for their jobs" ON public.job_non_material_costs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_non_material_costs.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update non-material costs for their jobs" ON public.job_non_material_costs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_non_material_costs.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete non-material costs for their jobs" ON public.job_non_material_costs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_non_material_costs.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

-- RLS Policies for job_purchase_orders table
CREATE POLICY "Users can view purchase orders for their jobs" ON public.job_purchase_orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_purchase_orders.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert purchase orders for their jobs" ON public.job_purchase_orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_purchase_orders.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update purchase orders for their jobs" ON public.job_purchase_orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_purchase_orders.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete purchase orders for their jobs" ON public.job_purchase_orders
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE jobs.id = job_purchase_orders.job_id 
            AND jobs.user_id = auth.uid()
        )
    );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_budget_lines_updated_at BEFORE UPDATE ON public.job_budget_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_bom_lines_updated_at BEFORE UPDATE ON public.job_bom_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_non_material_costs_updated_at BEFORE UPDATE ON public.job_non_material_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_purchase_orders_updated_at BEFORE UPDATE ON public.job_purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

