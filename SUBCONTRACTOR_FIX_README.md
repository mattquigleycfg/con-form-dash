# Subcontractor Field Error Fix

## Problem
Getting "Failed to update subcontractor" error when trying to add subcontractors from Odoo vendors in the Job Costing Detail page.

## Root Cause
The TypeScript types for Supabase (`src/integrations/supabase/types.ts`) were out of sync with the actual database schema. The migration file existed (`supabase/migrations/20250119000000_add_subcontractor_to_jobs.sql`), but:

1. The TypeScript types didn't include the `subcontractor_id` and `subcontractor_name` columns
2. The migration may not have been applied to the production Supabase database

## Solution Implemented

### 1. Updated TypeScript Types ✅
Updated `src/integrations/supabase/types.ts` to include the missing columns in the `jobs` table:
- `subcontractor_id: number | null`
- `subcontractor_name: string | null`

Also added other missing columns that were in migrations but not in types:
- `created_by_user_id: string | null`
- `last_synced_at: string | null`
- `last_synced_by_user_id: string | null`
- `project_analytic_account_id: number | null`
- `project_analytic_account_name: string | null`

### 2. Improved Error Logging ✅
Enhanced error handling in `src/pages/JobCostingDetail.tsx` to:
- Log detailed Supabase error information (message, details, hint, code)
- Show the actual error message in the toast notification
- Log successful updates for debugging

### 3. Created Migration Verification Script ✅
Created `APPLY_SUBCONTRACTOR_MIGRATION.sql` to verify and apply the migration if needed.

## How to Apply the Migration

### Option 1: Using Supabase SQL Editor (Recommended)
1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/sql/new
2. Copy the contents of `APPLY_SUBCONTRACTOR_MIGRATION.sql`
3. Paste into the SQL Editor
4. Click "Run" to execute
5. Check the output messages to confirm columns were added or already exist

### Option 2: Check Column Existence Manually
Run this query in Supabase SQL Editor to verify:

```sql
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'jobs' 
AND column_name IN ('subcontractor_id', 'subcontractor_name')
ORDER BY column_name;
```

If this returns 2 rows, the columns exist. If it returns 0 rows, you need to run the migration.

## Testing the Fix

1. Navigate to a Job Costing detail page
2. Try to select a subcontractor from the Odoo vendors
3. Check the browser console for any error messages
4. If you still see errors, check:
   - The console output for detailed Supabase error information
   - The Supabase dashboard to verify the columns exist
   - The Row Level Security (RLS) policies on the `jobs` table

## Files Modified

1. `src/integrations/supabase/types.ts` - Added missing column types
2. `src/pages/JobCostingDetail.tsx` - Improved error logging
3. `APPLY_SUBCONTRACTOR_MIGRATION.sql` - Migration verification script (new file)

## Next Steps

If you continue to see errors after applying the migration:

1. Check the browser console for the detailed error message
2. Verify RLS policies allow UPDATE operations on the `jobs` table
3. Ensure the user is authenticated and has proper permissions
4. Check if the migration was successfully applied by running the verification query

## Related Files

- Migration: `supabase/migrations/20250119000000_add_subcontractor_to_jobs.sql`
- Vendor Hook: `src/hooks/useOdooVendors.ts`
- Selector Component: `src/components/job-costing/SubcontractorSelector.tsx`
- Filter Component: `src/components/job-costing/SubcontractorFilter.tsx`

