-- Add subcontractor fields to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS subcontractor_id INTEGER,
ADD COLUMN IF NOT EXISTS subcontractor_name TEXT;

-- Add index for fast filtering by subcontractor
CREATE INDEX IF NOT EXISTS idx_jobs_subcontractor_id ON public.jobs(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_subcontractor_name ON public.jobs(subcontractor_name);

-- Add comment for documentation
COMMENT ON COLUMN public.jobs.subcontractor_id IS 'Odoo res.partner ID of the subcontractor (vendor with supplier_rank > 0)';
COMMENT ON COLUMN public.jobs.subcontractor_name IS 'Cached name of the subcontractor from Odoo';

