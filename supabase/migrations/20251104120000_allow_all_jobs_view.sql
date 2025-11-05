-- Allow all authenticated users to view all jobs (not just their own)
-- This enables team-wide visibility of job costing data

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can view their own job budget lines" ON public.job_budget_lines;
DROP POLICY IF EXISTS "Users can view their own job material costs" ON public.job_material_costs;
DROP POLICY IF EXISTS "Users can view their own job non-material costs" ON public.job_non_material_costs;

-- Create new permissive policies for SELECT
CREATE POLICY "Authenticated users can view all jobs"
  ON public.jobs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all job budget lines"
  ON public.job_budget_lines
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all job material costs"
  ON public.job_material_costs
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view all job non-material costs"
  ON public.job_non_material_costs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Keep write policies user-specific (users can only modify their own data)
-- These should already exist from previous migrations, but recreate if needed

DO $$ 
BEGIN
  -- Jobs table
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'jobs' 
    AND policyname = 'Users can insert their own jobs'
  ) THEN
    CREATE POLICY "Users can insert their own jobs"
      ON public.jobs
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'jobs' 
    AND policyname = 'Users can update their own jobs'
  ) THEN
    CREATE POLICY "Users can update their own jobs"
      ON public.jobs
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'jobs' 
    AND policyname = 'Users can delete their own jobs'
  ) THEN
    CREATE POLICY "Users can delete their own jobs"
      ON public.jobs
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

