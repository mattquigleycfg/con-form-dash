-- Installation day tracking: manual + auto-populated records for
-- comparing quoted man-days (from SO) vs actual days (from PO / manual entry).

CREATE TABLE IF NOT EXISTS public.installation_day_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_order_ref TEXT NOT NULL,
  sale_order_id INTEGER,
  customer_name TEXT,
  product_type TEXT NOT NULL,
  state TEXT,
  platform_area_m2 NUMERIC,
  quoted_days NUMERIC NOT NULL DEFAULT 0,
  actual_days NUMERIC NOT NULL DEFAULT 0,
  po_days NUMERIC,
  variance NUMERIC GENERATED ALWAYS AS (quoted_days - actual_days) STORED,
  overquote_ratio NUMERIC GENERATED ALWAYS AS (
    CASE WHEN actual_days > 0 THEN quoted_days / actual_days ELSE NULL END
  ) STORED,
  vendor TEXT,
  notes TEXT,
  tracked_by TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_install_tracking_so_ref
  ON public.installation_day_tracking(sale_order_ref);

CREATE INDEX IF NOT EXISTS idx_install_tracking_product_type
  ON public.installation_day_tracking(product_type);

CREATE INDEX IF NOT EXISTS idx_install_tracking_state
  ON public.installation_day_tracking(state);

ALTER TABLE public.installation_day_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all installation tracking"
  ON public.installation_day_tracking FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert installation tracking"
  ON public.installation_day_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update installation tracking"
  ON public.installation_day_tracking FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete installation tracking"
  ON public.installation_day_tracking FOR DELETE
  TO authenticated
  USING (true);

CREATE OR REPLACE TRIGGER update_installation_day_tracking_updated_at
  BEFORE UPDATE ON public.installation_day_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
