-- Migration: Make jobs team-shared instead of per-user
-- This allows multiple team members to view and sync the same jobs
-- Prevents duplicate job creation for the same Odoo sale orders

-- Add new tracking columns
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_synced_by_user_id UUID REFERENCES auth.users(id);

-- Migrate existing data: Set created_by_user_id from user_id
UPDATE jobs 
SET created_by_user_id = user_id 
WHERE created_by_user_id IS NULL;

-- Add index for fast lookup by odoo_sale_order_id (prevent duplicates)
CREATE INDEX IF NOT EXISTS idx_jobs_odoo_sale_order_id 
  ON jobs(odoo_sale_order_id);

-- Add index for last_synced_at (for stale data queries)
CREATE INDEX IF NOT EXISTS idx_jobs_last_synced_at 
  ON jobs(last_synced_at);

-- Update RLS policies for team-wide access
-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;
DROP POLICY IF EXISTS jobs_policy ON jobs;
DROP POLICY IF EXISTS jobs_select_policy ON jobs;
DROP POLICY IF EXISTS jobs_insert_policy ON jobs;
DROP POLICY IF EXISTS jobs_update_policy ON jobs;
DROP POLICY IF EXISTS jobs_delete_policy ON jobs;

-- Create new team-wide policies (all authenticated users can access)
CREATE POLICY "Team members can view all jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team members can insert jobs"
  ON jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Team members can update jobs"
  ON jobs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Team members can delete jobs"
  ON jobs FOR DELETE
  TO authenticated
  USING (true);

-- Add comment explaining the change
COMMENT ON TABLE jobs IS 'Job costing records - team-shared across all authenticated users. Jobs are uniquely identified by odoo_sale_order_id to prevent duplicates.';
COMMENT ON COLUMN jobs.user_id IS 'Legacy column - kept for backwards compatibility. Use created_by_user_id instead.';
COMMENT ON COLUMN jobs.created_by_user_id IS 'User who originally created this job (tracking only)';
COMMENT ON COLUMN jobs.last_synced_at IS 'Timestamp of last sync with Odoo - used to determine if data is stale';
COMMENT ON COLUMN jobs.last_synced_by_user_id IS 'User who last synced this job with Odoo';

