import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Job } from "@/hooks/useJobs";
import { format } from "date-fns";

interface ListViewProps {
  jobs: Job[];
  onJobClick: (jobId: string) => void;
}

export function ListView({ jobs, onJobClick }: ListViewProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Opportunity</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Confirmed Date</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead>Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const budgetUtilization = job.total_budget > 0 
              ? (job.total_actual / job.total_budget) * 100 
              : 0;
            
            const getStatusVariant = () => {
              if (budgetUtilization > 100) return "destructive";
              if (budgetUtilization > 80) return "default";
              return "secondary";
            };

            const getHealthColor = () => {
              if (budgetUtilization > 100) return "bg-red-500";
              if (budgetUtilization > 80) return "bg-yellow-500";
              return "bg-green-500";
            };

            return (
              <TableRow
                key={job.id}
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => onJobClick(job.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-2.5 h-2.5 rounded-full ${getHealthColor()} shadow-sm`}
                      title={budgetUtilization > 100 ? 'Over Budget' : budgetUtilization > 80 ? 'At Risk' : 'On Track'}
                    />
                    <span>{job.sale_order_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {job.opportunity_name || '-'}
                </TableCell>
                <TableCell>{job.customer_name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {job.project_stage_name || 'Unassigned'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {job.date_order ? format(new Date(job.date_order), "MMM d, yyyy") : '-'}
                </TableCell>
                <TableCell className="text-right">
                  ${job.total_budget.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ${job.total_actual.toLocaleString()}
                </TableCell>
                <TableCell className="w-[200px]">
                  <div className="space-y-1">
                    <Progress value={budgetUtilization} className="h-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        {budgetUtilization.toFixed(1)}%
                      </span>
                      <Badge 
                        variant={getStatusVariant()} 
                        className={`text-xs font-medium ${
                          budgetUtilization > 100 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                            : budgetUtilization > 80 
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}
                      >
                        {budgetUtilization > 100 ? 'Over' : budgetUtilization > 80 ? 'At Risk' : 'On Track'}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
