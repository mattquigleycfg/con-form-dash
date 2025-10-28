import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Job } from "@/hooks/useJobs";
import { JobCard } from "./JobCard";

interface KanbanColumnProps {
  stageName: string;
  jobs: Job[];
  onJobClick: (jobId: string) => void;
}

export function KanbanColumn({ stageName, jobs, onJobClick }: KanbanColumnProps) {
  const totalBudget = jobs.reduce((sum, job) => sum + job.total_budget, 0);

  return (
    <div className="flex-shrink-0 w-80">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {stageName}
            </CardTitle>
            <Badge variant="secondary" className="ml-2">
              {jobs.length}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Total: ${totalBudget.toLocaleString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No jobs in this stage
            </p>
          ) : (
            jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onClick={() => onJobClick(job.id)}
                compact
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
