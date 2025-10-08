import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/contexts/FilterContext';
import { format } from 'date-fns';

export function FilterChips() {
  const { filters, setFilters, resetFilters, isFiltered } = useFilters();

  if (!isFiltered) return null;

  const removeFilter = (key: string) => {
    switch (key) {
      case 'dateRange':
        setFilters({ dateRange: { preset: 'all', startDate: null, endDate: null } });
        break;
      case 'opportunityStage':
        setFilters({ opportunityStage: [] });
        break;
      case 'dealStatus':
        setFilters({ dealStatus: [] });
        break;
      case 'salesRep':
        setFilters({ salesRep: [] });
        break;
      case 'dealValue':
        setFilters({ dealValue: { min: 0, max: 1000000 } });
        break;
      case 'probability':
        setFilters({ probability: { min: 0, max: 100 } });
        break;
      case 'searchQuery':
        setFilters({ searchQuery: '' });
        break;
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <span className="text-sm text-muted-foreground">Active filters:</span>

      {filters.dateRange.preset !== 'all' && (
        <Badge variant="secondary" className="gap-1">
          Date: {filters.dateRange.preset}
          {filters.dateRange.startDate && filters.dateRange.endDate && (
            <span className="ml-1">
              ({format(filters.dateRange.startDate, 'PP')} - {format(filters.dateRange.endDate, 'PP')})
            </span>
          )}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => removeFilter('dateRange')}
          />
        </Badge>
      )}

      {filters.opportunityStage.length > 0 && (
        <Badge variant="secondary" className="gap-1">
          Stages: {filters.opportunityStage.length}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => removeFilter('opportunityStage')}
          />
        </Badge>
      )}

      {filters.dealStatus.length > 0 && (
        <Badge variant="secondary" className="gap-1">
          Status: {filters.dealStatus.length}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => removeFilter('dealStatus')}
          />
        </Badge>
      )}

      {filters.salesRep.length > 0 && (
        <Badge variant="secondary" className="gap-1">
          Sales Reps: {filters.salesRep.length}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => removeFilter('salesRep')}
          />
        </Badge>
      )}

      {(filters.dealValue.min > 0 || filters.dealValue.max < 1000000) && (
        <Badge variant="secondary" className="gap-1">
          Deal Value: ${filters.dealValue.min.toLocaleString()} - ${filters.dealValue.max.toLocaleString()}
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => removeFilter('dealValue')}
          />
        </Badge>
      )}

      {(filters.probability.min > 0 || filters.probability.max < 100) && (
        <Badge variant="secondary" className="gap-1">
          Probability: {filters.probability.min}% - {filters.probability.max}%
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => removeFilter('probability')}
          />
        </Badge>
      )}

      {filters.searchQuery && (
        <Badge variant="secondary" className="gap-1">
          Search: "{filters.searchQuery}"
          <X
            className="h-3 w-3 cursor-pointer"
            onClick={() => removeFilter('searchQuery')}
          />
        </Badge>
      )}

      <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7">
        Clear All
      </Button>
    </div>
  );
}
