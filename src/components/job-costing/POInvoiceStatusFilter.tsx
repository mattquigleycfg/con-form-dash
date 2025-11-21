import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface POInvoiceStatusFilterProps {
  value: string | null;
  onChange: (value: string | null) => void;
  jobCounts?: {
    no: number;
    toInvoice: number;
    invoiced: number;
  };
}

export function POInvoiceStatusFilter({ value, onChange, jobCounts }: POInvoiceStatusFilterProps) {
  const handleValueChange = (newValue: string) => {
    if (newValue === "all") {
      onChange(null);
    } else {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">PO Invoice Status</label>
      <Select value={value || "all"} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All Jobs" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center justify-between w-full">
              <span>All Jobs</span>
            </div>
          </SelectItem>
          <SelectItem value="no">
            <div className="flex items-center gap-2">
              <span>No Invoice</span>
              {jobCounts && (
                <Badge variant="secondary" className="ml-auto">
                  {jobCounts.no}
                </Badge>
              )}
            </div>
          </SelectItem>
          <SelectItem value="to invoice">
            <div className="flex items-center gap-2">
              <span>Waiting Bills</span>
              {jobCounts && (
                <Badge variant="secondary" className="ml-auto">
                  {jobCounts.toInvoice}
                </Badge>
              )}
            </div>
          </SelectItem>
          <SelectItem value="invoiced">
            <div className="flex items-center gap-2">
              <span>Fully Invoiced</span>
              {jobCounts && (
                <Badge variant="secondary" className="ml-auto">
                  {jobCounts.invoiced}
                </Badge>
              )}
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

