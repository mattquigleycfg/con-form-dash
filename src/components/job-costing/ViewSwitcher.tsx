import { Button } from "@/components/ui/button";
import { List, Columns3, Grid3x3 } from "lucide-react";
import { ViewMode } from "@/hooks/useJobFilters";

interface ViewSwitcherProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewSwitcher({ view, onChange }: ViewSwitcherProps) {
  return (
    <div className="flex gap-1 border rounded-md p-1">
      <Button
        variant={view === 'list' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('list')}
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'kanban' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('kanban')}
        className="h-8 w-8 p-0"
      >
        <Columns3 className="h-4 w-4" />
      </Button>
      <Button
        variant={view === 'grid' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => onChange('grid')}
        className="h-8 w-8 p-0"
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>
    </div>
  );
}
