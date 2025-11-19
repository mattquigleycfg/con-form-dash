-- Fix RLS policies for job-related tables to allow team-wide access
-- This fixes the "new row violates row-level security policy" error

-- ============================================================================
-- JOB_BOM_LINES: Update RLS policies for team-wide access
-- ============================================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view BOM lines for their jobs" ON job_bom_lines;
DROP POLICY IF EXISTS "Users can create BOM lines for their jobs" ON job_bom_lines;
DROP POLICY IF EXISTS "Users can update BOM lines for their jobs" ON job_bom_lines;
DROP POLICY IF EXISTS "Users can delete BOM lines for their jobs" ON job_bom_lines;

-- Create new team-wide policies
CREATE POLICY "Team members can view all BOM lines"
  ON job_bom_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team members can create BOM lines"
  ON job_bom_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Team members can update BOM lines"
  ON job_bom_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Team members can delete BOM lines"
  ON job_bom_lines FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- JOB_BUDGET_LINES: Update RLS policies for team-wide access
-- ============================================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view budget lines for their jobs" ON job_budget_lines;
DROP POLICY IF EXISTS "Users can create budget lines for their jobs" ON job_budget_lines;
DROP POLICY IF EXISTS "Users can update budget lines for their jobs" ON job_budget_lines;
DROP POLICY IF EXISTS "Users can delete budget lines for their jobs" ON job_budget_lines;

-- Create new team-wide policies
CREATE POLICY "Team members can view all budget lines"
  ON job_budget_lines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team members can create budget lines"
  ON job_budget_lines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Team members can update budget lines"
  ON job_budget_lines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Team members can delete budget lines"
  ON job_budget_lines FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- JOB_NON_MATERIAL_COSTS: Update RLS policies for team-wide access
-- ============================================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view non-material costs for their jobs" ON job_non_material_costs;
DROP POLICY IF EXISTS "Users can create non-material costs for their jobs" ON job_non_material_costs;
DROP POLICY IF EXISTS "Users can update non-material costs for their jobs" ON job_non_material_costs;
DROP POLICY IF EXISTS "Users can delete non-material costs for their jobs" ON job_non_material_costs;

-- Create new team-wide policies
CREATE POLICY "Team members can view all non-material costs"
  ON job_non_material_costs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team members can create non-material costs"
  ON job_non_material_costs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Team members can update non-material costs"
  ON job_non_material_costs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Team members can delete non-material costs"
  ON job_non_material_costs FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- JOB_PURCHASE_ORDERS: Update RLS policies for team-wide access
-- ============================================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view purchase orders for their jobs" ON job_purchase_orders;
DROP POLICY IF EXISTS "Users can create purchase orders for their jobs" ON job_purchase_orders;
DROP POLICY IF EXISTS "Users can update purchase orders for their jobs" ON job_purchase_orders;
DROP POLICY IF EXISTS "Users can delete purchase orders for their jobs" ON job_purchase_orders;

-- Create new team-wide policies
CREATE POLICY "Team members can view all purchase orders"
  ON job_purchase_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Team members can create purchase orders"
  ON job_purchase_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Team members can update purchase orders"
  ON job_purchase_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Team members can delete purchase orders"
  ON job_purchase_orders FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Log the policy updates
DO $$
BEGIN
  RAISE NOTICE 'RLS policies updated for team-wide access on:';
  RAISE NOTICE '  - job_bom_lines';
  RAISE NOTICE '  - job_budget_lines';
  RAISE NOTICE '  - job_non_material_costs';
  RAISE NOTICE '  - job_purchase_orders';
  RAISE NOTICE 'All authenticated users can now access job-related data.';
END $$;

