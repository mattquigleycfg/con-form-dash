import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo } from "react";
import { Job } from "@/hooks/useJobs";

interface ProjectManagerFilterProps {
  jobs: Job[] | undefined;
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ProjectManagerFilter({ jobs, value, onChange }: ProjectManagerFilterProps) {
  // Extract unique project managers from jobs
  const projectManagers = useMemo(() => {
    if (!jobs) return [];
    
    const managers = new Set<string>();
    jobs.forEach(job => {
      if (job.project_manager_name) {
        managers.add(job.project_manager_name);
      }
    });
    
    return Array.from(managers).sort();
  }, [jobs]);

  return (
    <Select
      value={value || "all"}
      onValueChange={(val) => onChange(val === "all" ? null : val)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="All Project Managers" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Project Managers</SelectItem>
        {projectManagers.map((manager) => (
          <SelectItem key={manager} value={manager}>
            {manager}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

