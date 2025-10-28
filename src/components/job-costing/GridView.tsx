import { Job } from "@/hooks/useJobs";
import { JobCard } from "./JobCard";

interface GridViewProps {
  jobs: Job[];
  onJobClick: (jobId: string) => void;
}

export function GridView({ jobs, onJobClick }: GridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onClick={() => onJobClick(job.id)}
        />
      ))}
    </div>
  );
}
