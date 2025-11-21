# Material Cost Calculation Fix Summary

## Issue Identified

The application was showing **$70,839** for material costs, but the actual Odoo Manufacturing Orders showed **$31,863.89**.

### Root Cause

**Triple-counting** of material costs:

1. **BOM lines** from CSV imports (stored in `job_bom_lines` table)
2. **Material analytic lines** from Odoo manufacturing orders (from analytic account API)
3. Both were being summed together in `materialActualTotal` calculation

```typescript
// OLD (INCORRECT) - Line 798
const materialActualTotal = matchedMaterialActualTotal + unmatchedMaterialActualTotal + materialAnalyticTotal;
```

This caused:
- BOM lines (manual/CSV): ~$38,975
- Material analytic lines (Odoo MOs): $31,863.89
- **Total**: $70,839 ❌

## Solution Implemented

### 1. Use Odoo Analytic Lines as Single Source of Truth

Changed the calculation to **ONLY use material analytic lines** from Odoo manufacturing orders:

```typescript
// NEW (CORRECT) - Lines 798-810
const materialActualTotal = materialAnalyticTotal;
```

This ensures:
- Material costs come directly from Odoo Manufacturing Order components
- No double-counting with BOM table entries
- Accurate reflection of actual consumed materials: **$31,863.89** ✅

### 2. Maintained Non-Material Cost Logic

Non-material costs correctly combine:
- Manual costs (excluding `is_from_odoo` to prevent duplicates)
- Analytic lines for services (installation, freight, etc.)

```typescript
// Lines 806-814
const nonMaterialManualTotal = costs?.filter(c => !c.is_from_odoo).reduce((sum, cost) => sum + cost.amount, 0) || 0;
const nonMaterialAnalyticTotal = filteredNonMaterialAnalyticLines.reduce((sum, line) => sum + Math.abs(line.amount), 0);
const nonMaterialActualTotal = nonMaterialManualTotal + nonMaterialAnalyticTotal;
```

### 3. Fixed Non-Material Cost Table Display

Updated `costsByCategory` to filter out `is_from_odoo` costs (line 759):

```typescript
// Lines 759-770 (FIXED)
costs?.filter(c => !c.is_from_odoo).forEach(cost => {
  // Add manual costs only, analytic lines added separately
});
```

### 4. Added Debug Logging

Console logs now show cost breakdown for troubleshooting:

```javascript
console.log('🔍 Material Cost Breakdown:', {
  matchedMaterialActualTotal,
  unmatchedMaterialActualTotal,
  materialAnalyticTotal,
  bomLinesCount,
  analyticLinesCount,
});

console.log('🔍 Non-Material Cost Breakdown:', {
  nonMaterialManualTotal,
  nonMaterialAnalyticTotal,
  nonMaterialActualTotal,
  manualCostsCount,
  analyticLinesCount,
});
```

### 5. Database Constraint Fix

Created migration to fix `cost_type` CHECK constraint error:

**File**: `supabase/migrations/20250122000000_fix_cost_type_constraint.sql`

Ensures all valid cost types are allowed:
- installation
- freight
- cranage
- travel
- accommodation
- other

## Impact

### All Three Sections Now Consistent ✅

1. **Budget Circle Chart** (donut chart)
   - Uses `materialActualTotal` from analytic lines only
   - Shows accurate $31,863.89

2. **Cost Analysis Overview Table**
   - Uses `materialActualTotal` via props
   - Shows accurate $31,863.89

3. **Actual Costs (Actuals & POs) Table**
   - Filters manual costs (`!is_from_odoo`)
   - Adds analytic lines separately
   - Shows accurate $31,863.89

## Testing

1. Open Job Costing Detail page
2. Check console for debug logs:
   ```
   🔍 Material Cost Breakdown
   🔍 Non-Material Cost Breakdown
   ```
3. Verify all three sections show matching totals
4. Run migration to fix cost_type constraint:
   ```sql
   -- Run in Supabase SQL Editor
   \i supabase/migrations/20250122000000_fix_cost_type_constraint.sql
   ```

## Files Changed

1. **src/pages/JobCostingDetail.tsx**
   - Line 798-810: Changed material cost calculation
   - Line 759: Filtered `costsByCategory` to exclude `is_from_odoo`
   - Line 806-822: Added debug logging

2. **supabase/migrations/20250122000000_fix_cost_type_constraint.sql** (NEW)
   - Fixes CHECK constraint on `cost_type` column

## Recommended Next Steps

1. ✅ Run dev server and verify console logs
2. ✅ Check that all three sections match: $31,863.89
3. 🔲 Run database migration for cost_type constraint
4. 🔲 Clear/archive old BOM CSV imports if they're no longer needed
5. 🔲 Document that "Import from Analytic" is the primary data source

## Notes

- **BOM table entries** (from CSV imports) are now effectively **ignored** for material cost calculations
- The app relies on **Odoo analytic account** as the single source of truth for manufacturing order component costs
- This aligns with your Odoo data: MO components × cost × to_consume = $31,863.89

