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
  // Expected stage names as fallback
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

  // Group jobs by stage
  const jobsByStage = new Map<string, Job[]>();
  
  // Use fetched stages or fallback to expected names
  const activeStages = stages.length > 0 ? stages : expectedStageNames.map((name, index) => ({
    id: index,
    name,
    sequence: index,
    fold: false
  }));
  
  // Initialize with all stages
  activeStages.forEach(stage => {
    const stageName = typeof stage === 'string' ? stage : stage.name;
    jobsByStage.set(stageName, []);
  });
  
  // Add unassigned column
  jobsByStage.set('Unassigned', []);
  
  // Distribute jobs
  jobs.forEach(job => {
    const stageName = job.project_stage_name || 'Unassigned';
    if (!jobsByStage.has(stageName)) {
      // If job has a stage not in our list, create it
      jobsByStage.set(stageName, []);
    }
    jobsByStage.get(stageName)!.push(job);
  });

  console.log('Kanban view - Stages:', activeStages.map(s => typeof s === 'string' ? s : s.name));
  console.log('Kanban view - Jobs by stage:', Array.from(jobsByStage.entries()).map(([stage, jobs]) => `${stage}: ${jobs.length}`));

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
    ...activeStages.map(s => typeof s === 'string' ? s : s.name)
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
