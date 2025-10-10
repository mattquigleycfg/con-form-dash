import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DateRangeFilter } from './DateRangeFilter';
import { SearchFilter } from './SearchFilter';
import { FilterChips } from './FilterChips';
import { FilterTemplates } from './FilterTemplates';
import { MultiSelectFilter } from './MultiSelectFilter';
import { RangeSliderFilter } from './RangeSliderFilter';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useFilters } from '@/contexts/FilterContext';
import { useOdooStages } from '@/hooks/useOdooStages';
import { Skeleton } from '@/components/ui/skeleton';

const DEAL_STATUS = [
  { value: 'sale', label: 'Open' },
  { value: 'done', label: 'Won' },
  { value: 'cancel', label: 'Lost' },
];

export function FilterBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { filters, setFilters, isFiltered } = useFilters();
  const { stages, isLoading: stagesLoading } = useOdooStages();

  const opportunityStages = stages.map(stage => ({
    value: stage.name,
    label: stage.name
  }));

  return (
    <Card className="sticky top-0 z-10 shadow-md">
      <div className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <SearchFilter />
          <DateRangeFilter />
          
          {/* Deal Status Filter */}
          <MultiSelectFilter
            label="Deal Status"
            options={DEAL_STATUS}
            selected={filters.dealStatus}
            onChange={(selected) => setFilters({ dealStatus: selected })}
            placeholder="All statuses"
          />
          
          <FilterTemplates />
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
                <SheetDescription>
                  Configure detailed filters for your sales data
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                <div className="space-y-6 pr-4">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Opportunity Stage</h3>
                    {stagesLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <MultiSelectFilter
                        label="Stages"
                        options={opportunityStages}
                        selected={filters.opportunityStage}
                        onChange={(selected) => setFilters({ opportunityStage: selected })}
                        placeholder="Select stages..."
                      />
                    )}
                  </div>

                  <Separator />

                  <div>
                    <RangeSliderFilter
                      label="Deal Value"
                      min={0}
                      max={1000000}
                      step={1000}
                      value={filters.dealValue}
                      onChange={(value) => setFilters({ dealValue: value })}
                      formatValue={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                  </div>

                  <Separator />

                  <div>
                    <RangeSliderFilter
                      label="Probability (%)"
                      min={0}
                      max={100}
                      step={5}
                      value={filters.probability}
                      onChange={(value) => setFilters({ probability: value })}
                      formatValue={(v) => `${v}%`}
                    />
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FilterChips />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {!isExpanded && <FilterChips />}
      </div>
    </Card>
  );
}
