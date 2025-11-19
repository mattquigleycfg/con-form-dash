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
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOdooConsumableProducts } from "@/hooks/useOdooConsumableProducts";

interface ProductCategoryFilterProps {
  value: string | null; // Changed to support both category and specific product
  onChange: (value: string | null) => void;
}

export function ProductCategoryFilter({ value, onChange }: ProductCategoryFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: products, isLoading } = useOdooConsumableProducts(searchTerm);

  // Determine display value
  const getDisplayValue = () => {
    if (!value) return "All Products";
    if (value === "material") return "Materials Only";
    if (value === "service") return "Services Only";
    if (value === "consumable") return "Consumables Only";
    // If it's a specific product name, show it
    return value;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[220px] justify-between"
        >
          <span className="truncate">{getDisplayValue()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0">
        <Command>
          <CommandInput
            placeholder="Search products..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>
            {isLoading ? "Loading..." : "No product found."}
          </CommandEmpty>
          <CommandGroup heading="Categories">
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
              All Products
            </CommandItem>
            <CommandItem
              value="material"
              onSelect={() => {
                onChange("material");
                setOpen(false);
                setSearchTerm("");
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === "material" ? "opacity-100" : "opacity-0"
                )}
              />
              Materials Only
            </CommandItem>
            <CommandItem
              value="service"
              onSelect={() => {
                onChange("service");
                setOpen(false);
                setSearchTerm("");
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === "service" ? "opacity-100" : "opacity-0"
                )}
              />
              Services Only
            </CommandItem>
            <CommandItem
              value="consumable"
              onSelect={() => {
                onChange("consumable");
                setOpen(false);
                setSearchTerm("");
              }}
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === "consumable" ? "opacity-100" : "opacity-0"
                )}
              />
              Consumables Only
            </CommandItem>
          </CommandGroup>
          {products && products.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Specific Consumable Products">
                {products.map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={() => {
                      onChange(product.name);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === product.name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <div className="font-medium text-xs">{product.name}</div>
                      {product.default_code && (
                        <div className="text-xs text-muted-foreground">
                          Code: {product.default_code}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
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

