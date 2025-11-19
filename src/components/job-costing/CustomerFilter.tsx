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
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Job } from "@/hooks/useJobs";
import { Badge } from "@/components/ui/badge";

interface CustomerFilterProps {
  jobs: Job[] | undefined;
  value: string[];  // Changed to array for multi-select
  onChange: (value: string[]) => void;
}

export function CustomerFilter({ jobs, value, onChange }: CustomerFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Extract unique customers from jobs
  const customers = useMemo(() => {
    return Array.from(
      new Set(jobs?.map((job) => job.customer_name).filter((name): name is string => !!name))
    ).sort();
  }, [jobs]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    return customers.filter((customer) =>
      customer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const toggleCustomer = (customer: string) => {
    if (value.includes(customer)) {
      onChange(value.filter((c) => c !== customer));
    } else {
      onChange([...value, customer]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setSearchTerm("");
  };

  const getDisplayValue = () => {
    if (value.length === 0) return "All Customers";
    if (value.length === 1) return value[0];
    return `${value.length} customers`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <span className="truncate">{getDisplayValue()}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Search customers..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>No customer found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredCustomers.map((customer) => (
              <CommandItem
                key={customer}
                value={customer}
                onSelect={() => toggleCustomer(customer)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value.includes(customer) ? "opacity-100" : "opacity-0"
                  )}
                />
                {customer}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
        {value.length > 0 && (
          <div className="p-2 border-t space-y-2">
            <div className="flex flex-wrap gap-1">
              {value.map((customer) => (
                <Badge
                  key={customer}
                  variant="secondary"
                  className="text-xs"
                >
                  {customer.length > 15 ? `${customer.substring(0, 15)}...` : customer}
                  <button
                    className="ml-1 hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleCustomer(customer);
                    }}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-xs"
              onClick={clearAll}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Clear All ({value.length})
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

