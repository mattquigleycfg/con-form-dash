# Quality Metrics Implementation

## Overview

The Design KPIs dashboard now automatically calculates three key quality metrics from Odoo Shop Drawings data:

1. **Revision Rate %** - Percentage of drawings that required revisions
2. **First-Time Pass Rate %** - Percentage of drawings approved without revisions
3. **DIFOT % (Delivery In Full, On Time)** - Percentage of drawings delivered on time

All metrics are calculated in real-time from Shop Drawings helpdesk tickets and can be filtered by time period (week, month, quarter, year).

## What Changed

### Files Created
- `docs/QUALITY_METRICS_IMPLEMENTATION.md` - This documentation

### Files Modified

1. **`src/hooks/useShopDrawingCycleTime.ts`**
   - Added `period` parameter to filter tickets by close date
   - Added `QualityMetrics` interface
   - Added `calculateQualityMetrics()` function
   - Enhanced ticket fetching to include SLA fields
   - Updated hook signature: `useShopDrawingCycleTime(period: DatePeriod = "month")`

2. **`src/pages/kpis/DesignKPIs.tsx`**
   - Pass `period` parameter to hook
   - Updated DIFOT card to use calculated value (was manual)
   - Updated Revision Rate card to use calculated value (was manual)
   - Updated First-Time Pass Rate card to use calculated value (was manual)
   - Removed manual entry handlers for quality metrics
   - Changed source from "manual" to "odoo"
   - Added ticket count footers showing transparency

## Calculation Logic

### 1. Revision Rate %

**Formula**:
```typescript
Revision Rate = (Tickets with revisions / Total completed tickets) × 100
```

**Detection Method**:
- Checks if "Revision Required" appears in the ticket's stage transition history
- A ticket is counted as "with revisions" if it entered the "Revision Required" stage at least once

**Example**:
- 15 tickets entered "Revision Required" stage
- 80 total completed tickets
- Revision Rate = (15 / 80) × 100 = **18.8%**

### 2. First-Time Pass Rate %

**Formula**:
```typescript
First-Time Pass Rate = 100% - Revision Rate
```

Or alternatively:
```typescript
First-Time Pass Rate = (Tickets without revisions / Total completed tickets) × 100
```

**Example**:
- 80 total completed tickets
- 15 tickets with revisions
- 65 tickets without revisions
- First-Time Pass Rate = **81.3%**

### 3. DIFOT % (Delivery In Full, On Time)

**Formula**:
```typescript
DIFOT = (On-time deliveries / Total completed tickets) × 100
```

**On-Time Criteria** (Priority Order):

**Priority 1: Odoo SLA (Preferred)**
```typescript
if (ticket.sla_reached_late === false) {
  // On time
}
```

**Priority 2: Custom SLA Fallback (40 working hours)**
```typescript
if (ticketCycleTimeInWorkingHours <= 40) {
  // On time (within 5 working days)
}
```

**Example**:
- 74 tickets delivered on time
- 80 total completed tickets
- DIFOT = (74 / 80) × 100 = **92.5%**
- Target: 95% (would show as amber/red status)

## Period Filtering

### How It Works

All metrics are filtered by the selected time period based on **close_date**:

```typescript
// Filter tickets closed in the selected period
const periodRange = getDateRange(period);
const ticketsInPeriod = tickets.filter((ticket) => {
  if (!ticket.close_date) return false; // Exclude open tickets
  const closeDate = new Date(ticket.close_date);
  return closeDate >= periodRange.start && closeDate <= periodRange.end;
});
```

### Available Periods

| Period | Description | Date Range |
|--------|-------------|------------|
| **Week** | This Week | Monday - Sunday (current week) |
| **Month** | This Month | 1st - Last day of current month |
| **Quarter** | This Quarter | Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec |
| **YTD** | Year to Date | July 1 (FY start) - Today |
| **Year** | Financial Year | July 1 - June 30 (Australian FY) |

**Note**: Uses Australian Financial Year (July 1 - June 30)

## UI Changes

### Shop Drawings Section

**DIFOT Card** (updated):
```
┌─────────────────────────┐
│ DIFOT %                 │
│     92.5%               │
│ [CheckCircle Icon]      │
│ 74 on-time / 80 total   │
└─────────────────────────┘
```

