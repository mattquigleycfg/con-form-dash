import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Job } from "@/hooks/useJobs";

interface SalesPersonFilterProps {
  jobs: Job[] | undefined;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function SalesPersonFilter({ jobs, value, onChange }: SalesPersonFilterProps) {
  // Extract unique sales persons from jobs
  const salesPersons = Array.from(
    new Set(
      jobs
        ?.map((job) => job.sales_person_name)
        .filter((name): name is string => !!name)
    )
  ).sort();

  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? null : v)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All Sales Persons" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Sales Persons</SelectItem>
        {salesPersons.map((person) => (
          <SelectItem key={person} value={person}>
            {person}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

