import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Job } from "@/hooks/useJobs";
import { format } from "date-fns";

interface JobCardProps {
  job: Job;
  onClick: () => void;
  compact?: boolean;
}

export function JobCard({ job, onClick, compact = false }: JobCardProps) {
  const budgetUtilization = job.total_budget > 0 
    ? (job.total_actual / job.total_budget) * 100 
    : 0;

  const getStatusColor = () => {
    if (budgetUtilization < 80) return "bg-success";
    if (budgetUtilization < 100) return "bg-warning";
    return "bg-destructive";
  };

  const getStatusLabel = () => {
    if (budgetUtilization < 80) return "On Track";
    if (budgetUtilization < 100) return "At Risk";
    return "Over Budget";
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardHeader className={compact ? "pb-3" : "pb-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {job.sale_order_name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {job.customer_name}
            </p>
          </div>
          <Badge variant={budgetUtilization > 100 ? "destructive" : "secondary"} className="text-xs shrink-0">
            {getStatusLabel()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : ""}>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium">
                ${job.total_budget.toLocaleString()}
              </span>
            </div>
            <Progress value={budgetUtilization} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              ${job.total_actual.toLocaleString()} / ${job.total_budget.toLocaleString()}
            </p>
          </div>
          
          {!compact && job.date_order && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Confirmed</span>
              <span>{format(new Date(job.date_order), "MMM d, yyyy")}</span>
            </div>
          )}
          
          {job.project_stage_name && job.project_stage_name !== 'Unassigned' && (
            <Badge variant="outline" className="text-xs">
              {job.project_stage_name}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