- **Status Colors**:
  - Green: ≥ 95% (on target)
  - Amber: 85-94% (below target)
  - Red: < 85% (significantly below target)
- **Source**: Changed from "manual" to "odoo"
- **Footer**: Shows on-time count vs total

### Quality Section

**Revision Rate Card** (updated):
```
┌─────────────────────────────────┐
│ Revision Rate %                 │
│     18.8%                       │
│ [TrendingDown Icon]             │
│ 15 of 80 tickets • Lower is better │
└─────────────────────────────────┘
```

**First-Time Pass Rate Card** (updated):
```
┌─────────────────────────────────┐
│ First-Time Pass Rate %          │
│     81.3%                       │
│ [CheckCircle Icon]              │
│ 65 of 80 tickets • Higher is better │
└─────────────────────────────────┘
```

Both cards now:
- Show calculated values from Odoo (not manual entry)
- Display ticket counts for transparency
- No longer have edit buttons
- Source is "odoo" instead of "manual"

## Data Source

### Odoo Fields Used

```typescript
// Helpdesk Ticket Fields
{
  id: number;
  name: string;
  team_id: [number, string];
  stage_id: [number, string];
  create_date: string;
  close_date: string;
  sla_deadline: string | false;      // For DIFOT calculation
  sla_reached_late: boolean;         // For DIFOT calculation
  message_ids: number[];             // For stage history
}
```

### Stage History Tracking

Quality metrics rely on stage transition history obtained from:
1. `mail.message` - Message tracking for ticket
2. `mail.tracking.value` - Field value changes (stage_id)

If stage history is unavailable:
- Revision Rate: Shows 0% (cannot determine)
- First-Time Pass Rate: Shows 100% (assumes no revisions)
- DIFOT: Falls back to custom SLA (40 working hours)

## Testing & Validation

### Manual Validation Steps

#### 1. Test Revision Rate

1. Go to Odoo → Helpdesk → Shop Drawings
2. Filter by closed tickets in the period
3. Count tickets that entered "Revision Required" stage
4. Compare with displayed Revision Rate

**Example Validation**:
```
Total closed this month: 80
With "Revision Required": 15
Expected Revision Rate: (15/80) × 100 = 18.75%
Dashboard shows: 18.8% ✓
```

#### 2. Test First-Time Pass Rate

**Should equal**: `100% - Revision Rate`

```
If Revision Rate = 18.8%
Then First-Time Pass Rate = 100 - 18.8 = 81.2%
Dashboard shows: 81.3% ✓
```

#### 3. Test DIFOT

1. Check which tickets have `sla_reached_late = false`
2. Or check which tickets closed within 40 working hours
3. Calculate percentage

**Example Validation**:
```
On-time (SLA not late): 74 tickets
Total closed: 80 tickets
Expected DIFOT: (74/80) × 100 = 92.5%
Dashboard shows: 92.5% ✓
```

### Period Filter Testing

1. **Week**: Switch to "This Week"
   - Verify only tickets closed this week are counted
   
2. **Month**: Switch to "This Month"
   - Verify only tickets closed this month are counted
   
3. **Quarter**: Switch to "This Quarter"
   - Verify correct quarter boundaries
   
4. **Year**: Switch to "Financial Year"
   - Verify July 1 - June 30 date range

### Edge Cases

#### No Completed Tickets
```typescript
// Expected behavior
revisionRate: 0%
firstTimePassRate: 0%
difotRate: 0%
totalCompleted: 0
```

#### All Tickets On-Time
```typescript
// Expected behavior
difotRate: 100%
onTimeDeliveries: totalCompleted
lateDeliveries: 0
```

#### All Tickets Required Revisions
```typescript
// Expected behavior
revisionRate: 100%
firstTimePassRate: 0%
revisionsRequired: totalCompleted
```

## Working Hours Integration

**Important**: The DIFOT custom SLA threshold uses **working hours** (not total hours):

- **40 working hours** = 5 working days
- Monday-Friday, 9 AM - 5 PM (8 hours/day)
- Weekends excluded
- After-hours time excluded

**Example**:
- Created: Monday 2 PM
- Closed: Monday (next week) 10 AM
- Total calendar time: 164 hours
- Working hours: 5 days × 8 hours = 40 hours
- **On time**: Yes (exactly at threshold)

