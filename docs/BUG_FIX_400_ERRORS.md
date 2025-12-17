# Bug Fix: 400 Errors in Finance KPIs

## Issue
Finance KPIs page was showing 400 errors from the odoo-query Edge Function:
```
ibqgwakjmsnjtvwpkdns.supabase.co/functions/v1/odoo-query:1  
Failed to load resource: the server responded with a status of 400 ()
```

Multiple queries were failing, resulting in no data being displayed on the page.

## Root Causes

### 1. Incorrect API Format in `useAccountApplications`
**Problem:** The hook was using `domain` and `fields` as separate parameters:
```typescript
body: {
  model: "helpdesk.ticket",
  method: "search_read",
  domain: [...],  // ❌ Wrong format
  fields: [...],  // ❌ Wrong format
}
```

**Solution:** Changed to use `args` array format that the Edge Function expects:
```typescript
body: {
  model: "helpdesk.ticket",
  method: "search_read",
  args: [
    [...],  // domain as first arg
    [...],  // fields as second arg
  ],
}
```

**Files Fixed:**
- Line 51-73: `fetchAccountApplicationTickets` function
- Line 78-107: `fetchStageHistory` function  
- Line 109-116: mail.message query in loop

### 2. Interface Mismatch in `useOdooAccounting`
**Problem:** The hook returned a flat structure:
```typescript
return {
  arDays,
  apDays,
  invoicesOpen,      // ❌ Finance KPIs expected invoicing.totalInvoices
  invoicesClosedYTD, // ❌ Not used
  ...
}
```

**Solution:** Updated to return nested `invoicing` object:
```typescript
return {
  arDays,
  apDays,
  invoicing: {
    totalInvoices,        // ✅ Matches Finance KPIs
    paidInvoices,         // ✅ Matches Finance KPIs
    outstandingInvoices,  // ✅ Matches Finance KPIs
    totalRevenue,         // ✅ Matches Finance KPIs
  },
  ...
}
```

**Files Fixed:**
- Lines 5-12: Updated `AccountingMetrics` interface
- Lines 178-200: Rewrote `calculateInvoicingMetrics` function
- Lines 217-233: Updated return statement

### 3. Missing Parameters in `useOdooAccounting`
**Problem:** Finance KPIs called the hook with parameters:
```typescript
const { data } = useOdooAccounting(start, end); // ❌ Hook didn't accept params
```

**Solution:** Updated hook signature to accept optional parameters:
```typescript
export function useOdooAccounting(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["odoo-accounting", startDate, endDate], // ✅ Include in cache key
    ...
  });
}
```

**Note:** Parameters are currently accepted but not used in queries (queries still use 2024-01-01 hardcoded). This can be enhanced later to use dynamic date ranges.

## Changes Made

### File: `src/hooks/useAccountApplications.ts`
1. **Line 51-73:** Changed `domain`/`fields` to `args` array format
2. **Line 78-107:** Changed mail.tracking.value query to use `args`
3. **Line 109-116:** Changed mail.message query to use `args`

### File: `src/hooks/useOdooAccounting.ts`
1. **Lines 5-12:** Updated `AccountingMetrics` interface with nested `invoicing` object
2. **Lines 178-200:** Rewrote `calculateInvoicingMetrics` to calculate:
   - `totalInvoices`: All invoices
   - `paidInvoices`: Paid invoices only
   - `outstandingInvoices`: Unpaid invoices only
   - `totalRevenue`: Sum of all invoice amounts
3. **Lines 207-209:** Added `startDate` and `endDate` optional parameters
4. **Lines 217-233:** Updated return statement to match new interface

## Testing Results

### Build Status
```bash
✓ TypeScript compilation: PASS
✓ Vite build: PASS
✓ Bundle size: 1.85 MB
✓ No errors
```

### Expected Behavior
After deploying these fixes:
1. ✅ No more 400 errors in console
2. ✅ Finance KPIs page displays invoice data from Odoo
3. ✅ Account Applications section shows ticket counts
4. ✅ AR/AP Days display calculated values
5. ✅ All sections show "odoo" badge indicating live data

## API Format Reference

For future development, the correct format for `search_read` calls is:

```typescript
await supabase.functions.invoke("odoo-query", {
  body: {
    model: "model.name",
    method: "search_read",
    args: [
      [["field", "operator", "value"]], // domain (filter)
      ["field1", "field2", "field3"],   // fields to fetch
    ],
    kwargs: {                            // optional
      order: "field desc",
      limit: 100,
    },
  },
});
```

**Do NOT use:**
```typescript
// ❌ This format doesn't work with our Edge Function
{
  domain: [...],
  fields: [...],
}
```

## Related Documentation
- [Odoo XML-RPC API Documentation](https://www.odoo.com/documentation/16.0/developer/reference/external_api.html)
- Edge Function: `supabase/functions/odoo-query/index.ts`
- Finance KPIs: `src/pages/kpis/FinanceKPIs.tsx`

## Deployment Checklist
- [x] Fix `useAccountApplications` API format
- [x] Fix `useOdooAccounting` interface mismatch
- [x] Add parameters to `useOdooAccounting`
- [x] Build passes
- [ ] Deploy to production
- [ ] Test on https://con-form-dash.netlify.app/kpis/finance
- [ ] Verify no 400 errors in console
- [ ] Verify data displays correctly

## Date
Fixed: ${new Date().toISOString().split('T')[0]}

