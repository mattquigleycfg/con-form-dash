import { Job } from "@/hooks/useJobs";
import { OdooProjectStage } from "@/hooks/useOdooProjectStages";
import { KanbanColumn } from "./KanbanColumn";
import { Skeleton } from "@/components/ui/skeleton";

interface KanbanViewProps {
  jobs: Job[];
  stages: OdooProjectStage[];
  isLoadingStages: boolean;
  onJobClick: (jobId: string) => void;
}

export function KanbanView({ jobs, stages, isLoadingStages, onJobClick }: KanbanViewProps) {
  // Group jobs by stage
  const jobsByStage = new Map<string, Job[]>();
  
  // Initialize with all stages
  stages.forEach(stage => {
    jobsByStage.set(stage.name, []);
  });
  
  // Add unassigned column
  jobsByStage.set('Unassigned', []);
  
  // Distribute jobs
  jobs.forEach(job => {
    const stageName = job.project_stage_name || 'Unassigned';
    if (!jobsByStage.has(stageName)) {
      jobsByStage.set(stageName, []);
    }
    jobsByStage.get(stageName)!.push(job);
  });

  if (isLoadingStages) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-80 flex-shrink-0">
            <Skeleton className="h-[600px] w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Render columns in sequence order
  const orderedStages = [
    'Unassigned',
    ...stages.map(s => s.name)
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {orderedStages.map((stageName) => {
        const stageJobs = jobsByStage.get(stageName) || [];
        return (
          <KanbanColumn
            key={stageName}
            stageName={stageName}
            jobs={stageJobs}
            onJobClick={onJobClick}
          />
        );
      })}
    </div>
  );
}
