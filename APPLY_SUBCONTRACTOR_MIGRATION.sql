-- APPLY SUBCONTRACTOR MIGRATION TO SUPABASE
-- Run this in your Supabase SQL Editor to ensure the migration is applied
-- URL: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/sql/new

-- First, check if columns already exist
DO $$
BEGIN
    -- Add subcontractor_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'subcontractor_id'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN subcontractor_id INTEGER;
        RAISE NOTICE 'Added subcontractor_id column';
    ELSE
        RAISE NOTICE 'subcontractor_id column already exists';
    END IF;

    -- Add subcontractor_name if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs' 
        AND column_name = 'subcontractor_name'
    ) THEN
        ALTER TABLE public.jobs ADD COLUMN subcontractor_name TEXT;
        RAISE NOTICE 'Added subcontractor_name column';
    ELSE
        RAISE NOTICE 'subcontractor_name column already exists';
    END IF;
END $$;

-- Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_jobs_subcontractor_id ON public.jobs(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_subcontractor_name ON public.jobs(subcontractor_name);

-- Add documentation comments
COMMENT ON COLUMN public.jobs.subcontractor_id IS 'Odoo res.partner ID of the subcontractor (vendor with supplier_rank > 0)';
COMMENT ON COLUMN public.jobs.subcontractor_name IS 'Cached name of the subcontractor from Odoo';

-- Verify the columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'jobs' 
AND column_name IN ('subcontractor_id', 'subcontractor_name')
ORDER BY column_name;