## Comparison: Manual vs Automated

| Aspect | Before (Manual) | After (Automated) |
|--------|----------------|-------------------|
| Data Entry | Manual input required | Automatic from Odoo |
| Accuracy | Depends on manual calculation | Calculated from actual data |
| Real-time | Updated manually | Updates with data refresh |
| Transparency | No ticket counts shown | Shows ticket breakdowns |
| Period Filtering | Not supported | Fully supported (week/month/quarter/year) |
| Consistency | May vary | Consistent calculation |

## Benefits

1. **Automation**: No more manual data entry for quality metrics
2. **Accuracy**: Calculated from actual Odoo stage history
3. **Real-Time**: Always up-to-date with latest data
4. **Transparency**: Shows ticket counts behind percentages
5. **Period Comparison**: Easy to compare weekly, monthly, quarterly performance
6. **Consistency**: Same calculation logic every time
7. **Audit Trail**: Can trace back to specific tickets in Odoo

## Configuration

### Custom SLA Threshold

If you want to change the 40 working hours threshold for DIFOT:

**File**: `src/hooks/useShopDrawingCycleTime.ts`

**Line ~240**:
```typescript
// Current: 40 working hours
if (ticket.totalCycleTimeHours <= 40) {
  onTimeDeliveries++;
}

// Change to 5 working days (40 hours)
// Or 3 working days (24 hours)
if (ticket.totalCycleTimeHours <= 24) {
  onTimeDeliveries++;
}
```

### DIFOT Target

To change the 95% target for DIFOT:

**File**: `src/pages/kpis/DesignKPIs.tsx`

**Line ~86**:
```typescript
<KPICard
  title="DIFOT %"
  target={95}  // Change this value
  status={
    cycleTimeData.qualityMetrics.difotRate >= 95 ? "green" 
    : cycleTimeData.qualityMetrics.difotRate >= 85 ? "amber" 
    : "red"
  }
  // Change thresholds above to match new target
/>
```

## Troubleshooting

### Issue: All metrics show 0%

**Cause**: No closed tickets in the selected period

**Solution**: 
- Change period filter to include more data
- Verify tickets are actually closed (have close_date)

### Issue: Revision Rate is 0% but some drawings had revisions

**Cause**: Stage history not available (message tracking failed)

**Solution**:
- Check Odoo permissions for mail.message model
- Verify "Revision Required" stage name matches exactly
- Stage history only available for recent tickets

### Issue: DIFOT shows unexpected values

**Cause**: SLA data may be missing or incorrect in Odoo

**Solution**:
- Check if `sla_deadline` and `sla_reached_late` fields exist
- Falls back to 40 working hours if SLA unavailable
- Verify working hours calculation is correct

### Issue: First-Time Pass Rate doesn't equal 100% - Revision Rate

**Cause**: Rounding differences (both rounded to 1 decimal)

**Solution**: This is normal. Example:
- Revision Rate: 18.75% (rounds to 18.8%)
- First-Time Pass: 81.25% (rounds to 81.3%)
- 18.8% + 81.3% = 100.1% (rounding artifact)

## Future Enhancements

Potential improvements to consider:

1. **Revision Count**: Track number of times each ticket was revised
2. **Revision Reasons**: Categorize why revisions were required
3. **Time to Revision**: How long until first revision requested
4. **Revision Cycle Time**: Time spent in "Revision Required" stage
5. **Trend Charts**: Show quality metrics over time
6. **Benchmarking**: Compare against industry standards
7. **Team Comparison**: Compare quality metrics across teams
8. **Alerts**: Notify when DIFOT drops below threshold

## Summary

The automated quality metrics provide real-time, accurate insights into Shop Drawing quality and delivery performance:

- ✅ **Revision Rate**: Automatically tracks percentage of drawings needing rework
- ✅ **First-Time Pass Rate**: Highlights efficiency of initial submissions
- ✅ **DIFOT**: Measures on-time delivery performance against 95% target
- ✅ **Period Filtering**: Analyze by week, month, quarter, or year
- ✅ **Working Hours**: Uses business hours for realistic timelines
- ✅ **Transparency**: Shows ticket counts behind all percentages

These metrics help identify quality trends, improve processes, and demonstrate performance improvements over time.

