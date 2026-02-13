import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOdooProjectManagers } from "@/hooks/useOdooProjectManagers";

interface ProjectManagerFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  /** PM names already assigned to jobs - these always appear in the dropdown */
  jobPMNames?: string[];
}

export function ProjectManagerFilter({ value, onChange, jobPMNames = [] }: ProjectManagerFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: managers, isLoading } = useOdooProjectManagers(searchTerm);

  // Merge Odoo users with PM names from actual jobs to ensure all assigned PMs are selectable
  const mergedManagers = useMemo(() => {
    const odooNames = new Set((managers || []).map(m => m.name));
    const combined = [...(managers || [])];

    // Add PM names from jobs that aren't already in the Odoo user list
    for (const pmName of jobPMNames) {
      if (pmName && !odooNames.has(pmName)) {
        combined.push({ id: -1, name: pmName, login: '', email: false, phone: false });
        odooNames.add(pmName);
      }
    }

    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [managers, jobPMNames]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value || "All Project Managers"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder="Search manager..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading..." : "No manager found."}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                  setSearchTerm("");
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                All Project Managers
              </CommandItem>
              {mergedManagers.map((manager, idx) => (
                <CommandItem
                  key={manager.id !== -1 ? manager.id : `job-pm-${idx}`}
                  value={manager.name}
                  onSelect={() => {
                    onChange(value === manager.name ? null : manager.name);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === manager.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div>
                    <div className="font-medium">{manager.name}</div>
                    {manager.email && (
                      <div className="text-xs text-muted-foreground">
                        {manager.email}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        {value && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-xs"
              onClick={() => {
                onChange(null);
                setOpen(false);
                setSearchTerm("");
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Clear Filter
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

