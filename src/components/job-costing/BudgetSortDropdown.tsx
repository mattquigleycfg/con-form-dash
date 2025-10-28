import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BudgetSort } from "@/hooks/useJobFilters";

interface BudgetSortDropdownProps {
  value: BudgetSort;
  onChange: (value: BudgetSort) => void;
}

export function BudgetSortDropdown({ value, onChange }: BudgetSortDropdownProps) {
  return (
    <div className="flex flex-col gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by budget" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="high-low">Budget: High to Low</SelectItem>
          <SelectItem value="low-high">Budget: Low to High</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
