import { useState } from "react";
import { Check, ChevronsUpDown, X, Truck } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface SubcontractorSelectorProps {
  value: { id: number; name: string } | null;
  onChange: (vendor: { id: number; name: string } | null) => void;
  disabled?: boolean;
}

export function SubcontractorSelector({ value, onChange, disabled }: SubcontractorSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: vendors, isLoading } = useOdooVendors(searchTerm);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="flex items-center gap-2">
      {value ? (
        <Badge variant="outline" className="gap-2 pr-1">
          <Truck className="h-3 w-3" />
          {value.name}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-transparent"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[300px] justify-between"
              disabled={disabled}
            >
              <span className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Select subcontractor...
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search vendors..."
                value={searchTerm}
                onValueChange={setSearchTerm}
              />
              <CommandEmpty>
                {searchTerm.length < 2
                  ? "Type at least 2 characters to search"
                  : isLoading
                  ? "Loading..."
                  : "No vendors found"}
              </CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {vendors?.map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={vendor.id.toString()}
                    onSelect={() => {
                      onChange({ id: vendor.id, name: vendor.name });
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === vendor.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{vendor.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[vendor.city, vendor.phone].filter(Boolean).join(" • ")}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

