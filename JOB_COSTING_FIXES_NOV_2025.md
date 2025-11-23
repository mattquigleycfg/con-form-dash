# Job Costing Fixes - November 2025

## Issues Addressed

### 1. Duplicate Jobs in Job Costing App

**Problem:** The same Odoo sale order could be synced multiple times by different users, creating duplicate job entries.

**Root Cause:** The `jobs` table had a composite unique constraint on `(user_id, odoo_sale_order_id)` which allowed the same sale order to be created by different users.

**Solution:**
- Created migration `20251124000001_fix_duplicate_jobs.sql` that:
  1. Removes existing duplicate jobs (keeps the most recent one)
  2. Drops the old composite unique constraint
  3. Adds a new unique constraint on `odoo_sale_order_id` only
  
**Impact:** Each Odoo sale order can now only have ONE job record across ALL users, preventing duplicates.

---

### 2. Positive Amounts (Invoices) Appearing in Non-Material Costs Table

**Problem:** Customer invoices and progress payments (positive amounts) were appearing in the "Cost Analysis Breakdown" non-material table. These are revenue items and should NOT be shown as costs.

**Root Cause:** Although filtering existed in `useJobCostAnalysis` to exclude positive amounts, invoice-related entries with specific keywords could potentially slip through the categorization logic.

**Solution:**

#### A. Enhanced Categorization in `useOdooAnalyticLines.ts`
Added explicit filtering for revenue-related keywords:
- INVOICE
- PROGRESS PAYMENT
- PAYMENT RECEIVED
- CUSTOMER INVOICE
- DOWN PAYMENT
- DEPOSIT

These entries are now categorized as 'material' to be filtered out (backup safety check).

#### B. Double-Check in `JobCostingDetail.tsx` - Cost Display
Added safety checks when displaying costs by category (line ~773):
```typescript
// CRITICAL SAFETY CHECK: Only include negative amounts (costs/expenses)
if (line.amount >= 0) {
  console.warn(`Skipping positive amount analytic line...`);
  return;
}

// Additional check: Filter out invoice-related descriptions
const isInvoiceRelated = desc.includes('INVOICE') || ...
if (isInvoiceRelated) {
  console.warn(`Skipping invoice-related analytic line...`);
  return;
}
```

#### C. Enhanced Import Function (line ~1187)
Added additional invoice-related keyword filtering when importing costs from Odoo analytic accounts:
```typescript
const isInvoiceRelated = lineNameUpper.includes('INVOICE') || 
                         lineNameUpper.includes('PROGRESS PAYMENT') || ...
if (isInvoiceRelated) {
  console.log(`Skipping invoice-related line: ${line.name}`);
  return;
}
```

**Impact:** 
- Only negative amounts (actual costs/expenses) are now displayed in non-material costs table
- Customer invoices and progress payments are completely filtered out
- Multiple layers of protection ensure no positive amounts slip through

---

## Files Modified

1. **supabase/migrations/20251124000001_fix_duplicate_jobs.sql** (NEW)
   - Database migration to fix duplicate jobs constraint

2. **src/hooks/useOdooAnalyticLines.ts**
   - Enhanced `categorizeAnalyticLine()` function with revenue keyword filtering

3. **src/pages/JobCostingDetail.tsx**
   - Added safety checks in `costsByCategory` computation (~line 773)
   - Enhanced import from analytic function (~line 1187)

---

## Testing Recommendations

### 1. Test Duplicate Jobs Fix
1. Deploy the database migration
2. Try syncing the same sale order from multiple user accounts
3. Verify only ONE job record exists in the database
4. Check that the job costing list shows no duplicates

### 2. Test Non-Material Costs Filtering
1. Open a job detail page
2. Navigate to "Cost Analysis Breakdown" → "Non-Material" tab
3. Verify all amounts shown are costs (no invoices or progress payments)
4. Check console for any warning messages about skipped positive amounts
5. Try importing costs from analytic account
6. Verify no invoice/payment entries are imported

---

## Deployment Steps

1. **Database Migration:**
   ```bash
   # Apply the migration to Supabase
   npx supabase db push
   ```

2. **Application Code:**
   ```bash
   # Build and deploy to Netlify
   npm run build
   git add .
   git commit -m "fix: prevent duplicate jobs and filter invoice entries from costs"
   git push origin main
   ```

3. **Verify:**
   - Check Supabase logs for successful migration
   - Test job syncing with multiple users
   - Test cost analysis display for existing jobs

---

## Notes

- The duplicate jobs fix is backwards compatible (RLS policies already support team-wide access)
- Existing duplicate jobs will be automatically cleaned up by the migration
- The non-material filtering has multiple layers for safety (defense in depth)
- Console warnings will help identify any edge cases that need attention

