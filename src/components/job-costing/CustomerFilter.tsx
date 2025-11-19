import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Job } from "@/hooks/useJobs";

interface CustomerFilterProps {
  jobs: Job[] | undefined;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function CustomerFilter({ jobs, value, onChange }: CustomerFilterProps) {
  // Extract unique customers from jobs
  const customers = Array.from(
    new Set(jobs?.map((job) => job.customer_name).filter((name): name is string => !!name))
  ).sort();

  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? null : v)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All Customers" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        <SelectItem value="all">All Customers</SelectItem>
        {customers.map((customer) => (
          <SelectItem key={customer} value={customer}>
            {customer}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

