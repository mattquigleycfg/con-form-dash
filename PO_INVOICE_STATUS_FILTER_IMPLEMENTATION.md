# PO Invoice Status Filter Implementation

## Summary

Successfully converted the "Show only jobs with invoiced POs" checkbox filter into a comprehensive dropdown filter with all three Odoo purchase order invoice statuses.

## Changes Made

### 1. Created New Hook: `src/hooks/useJobsByPOInvoiceStatus.ts`

**Replaced**: `useJobsWithInvoicedPOs.ts` (deleted)

**New Features**:
- Fetches all purchase orders with `state` in `['purchase', 'done']`
- Groups jobs by three invoice statuses:
  - `'no'` - Nothing to Bill
  - `'to invoice'` - Waiting Bills (partially invoiced or ready to invoice)
  - `'invoiced'` - Fully Billed (completely invoiced)
- Returns `jobIdsByStatus` object with three Sets of job IDs
- Uses same caching strategy (1 min stale time, 2 min refetch interval)

### 2. Updated Filter Logic: `src/hooks/useJobReportsFiltering.ts`

**Interface Changes**:
```typescript
// Before
showOnlyInvoicedPOs: boolean;
jobIdsWithInvoicedPOs?: Set<string>;

// After
poInvoiceStatusFilter: string | null;
jobIdsByPOInvoiceStatus?: {
  no: Set<string>;
  toInvoice: Set<string>;
  invoiced: Set<string>;
};
```

**Filter Logic**:
- Handles `'to invoice'` string mapping to `'toInvoice'` key
- Filters jobs based on selected invoice status
- Returns all jobs when `poInvoiceStatusFilter` is `null`

### 3. Created New Component: `src/components/job-costing/POInvoiceStatusFilter.tsx`

**Features**:
- Select dropdown with four options:
  1. "All Jobs" - shows all jobs (default)
  2. "No Invoice" - jobs with POs that have no invoices
  3. "Waiting Bills" - jobs with POs waiting for bills
  4. "Fully Invoiced" - jobs with fully invoiced POs
- Displays count badges for each status
- Clean, consistent styling with other filters

### 4. Updated Reports Page: `src/pages/JobCostingReports.tsx`

**State Changes**:
```typescript
// Before
const [showOnlyInvoicedPOs, setShowOnlyInvoicedPOs] = useState(false);
const { data: invoicedPOsData } = useJobsWithInvoicedPOs(jobs);

// After
const [poInvoiceStatusFilter, setPoInvoiceStatusFilter] = useState<string | null>(null);
const { data: poInvoiceStatusData } = useJobsByPOInvoiceStatus(jobs);
```

**UI Changes**:
- Replaced checkbox (lines 315-332) with dropdown filter
- Integrated with existing filter grid layout
- Shows job counts for each status dynamically

## Odoo Integration

### Invoice Status Values (from Odoo source)

**Field**: `purchase.order.invoice_status`

**Computed by**: `_get_invoiced()` method in `purchase/models/purchase.py` (lines 45-67)

**Values**:
1. **`'no'`** - Nothing to Bill
   - Order not in `'purchase'` or `'done'` state, OR
   - No invoice lines exist and nothing to invoice

2. **`'to invoice'`** - Waiting Bills
   - Order in `'purchase'` or `'done'` state
   - Has lines with `qty_to_invoice > 0`
   - Partially invoiced or ready to invoice

3. **`'invoiced'`** - Fully Billed
   - Order in `'purchase'` or `'done'` state
   - All lines have `qty_to_invoice = 0`
   - At least one invoice exists (`invoice_ids` is not empty)

### Query Details

**Model**: `purchase.order`

**Domain**: `[['state', 'in', ['purchase', 'done']]]`

**Fields**: `['id', 'name', 'analytic_account_id', 'invoice_status']`

**Matching Logic**: Jobs are matched to POs via `analytic_account_id`

## User Experience

### Before
- Single checkbox: "Show only jobs with invoiced POs"
- Binary filter: show all jobs OR show only fully invoiced
- Limited visibility into invoice status

### After
- Dropdown with 4 options
- Granular filtering by invoice status
- Real-time job counts for each status
- Clear labeling matching Odoo terminology

## Testing Checklist

- [ ] Verify dropdown appears in Job Costing Reports
- [ ] Test "All Jobs" option (default) - should show all jobs
- [ ] Test "No Invoice" - filters to jobs with POs that have no invoices
- [ ] Test "Waiting Bills" - filters to jobs with POs waiting for invoices
- [ ] Test "Fully Invoiced" - filters to jobs with fully invoiced POs
- [ ] Verify job counts display correctly for each option
- [ ] Test filter combination with other filters (date, sales person, etc.)
- [ ] Verify export functionality works with selected filter
- [ ] Check that filter persists when navigating away and back

## Technical Notes

### Key Files Modified
1. `src/hooks/useJobsByPOInvoiceStatus.ts` (new)
2. `src/hooks/useJobReportsFiltering.ts` (updated)
3. `src/components/job-costing/POInvoiceStatusFilter.tsx` (new)
4. `src/pages/JobCostingReports.tsx` (updated)

### Key Files Deleted
1. `src/hooks/useJobsWithInvoicedPOs.ts` (replaced)

### No Breaking Changes
- All changes are backwards compatible
- Default behavior (no filter) matches previous "show all" state
- Filter integrates seamlessly with existing filter system

## Future Enhancements (Optional)

1. Add visual indicators in job cards showing invoice status
2. Show breakdown of invoice statuses in summary cards
3. Add "Mixed" status for jobs with multiple POs in different states
4. Export invoice status in CSV/Excel reports
5. Add filter to Job Costing main page (not just reports)

