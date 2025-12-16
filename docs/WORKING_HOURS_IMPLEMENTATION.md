# Working Hours Implementation

## Overview

All hour-related metrics in the Con-form Dashboard now calculate **working hours** instead of total elapsed hours. This provides a more accurate representation of actual business time spent on tasks.

## What Changed

### Working Hours Definition
- **Working Days**: Monday through Friday only (excludes weekends)
- **Working Hours**: 9:00 AM - 5:00 PM (8 hours per working day)
- **Excluded Time**: Weekends, nights (before 9 AM / after 5 PM)

### Affected Metrics

All the following metrics now use working hours calculation:

1. **Shop Drawings Cycle Time** (`src/hooks/useShopDrawingCycleTime.ts`)
   - Overall average turnaround time
   - Time spent in each stage (New Drawings → Complete Drawings)
   - Per-ticket cycle times

2. **Helpdesk KPIs** (`src/hooks/useHelpdeskKPIs.ts`)
   - Average close time (`avgCloseHours`)
   - Average assignment time (`avgAssignHours`)
   - Applies to all helpdesk teams (Production, Design, Engineering, Finance, etc.)

3. **Design KPIs Page** (`src/pages/kpis/DesignKPIs.tsx`)
   - "Avg Turnaround" card
   - "Avg Close (hrs)" in Performance Summary
   - All stage breakdown hours in Cycle Time Analysis section

## Implementation Details

### Core Utility: `calculateWorkingHours()`

**Location**: `src/utils/workingHours.ts`

**Signature**:
```typescript
function calculateWorkingHours(
  startDate: string | Date,
  endDate: string | Date,
  config?: WorkingHoursConfig
): number
```

**How It Works**:
1. Iterates through each calendar day between start and end dates
2. Skips weekends (Saturday/Sunday)
3. For each working day:
   - Clamps times to working hours (9 AM - 5 PM)
   - Calculates hours within the working day
   - Caps at maximum 8 hours per day

### Examples

#### Example 1: Same Day
```typescript
// Monday 10:00 AM to Monday 3:00 PM
calculateWorkingHours('2024-01-08T10:00:00', '2024-01-08T15:00:00')
// Result: 5 hours
```

#### Example 2: Overnight
```typescript
// Monday 4:00 PM to Tuesday 10:00 AM
calculateWorkingHours('2024-01-08T16:00:00', '2024-01-09T10:00:00')
// Monday: 4 PM - 5 PM = 1 hour
// Tuesday: 9 AM - 10 AM = 1 hour
// Result: 2 hours
```

#### Example 3: Over Weekend
```typescript
// Friday 4:00 PM to Monday 10:00 AM
calculateWorkingHours('2024-01-05T16:00:00', '2024-01-08T10:00:00')
// Friday: 4 PM - 5 PM = 1 hour
// Saturday: 0 hours (weekend)
// Sunday: 0 hours (weekend)
// Monday: 9 AM - 10 AM = 1 hour
// Result: 2 hours
```

#### Example 4: Multi-Day
```typescript
// Wednesday 2:00 PM to Friday 11:00 AM
calculateWorkingHours('2024-01-03T14:00:00', '2024-01-05T11:00:00')
// Wednesday: 2 PM - 5 PM = 3 hours
// Thursday: 9 AM - 5 PM = 8 hours
// Friday: 9 AM - 11 AM = 2 hours
// Result: 13 hours (1.625 working days)
```

## Configuration

### Customizing Working Hours

If your organization has different working hours, update the configuration in `src/utils/workingHours.ts`:

```typescript
const DEFAULT_CONFIG: WorkingHoursConfig = {
  workDayStartHour: 9,      // Change to your start time (24-hour format)
  workDayEndHour: 17,       // Change to your end time (24-hour format)
  hoursPerWorkDay: 8,       // Total working hours per day
};
```

**Example for 8:30 AM - 5:30 PM (9 hours/day)**:
```typescript
const DEFAULT_CONFIG: WorkingHoursConfig = {
  workDayStartHour: 8,
  workDayEndHour: 17.5,     // 5:30 PM
  hoursPerWorkDay: 9,
};
```

### Adding Public Holidays

Currently, public holidays are **not** excluded. To add holiday support:

1. Create a list of holiday dates
2. Modify `isWeekend()` function to also check for holidays:

