import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AdvancedFilters, PRIORITY_OPTIONS, STATUS_OPTIONS } from "@/types/filters";
import { countActiveFilters, saveFiltersToStorage, loadFiltersFromStorage, clearFiltersFromStorage } from "@/utils/filterHelpers";
import { useOdooUsers } from "@/hooks/useOdooUsers";
import { MultiSelectFilter } from "./MultiSelectFilter";

interface AdvancedFilterBarProps {
  storageKey: string;
  availableTeams: { value: string; label: string }[];
  onFiltersChange: (filters: AdvancedFilters) => void;
  className?: string;
}

export function AdvancedFilterBar({
  storageKey,
  availableTeams,
  onFiltersChange,
  className,
}: AdvancedFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>({});
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  
  const { data: users, isLoading: isLoadingUsers } = useOdooUsers();

  // Load saved filters on mount
  useEffect(() => {
    const saved = loadFiltersFromStorage(storageKey);
    if (saved) {
      setFilters(saved);
      onFiltersChange(saved);
      if (countActiveFilters(saved) > 0) {
        setIsExpanded(true);
      }
    }
  }, [storageKey]);

  // Save filters when they change
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      saveFiltersToStorage(storageKey, filters);
    }
  }, [filters, storageKey]);

  const handleDateRangeChange = (start: Date | undefined, end: Date | undefined) => {
    if (start && end) {
      const newFilters = { ...filters, dateRange: { start, end } };
      setFilters(newFilters);
      onFiltersChange(newFilters);
      setDateRangeOpen(false);
    }
  };

  const handleAssignedToChange = (selected: string[]) => {
    const newFilters = { ...filters, assignedTo: selected.length > 0 ? selected : undefined };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleTeamsChange = (selected: string[]) => {
    const newFilters = { ...filters, teams: selected.length > 0 ? selected : undefined };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handlePriorityToggle = (value: string) => {
    const current = filters.priority || [];
    const newPriority = current.includes(value)
      ? current.filter((p) => p !== value)
      : [...current, value];
    
    const newFilters = { ...filters, priority: newPriority.length > 0 ? newPriority : undefined };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleStatusToggle = (value: 'open' | 'closed' | 'overdue') => {
    const current = filters.status || [];
    const newStatus = current.includes(value)
      ? current.filter((s) => s !== value)
      : [...current, value];
    
    const newFilters = { ...filters, status: newStatus.length > 0 ? newStatus : undefined };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    setFilters({});
    onFiltersChange({});
    clearFiltersFromStorage(storageKey);
  };

  const activeCount = countActiveFilters(filters);

  const userOptions = users?.map((user) => ({
    value: String(user.id),
    label: user.name,
  })) || [];

  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            className="flex items-center gap-2 font-semibold"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeCount}
              </Badge>
            )}
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
          
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="space-y-4 border-t pt-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !filters.dateRange && "text-muted-foreground"
                    )}
                  >
                    {filters.dateRange ? (
                      <>
                        {format(filters.dateRange.start, "MMM d, yyyy")} →{" "}
                        {format(filters.dateRange.end, "MMM d, yyyy")}
                      </>
                    ) : (
                      "Select date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex gap-2 p-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Start Date</p>
                      <Calendar
                        mode="single"
                        selected={filters.dateRange?.start}
                        onSelect={(date) => {
                          if (date) {
                            handleDateRangeChange(date, filters.dateRange?.end || date);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">End Date</p>
                      <Calendar
                        mode="single"
                        selected={filters.dateRange?.end}
                        onSelect={(date) => {
                          if (date) {
                            handleDateRangeChange(filters.dateRange?.start || date, date);
                          }
                        }}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Assigned To */}
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <MultiSelectFilter
                options={userOptions}
                selected={filters.assignedTo || []}
                onChange={handleAssignedToChange}
                placeholder={isLoadingUsers ? "Loading users..." : "Select users..."}
                disabled={isLoadingUsers}
              />
            </div>

            {/* Teams */}
            {availableTeams.length > 0 && (
              <div className="space-y-2">
                <Label>Teams</Label>
                <MultiSelectFilter
                  options={availableTeams}
                  selected={filters.teams || []}
                  onChange={handleTeamsChange}
                  placeholder="Select teams..."
                />
              </div>
            )}

            {/* Priority */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <div className="flex flex-wrap gap-3">
                {PRIORITY_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`priority-${option.value}`}
                      checked={filters.priority?.includes(option.value)}
                      onCheckedChange={() => handlePriorityToggle(option.value)}
                    />
                    <Label
                      htmlFor={`priority-${option.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-3">
                {STATUS_OPTIONS.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={filters.status?.includes(option.value as any)}
                      onCheckedChange={() => handleStatusToggle(option.value as any)}
                    />
                    <Label
                      htmlFor={`status-${option.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Summary (when collapsed) */}
        {!isExpanded && activeCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.dateRange && (
              <Badge variant="secondary">
                {format(filters.dateRange.start, "MMM d")} - {format(filters.dateRange.end, "MMM d")}
              </Badge>
            )}
            {filters.assignedTo && filters.assignedTo.length > 0 && (
              <Badge variant="secondary">
                {filters.assignedTo.length} user{filters.assignedTo.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {filters.teams && filters.teams.length > 0 && (
              <Badge variant="secondary">
                {filters.teams.length} team{filters.teams.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {filters.priority && filters.priority.length > 0 && (
              <Badge variant="secondary">
                {filters.priority.length} priority
              </Badge>
            )}
            {filters.status && filters.status.length > 0 && (
              <Badge variant="secondary">
                {filters.status.length} status
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

