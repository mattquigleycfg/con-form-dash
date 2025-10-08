import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFilters } from '@/contexts/FilterContext';

export function SearchFilter() {
  const { filters, setFilters } = useFilters();
  const [localQuery, setLocalQuery] = useState(filters.searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ searchQuery: localQuery });
    }, 300);

    return () => clearTimeout(timer);
  }, [localQuery, setFilters]);

  const handleClear = () => {
    setLocalQuery('');
  };

  return (
    <div className="relative flex-1 max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search deals, customers, products..."
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        className="pl-9 pr-9"
      />
      {localQuery && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
