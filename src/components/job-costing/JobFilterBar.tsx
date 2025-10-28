import { DateRangeFilterComponent } from "./DateRangeFilterComponent";
import { BudgetSortDropdown } from "./BudgetSortDropdown";
import { ViewSwitcher } from "./ViewSwitcher";
import { DateRange, ViewMode, BudgetSort } from "@/hooks/useJobFilters";

interface JobFilterBarProps {
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
  budgetSort: BudgetSort;
  onBudgetSortChange: (sort: BudgetSort) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function JobFilterBar({
  dateRange,
  onDateRangeChange,
  budgetSort,
  onBudgetSortChange,
  view,
  onViewChange,
}: JobFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-4 items-start">
      <div>
        <label className="text-sm font-medium mb-2 block">Confirmation Date</label>
        <DateRangeFilterComponent
          dateRange={dateRange}
          onChange={onDateRangeChange}
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Sort By</label>
        <BudgetSortDropdown
          value={budgetSort}
          onChange={onBudgetSortChange}
        />
      </div>
      
      <div className="ml-auto">
        <label className="text-sm font-medium mb-2 block">View</label>
        <ViewSwitcher view={view} onChange={onViewChange} />
      </div>
    </div>
  );
}
