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
import { useOdooVendors } from "@/hooks/useOdooVendors";

interface SubcontractorFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function SubcontractorFilter({ value, onChange }: SubcontractorFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: vendors, isLoading } = useOdooVendors(searchTerm);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          {value || "All Subcontractors"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput
            placeholder="Search vendor..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>
            {isLoading ? "Loading..." : "No vendor found."}
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
              All Subcontractors
            </CommandItem>
            {vendors?.map((vendor) => (
              <CommandItem
                key={vendor.id}
                value={vendor.name}
                onSelect={() => {
                  onChange(vendor.name);
                  setOpen(false);
                  setSearchTerm("");
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === vendor.name ? "opacity-100" : "opacity-0"
                  )}
                />
                <div>
                  <div className="font-medium">{vendor.name}</div>
                  {(vendor.city || vendor.phone) && (
                    <div className="text-xs text-muted-foreground">
                      {vendor.city && `${vendor.city}`}
                      {vendor.city && vendor.phone && " | "}
                      {vendor.phone && `${vendor.phone}`}
                    </div>
                  )}
                </div>
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

