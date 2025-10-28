import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "@/hooks/useJobFilters";

interface DateRangeFilterComponentProps {
  dateRange: DateRange | null;
  onChange: (range: DateRange | null) => void;
}

export function DateRangeFilterComponent({ dateRange, onChange }: DateRangeFilterComponentProps) {
  const [showCustomRange, setShowCustomRange] = useState(false);

  const datePresets = [
    { label: "Last 7 Days", value: "7days" },
    { label: "Last 30 Days", value: "30days" },
    { label: "Last 3 Months", value: "3months" },
    { label: "Last 6 Months", value: "6months" },
    { label: "This Year", value: "year" },
    { label: "All Time", value: "all" },
    { label: "Custom Range", value: "custom" },
  ];

  const handlePresetChange = (value: string) => {
    const now = new Date();
    let start = new Date();

    if (value === "all") {
      onChange(null);
      setShowCustomRange(false);
      return;
    }

    if (value === "custom") {
      setShowCustomRange(true);
      return;
    }

    setShowCustomRange(false);

    switch (value) {
      case "7days":
        start.setDate(now.getDate() - 7);
        break;
      case "30days":
        start.setDate(now.getDate() - 30);
        break;
      case "3months":
        start.setMonth(now.getMonth() - 3);
        break;
      case "6months":
        start.setMonth(now.getMonth() - 6);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        break;
    }

    onChange({ start, end: now });
  };

  return (
    <div className="flex flex-col gap-2">
      <Select onValueChange={handlePresetChange} defaultValue="3months">
        <SelectTrigger className="w-[200px]">
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

      {showCustomRange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.start && dateRange?.end ? (
                <>
                  {format(dateRange.start, "MMM d, yyyy")} - {format(dateRange.end, "MMM d, yyyy")}
                </>
              ) : (
                <span>Pick date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex gap-2 p-3">
              <div>
                <p className="text-sm font-medium mb-2">Start Date</p>
                <Calendar
                  mode="single"
                  selected={dateRange?.start}
                  onSelect={(date) => date && onChange({ start: date, end: dateRange?.end || new Date() })}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">End Date</p>
                <Calendar
                  mode="single"
                  selected={dateRange?.end}
                  onSelect={(date) => date && dateRange?.start && onChange({ start: dateRange.start, end: date })}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
