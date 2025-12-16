# Shop Drawing Cycle Time - Implementation Testing Guide

## Overview
This document describes how to test and validate the Shop Drawing cycle time tracking implementation.

## What Was Implemented

### 1. New Hook: `useShopDrawingCycleTime`
**Location**: `src/hooks/useShopDrawingCycleTime.ts`

**Features**:
- Fetches Shop Drawings helpdesk tickets from Odoo
- Attempts to retrieve stage transition history via `mail.message` and `mail.tracking.value`
- Calculates cycle time metrics per stage
- Falls back to simple create→close time if stage history unavailable

### 2. Updated Design KPIs Page
**Location**: `src/pages/kpis/DesignKPIs.tsx`

**Changes**:
- Replaced manual "Avg Turnaround" with Odoo-calculated cycle time
- Added new "Cycle Time Analysis" section showing stage-by-stage breakdown
- Displays warning if stage history is unavailable

## Testing Checklist

### ✅ Unit Tests (Manual Validation)

1. **Hook fetches tickets correctly**
   - Navigate to Design KPIs page
   - Open browser DevTools → Network tab
   - Look for `odoo-query` requests
   - Verify `helpdesk.ticket` query returns Shop Drawings team tickets

2. **Stage history extraction**
   - Check if `mail.message` and `mail.tracking.value` queries succeed
   - If they fail (access denied), hook should gracefully fall back to simple cycle time
   - Check console for any errors related to message tracking

3. **Cycle time calculations**
   - For each completed ticket, verify:
     - `totalCycleTimeHours` = (close_date - create_date) in hours
     - Stage transitions are ordered chronologically
     - Duration calculations are correct

4. **UI displays correctly**
   - "Avg Turnaround" card shows numeric hours value
   - "Cycle Time Analysis" section appears after "Completed Work"
   - If no stage history: Warning card displays
   - If stage history exists: Stage cards display with hours and ticket counts

### ✅ Integration Tests

1. **Odoo API Access**
   ```typescript
   // Expected queries:
   // 1. helpdesk.ticket with team_id filter
   // 2. mail.message with model/res_id filter (may fail - OK)
   // 3. mail.tracking.value with field=stage_id filter (may fail - OK)
   ```

2. **Data Accuracy**
   - Pick a known completed Shop Drawing ticket from Odoo UI
   - Note its create_date and close_date
   - Calculate expected hours: (close - create) / 3600000
   - Compare with displayed "Avg Turnaround"

3. **Refresh Functionality**
   - Click refresh button on Design KPIs page
   - Verify both helpdesk and cycle time data refresh
   - Loading state should show during refresh

### ✅ Edge Cases

1. **No tickets in Shop Drawings team**
   - Should show 0 hrs and 0 completed tickets
   - No errors in console

2. **No closed tickets (all open)**
   - Should show 0 hrs for avg turnaround
   - Stage analysis may show limited data

3. **Large dataset (500+ tickets)**
   - Query limited to 500 most recent tickets
   - Should not timeout or cause performance issues

4. **Missing stage history**
   - Warning card displays explaining limited data
   - Falls back to overall cycle time only
   - No crashes or errors

## Expected Behavior

### When Stage History Available
```
┌─────────────────────────────────────────────────┐
│ Cycle Time Analysis                             │
│ Shop drawing lifecycle from creation to completion │
├─────────────────────────────────────────────────┤
│ [New Drawings]     [Revision Required]          │
│    8.2 hrs              12.3 hrs                │
│    15 tickets           8 tickets               │
│                                                 │
│ [Drawings In Progress] [Design Review]          │
│    15.6 hrs              12.4 hrs               │
│    12 tickets            10 tickets             │
│                                                 │
│ [Complete Drawings]                             │
│    2.1 hrs                                      │
│    15 tickets                                   │
└─────────────────────────────────────────────────┘
```

### When Stage History Unavailable
```
┌─────────────────────────────────────────────────┐
│ ⚠️ Limited Stage History Available              │
│ Detailed stage tracking data is not available.  │
│ Showing overall cycle time only.                │
└─────────────────────────────────────────────────┘
```

## Known Limitations

1. **Odoo Permissions**: If mail.message or mail.tracking.value models are not accessible, detailed stage tracking will not work. The system gracefully falls back to overall cycle time.

2. **Historical Data**: Only tickets created after implementation will have accurate stage transition tracking.

3. **Stage Name Changes**: Stage names are hardcoded. If Odoo stage names change, the mapping needs updating in `STAGE_ORDER` constant.

4. **Performance**: With large datasets (1000+ tickets), initial load may take 5-10 seconds. Consider adding pagination if needed.

## Validation Scenarios

### Scenario 1: Fresh Implementation
**Expected**: Warning about limited stage history, overall cycle time shows correctly

### Scenario 2: After 1 Week
**Expected**: Some stage history accumulates, stage cards begin showing data

### Scenario 3: After 1 Month
**Expected**: Full stage breakdown with representative averages

## Troubleshooting

### Issue: "Loading cycle time data..." never completes
**Solution**: Check browser console for Odoo API errors. Verify Shop Drawings team exists in Odoo.

### Issue: All stages show 0 hours
**Solution**: Verify closed tickets exist. Check that close_date is populated in Odoo.

### Issue: Stage names don't match
**Solution**: Update `STAGE_ORDER` array in `useShopDrawingCycleTime.ts` to match Odoo stage names exactly.

## Success Criteria

✅ Design KPIs page loads without errors
✅ "Avg Turnaround" displays Odoo-sourced hours (not manual)
✅ Cycle Time Analysis section appears
✅ Data refreshes when refresh button clicked
✅ No console errors related to cycle time
✅ Loading states display appropriately
✅ Graceful fallback when stage history unavailable

## Next Steps

1. Monitor data collection over 1-2 weeks
2. Validate stage names match Odoo configuration exactly
3. Consider adding trend charts for cycle time over time
4. Add alerts for unusually long cycle times (>72 hours)
5. Export cycle time data for external reporting

