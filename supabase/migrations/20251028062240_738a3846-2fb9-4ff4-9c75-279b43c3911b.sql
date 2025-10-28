-- Create jobs table to track projects
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  odoo_sale_order_id INTEGER NOT NULL,
  sale_order_name TEXT NOT NULL,
  analytic_account_id INTEGER,
  analytic_account_name TEXT,
  customer_name TEXT NOT NULL,
  total_budget NUMERIC NOT NULL DEFAULT 0,
  material_budget NUMERIC NOT NULL DEFAULT 0,
  non_material_budget NUMERIC NOT NULL DEFAULT 0,
  total_actual NUMERIC NOT NULL DEFAULT 0,
  material_actual NUMERIC NOT NULL DEFAULT 0,
  non_material_actual NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, odoo_sale_order_id)
);

-- Create job budget lines (from sales orders)
CREATE TABLE public.job_budget_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  odoo_line_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL, -- 'service', 'consu', 'product'
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  cost_category TEXT NOT NULL, -- 'material' or 'non_material'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, odoo_line_id)
);

-- Create BOM lines (bill of materials - actual material costs)
CREATE TABLE public.job_bom_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  odoo_product_id INTEGER,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create non-material cost breakdown
CREATE TABLE public.job_non_material_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL, -- 'installation', 'freight', 'cranage', 'travel', 'accommodation', 'other'
  description TEXT,
  amount NUMERIC NOT NULL,
  odoo_purchase_order_id INTEGER,
  is_from_odoo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase order tracking
CREATE TABLE public.job_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  odoo_po_id INTEGER NOT NULL,
  po_name TEXT NOT NULL,
  vendor_name TEXT,
  amount_total NUMERIC NOT NULL,
  cost_category TEXT NOT NULL, -- 'material' or 'non_material'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, odoo_po_id)
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_non_material_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_purchase_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jobs
CREATE POLICY "Users can view their own jobs"
  ON public.jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON public.jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON public.jobs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for job_budget_lines
CREATE POLICY "Users can view budget lines for their jobs"
  ON public.job_budget_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_budget_lines.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can create budget lines for their jobs"
  ON public.job_budget_lines FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_budget_lines.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can update budget lines for their jobs"
  ON public.job_budget_lines FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_budget_lines.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can delete budget lines for their jobs"
  ON public.job_budget_lines FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_budget_lines.job_id AND jobs.user_id = auth.uid()));

-- RLS Policies for job_bom_lines
CREATE POLICY "Users can view BOM lines for their jobs"
  ON public.job_bom_lines FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_bom_lines.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can create BOM lines for their jobs"
  ON public.job_bom_lines FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_bom_lines.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can update BOM lines for their jobs"
  ON public.job_bom_lines FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_bom_lines.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can delete BOM lines for their jobs"
  ON public.job_bom_lines FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_bom_lines.job_id AND jobs.user_id = auth.uid()));

-- RLS Policies for job_non_material_costs
CREATE POLICY "Users can view non-material costs for their jobs"
  ON public.job_non_material_costs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_non_material_costs.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can create non-material costs for their jobs"
  ON public.job_non_material_costs FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_non_material_costs.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can update non-material costs for their jobs"
  ON public.job_non_material_costs FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_non_material_costs.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can delete non-material costs for their jobs"
  ON public.job_non_material_costs FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_non_material_costs.job_id AND jobs.user_id = auth.uid()));

-- RLS Policies for job_purchase_orders
CREATE POLICY "Users can view purchase orders for their jobs"
  ON public.job_purchase_orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_purchase_orders.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can create purchase orders for their jobs"
  ON public.job_purchase_orders FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_purchase_orders.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can update purchase orders for their jobs"
  ON public.job_purchase_orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_purchase_orders.job_id AND jobs.user_id = auth.uid()));

CREATE POLICY "Users can delete purchase orders for their jobs"
  ON public.job_purchase_orders FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_purchase_orders.job_id AND jobs.user_id = auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_budget_lines_updated_at
  BEFORE UPDATE ON public.job_budget_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_bom_lines_updated_at
  BEFORE UPDATE ON public.job_bom_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_non_material_costs_updated_at
  BEFORE UPDATE ON public.job_non_material_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_job_purchase_orders_updated_at
  BEFORE UPDATE ON public.job_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();