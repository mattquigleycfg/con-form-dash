# ✅ Fixed: 406, 403, and 400 Errors

## Summary of Fixes

### 1. ✅ Fixed 406 Errors (Not Acceptable)

**Problem**: Using `.single()` when querying for 0 or 1 rows causes 406 errors  
**Solution**: Changed to `.maybeSingle()` which returns `null` for 0 rows instead of throwing an error

**Files Fixed:**
- ✅ `src/hooks/useOdooTeam.ts` - Monthly targets query
- ✅ `src/components/TargetProgress.tsx` - Monthly targets query  
- ✅ `src/pages/JobCosting.tsx` - Existing job check

### 2. ⚠️ 403 Error (Forbidden) - Requires SQL Fix

**Problem**: Missing INSERT/UPDATE/DELETE RLS policies for `jobs` and related tables  
**Solution**: Run `ADD_JOBS_WRITE_POLICIES.sql` in Supabase SQL Editor

**To Fix:**
1. Go to: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/sql/new
2. Copy and run the contents of `ADD_JOBS_WRITE_POLICIES.sql`
3. This will add policies for:
   - `jobs` (INSERT, UPDATE, DELETE)
   - `job_budget_lines` (INSERT, UPDATE, DELETE)
   - `job_bom_lines` (INSERT, UPDATE, DELETE)
   - `job_non_material_costs` (INSERT, UPDATE, DELETE)
   - `job_purchase_orders` (INSERT, UPDATE, DELETE)

All policies ensure users can only modify their own job data (via `user_id` check).

### 3. ⚠️ 400 Error (Bad Request) - Odoo Query Issue

**Problem**: `useOdooSaleOrderLines.ts` is making a request that Odoo is rejecting  
**Possible Causes:**
1. Odoo field doesn't exist (e.g., `purchase_price`, `cost_price`)
2. Insufficient Odoo permissions for the authenticated user
3. Odoo model/method parameters incorrect

**To Debug:**
1. Check the Supabase Edge Functions logs:
   - Go to: https://supabase.com/dashboard/project/ibqgwakjmsnjtvwpkdns/functions
   - Click on `odoo-query` function
   - View the logs for detailed error messages from Odoo

2. The error message should indicate which field or parameter Odoo is rejecting

**Common Fixes:**
- Remove non-existent fields from the field list in `useOdooSaleOrderLines.ts`
- Verify the Odoo user has `sale.order.line` read access
- Check if the field names match your Odoo instance's custom fields

## Testing After Fixes

After running the SQL script, refresh your app and:

1. ✅ 406 errors for `monthly_targets` and `jobs` should be gone
2. ✅ Job auto-sync should work (403 error fixed)
3. ⚠️ 400 Odoo errors need further investigation via Edge Function logs

## Notes

- **React Router Warnings**: These are just deprecation warnings for React Router v7, not errors. They can be ignored for now.
- **Violation Warnings**: Browser performance warnings, not critical errors.

