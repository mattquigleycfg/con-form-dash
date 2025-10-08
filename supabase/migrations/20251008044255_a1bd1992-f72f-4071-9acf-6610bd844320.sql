-- Create sales targets table
CREATE TABLE public.sales_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_value numeric NOT NULL,
  period text NOT NULL,
  metric text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own targets"
ON public.sales_targets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own targets"
ON public.sales_targets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own targets"
ON public.sales_targets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own targets"
ON public.sales_targets
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sales_targets_updated_at
BEFORE UPDATE ON public.sales_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();