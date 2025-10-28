-- Add missing fields to jobs table for date filtering and project stage tracking
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS date_order timestamp with time zone,
ADD COLUMN IF NOT EXISTS project_stage_id integer,
ADD COLUMN IF NOT EXISTS project_stage_name text DEFAULT 'Unassigned';

-- Add index for better query performance on date filtering
CREATE INDEX IF NOT EXISTS idx_jobs_date_order ON public.jobs(date_order);

-- Add index for stage filtering
CREATE INDEX IF NOT EXISTS idx_jobs_project_stage_name ON public.jobs(project_stage_name);