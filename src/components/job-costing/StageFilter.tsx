import { useState } from "react";
import { Check, ChevronsUpDown, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { OdooProjectStage } from "@/hooks/useOdooProjectStages";

interface StageFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  stages: OdooProjectStage[];
  isLoading?: boolean;
}

export function StageFilter({ value, onChange, stages, isLoading }: StageFilterProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[180px] justify-between"
        >
          <span className="truncate">{value || "All Stages"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search stage..." />
          <CommandEmpty>
            {isLoading ? "Loading..." : "No stage found."}
          </CommandEmpty>
          <CommandGroup>
            <CommandItem
              value="all"
              onSelect={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  !value ? "opacity-100" : "opacity-0"
                )}
              />
              All Stages
            </CommandItem>
            {stages.map((stage) => (
              <CommandItem
                key={stage.id}
                value={stage.name}
                onSelect={() => {
                  onChange(stage.name);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === stage.name ? "opacity-100" : "opacity-0"
                  )}
                />
                {stage.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
        {value && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-xs"
              onClick={() => {
                onChange(null);
                setOpen(false);
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