```typescript
const PUBLIC_HOLIDAYS = [
  '2024-01-01', // New Year's Day
  '2024-04-25', // ANZAC Day
  // ... add more
];

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  const dateStr = date.toISOString().split('T')[0];
  return day === 0 || day === 6 || PUBLIC_HOLIDAYS.includes(dateStr);
}
```

## Testing & Validation

### Manual Validation

To verify working hours calculations are correct:

1. **Pick a test ticket** from Odoo with known create/close dates
2. **Calculate manually**:
   ```
   Example: Created Monday 2 PM, Closed Wednesday 11 AM
   
   Monday:    2 PM → 5 PM     = 3 hours
   Tuesday:   9 AM → 5 PM     = 8 hours  
   Wednesday: 9 AM → 11 AM    = 2 hours
   Total:                     = 13 working hours
   ```
3. **Compare** with displayed metric in dashboard

### Automated Testing

Create unit tests for `calculateWorkingHours()`:

```typescript
describe('calculateWorkingHours', () => {
  it('calculates same-day hours correctly', () => {
    const result = calculateWorkingHours(
      '2024-01-08T10:00:00',  // Monday 10 AM
      '2024-01-08T15:00:00'   // Monday 3 PM
    );
    expect(result).toBe(5);
  });

  it('excludes weekends', () => {
    const result = calculateWorkingHours(
      '2024-01-05T16:00:00',  // Friday 4 PM
      '2024-01-08T10:00:00'   // Monday 10 AM
    );
    expect(result).toBe(2); // 1 hour Fri + 1 hour Mon
  });

  it('excludes after-hours time', () => {
    const result = calculateWorkingHours(
      '2024-01-08T08:00:00',  // Monday 8 AM (before work)
      '2024-01-08T18:00:00'   // Monday 6 PM (after work)
    );
    expect(result).toBe(8); // Full working day
  });
});
```

## Impact on Existing Data

### What Users Will See

After this change is deployed, all hour metrics will show **lower values** because:
- Weekends no longer count
- After-hours time no longer counts
- Only business hours (9 AM - 5 PM) are counted

### Example Impact

**Old Calculation** (Total Hours):
- Created: Friday 4 PM
- Closed: Monday 10 AM
- Total: 66 hours (2.75 days)

**New Calculation** (Working Hours):
- Created: Friday 4 PM
- Closed: Monday 10 AM  
- Working Hours: 2 hours (Friday 1h + Monday 1h)
- **Shows as: 2 hrs instead of 66 hrs**

This is **more accurate** for business metrics, as it reflects actual working time rather than elapsed calendar time.

## Comparison: Old vs New

| Metric | Old (Total Hours) | New (Working Hours) | Difference |
|--------|------------------|---------------------|------------|
| Avg Turnaround | 48.5 hrs | 18.2 hrs | -62% |
| Same-day ticket | 5 hrs | 5 hrs | 0% (no change) |
| Over weekend | 66 hrs | 2 hrs | -97% |
| Week-long ticket | 168 hrs | 40 hrs | -76% |

## Benefits

1. **More Accurate SLAs**: Reflects actual business hours, not clock time
2. **Fair Comparisons**: Tickets created on Friday aren't penalized for weekend time
3. **Better Resource Planning**: Shows actual work capacity needed
4. **Industry Standard**: Most organizations measure business metrics in working hours

## Utilities Provided

### Main Function
- `calculateWorkingHours(start, end)` - Calculate working hours between two dates

### Helper Functions
- `calculateWorkingDays(start, end)` - Count working days (excluding weekends)
- `formatWorkingHours(hours, showDays)` - Format hours for display (e.g., "2d 3h")
- `isWeekend(date)` - Check if date is Saturday or Sunday

## Future Enhancements

Potential improvements to consider:

1. **Public Holidays**: Add support for country-specific public holidays
2. **Team-Specific Hours**: Different working hours per team/department
3. **Timezone Support**: Handle tickets across multiple timezones
4. **Part-Time Hours**: Support for part-time schedules (e.g., 4-hour days)
5. **Shift Work**: Support for non-standard shifts (e.g., 24/7 operations)

## Questions?

For implementation questions or to customize working hours for your organization, refer to:
- `src/utils/workingHours.ts` - Core implementation
- `src/hooks/useShopDrawingCycleTime.ts` - Shop drawing cycle time
- `src/hooks/useHelpdeskKPIs.ts` - General helpdesk metrics

