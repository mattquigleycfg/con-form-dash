import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Job } from "@/hooks/useJobs";

interface SubcontractorFilterProps {
  jobs: Job[] | undefined;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function SubcontractorFilter({ jobs, value, onChange }: SubcontractorFilterProps) {
  // Extract unique subcontractors from jobs
  const subcontractors = Array.from(
    new Set(
      jobs
        ?.map((job) => job.subcontractor_name)
        .filter((name): name is string => !!name)
    )
  ).sort();

  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? null : v)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All Subcontractors" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Subcontractors</SelectItem>
        {subcontractors.map((subcontractor) => (
          <SelectItem key={subcontractor} value={subcontractor}>
            {subcontractor}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

