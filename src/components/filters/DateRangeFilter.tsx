import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFilters } from '@/contexts/FilterContext';
import { cn } from '@/lib/utils';

const datePresets = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'This Month', value: 'month' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'Last Quarter', value: 'lastQuarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Last Year', value: 'lastYear' },
  { label: 'Custom Range', value: 'custom' },
];

export function DateRangeFilter() {
  const { filters, setFilters } = useFilters();
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetChange = (value: string) => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = now;

    switch (value) {
      case 'all':
        startDate = null;
        endDate = null;
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'lastMonth':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        break;
      case 'quarter':
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        break;
      case 'lastQuarter':
        startDate = startOfQuarter(subQuarters(now, 1));
        endDate = endOfQuarter(subQuarters(now, 1));
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'lastYear':
        startDate = startOfYear(subYears(now, 1));
        endDate = endOfYear(subYears(now, 1));
        break;
      case 'custom':
        setShowCustom(true);
        return;
    }

    setShowCustom(false);
    setFilters({
      dateRange: { preset: value, startDate, endDate },
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={filters.dateRange.preset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[180px]">
          <CalendarIcon className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent>
          {datePresets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showCustom && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn('justify-start text-left font-normal')}>
              {filters.dateRange.startDate && filters.dateRange.endDate ? (
                <>
                  {format(filters.dateRange.startDate, 'PPP')} -{' '}
                  {format(filters.dateRange.endDate, 'PPP')}
                </>
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex gap-2 p-3">
              <div>
                <p className="text-sm font-medium mb-2">Start Date</p>
                <Calendar
                  mode="single"
                  selected={filters.dateRange.startDate || undefined}
                  onSelect={(date) =>
                    setFilters({
                      dateRange: {
                        ...filters.dateRange,
                        startDate: date || null,
                      },
                    })
                  }
                  className="pointer-events-auto"
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">End Date</p>
                <Calendar
                  mode="single"
                  selected={filters.dateRange.endDate || undefined}
                  onSelect={(date) =>
                    setFilters({
                      dateRange: {
                        ...filters.dateRange,
                        endDate: date || null,
                      },
                    })
                  }
                  className="pointer-events-auto"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
