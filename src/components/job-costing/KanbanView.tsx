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
  // Expected stage names as ordered list
  const expectedStageNames = [
    "Operation paperwork",
    "Waiting on Information",
    "Preproduction",
    "Production",
    "Ready to Despatch",
    "Despatched",
    "Installation",
    "Rework",
    "Project Closeout",
    "Invoice/Completed"
  ];

  // Use fetched stages if available, otherwise use expected names
  const stageList = stages.length > 0 
    ? stages.map(s => s.name)
    : expectedStageNames;

  // Create ordered stage list starting with Unassigned
  // Use Set to ensure uniqueness, then convert back to array
  const uniqueStages = Array.from(new Set(stageList));
  const orderedStages = ['Unassigned', ...uniqueStages];

  // Group jobs by stage
  const jobsByStage = new Map<string, Job[]>();
  
  // Initialize map with all ordered stages
  orderedStages.forEach(stageName => {
    jobsByStage.set(stageName, []);
  });
  
  // Distribute jobs into stages
  jobs.forEach(job => {
    const stageName = job.project_stage_name || 'Unassigned';
    
    // If this stage doesn't exist in our ordered list, add it at the end
    if (!jobsByStage.has(stageName)) {
      orderedStages.push(stageName);
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
