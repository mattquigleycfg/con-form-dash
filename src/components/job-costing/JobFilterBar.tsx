import { Search, AlertTriangle, TrendingUp, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRangeFilterComponent } from "./DateRangeFilterComponent";
import { BudgetSortDropdown } from "./BudgetSortDropdown";
import { ViewSwitcher } from "./ViewSwitcher";
import { ProjectManagerFilter } from "./ProjectManagerFilter";
import { SubcontractorFilter } from "./SubcontractorFilter";
import { StageFilter } from "./StageFilter";
import { DateRange, ViewMode, BudgetSort, BudgetFilter } from "@/hooks/useJobFilters";
import type { OdooProjectStage } from "@/hooks/useOdooProjectStages";

interface JobFilterBarProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
  budgetSort: BudgetSort;
  onBudgetSortChange: (sort: BudgetSort) => void;
  budgetFilter: BudgetFilter;
  onBudgetFilterChange: (filter: BudgetFilter) => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  projectManager: string | null;
  onProjectManagerChange: (manager: string | null) => void;
  stage: string | null;
  onStageChange: (stage: string | null) => void;
  stages: OdooProjectStage[];
  isLoadingStages: boolean;
  subcontractor: string | null;
  onSubcontractorChange: (subcontractor: string | null) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export function JobFilterBar({
  searchTerm,
  onSearchTermChange,
  dateRange,
  onDateRangeChange,
  budgetSort,
  onBudgetSortChange,
  budgetFilter,
  onBudgetFilterChange,
  view,
  onViewChange,
  projectManager,
  onProjectManagerChange,
  stage,
  onStageChange,
  stages,
  isLoadingStages,
  subcontractor,
  onSubcontractorChange,
  onClearAll,
  hasActiveFilters,
}: JobFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="relative w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by SO, customer, opportunity..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Date Filter */}
      <DateRangeFilterComponent
        dateRange={dateRange}
        onChange={onDateRangeChange}
      />

      {/* Over Budget Toggle */}
      <Button
        variant={budgetFilter === "overBudget" ? "default" : "outline"}
        size="sm"
        onClick={() =>
          onBudgetFilterChange(budgetFilter === "overBudget" ? "all" : "overBudget")
        }
        className={
          budgetFilter === "overBudget"
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "hover:border-red-300 hover:text-red-600"
        }
      >
        <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
        Over Budget
      </Button>

      {/* At Risk Toggle */}
      <Button
        variant={budgetFilter === "atRisk" ? "default" : "outline"}
        size="sm"
        onClick={() =>
          onBudgetFilterChange(budgetFilter === "atRisk" ? "all" : "atRisk")
        }
        className={
          budgetFilter === "atRisk"
            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
            : "hover:border-yellow-300 hover:text-yellow-600"
        }
      >
        <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
        At Risk
      </Button>

      {/* Stage Filter */}
      <StageFilter
        value={stage}
        onChange={onStageChange}
        stages={stages}
        isLoading={isLoadingStages}
      />

      {/* Subcontractor Filter */}
      <SubcontractorFilter
        value={subcontractor}
        onChange={onSubcontractorChange}
      />

      {/* Project Manager Filter */}
      <ProjectManagerFilter
        value={projectManager}
        onChange={onProjectManagerChange}
      />

      {/* Sort By */}
      <BudgetSortDropdown
        value={budgetSort}
        onChange={onBudgetSortChange}
      />

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearAll}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 decoration-muted-foreground/40 hover:decoration-foreground/60 px-1 py-0.5"
        >
          <X className="h-3 w-3" />
          Clear filters
        </button>
      )}

      {/* View Switcher - pushed to far right */}
      <div className="ml-auto">
        <ViewSwitcher view={view} onChange={onViewChange} />
      </div>
    </div>
  );
}
