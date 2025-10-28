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

            return (
              <TableRow
                key={job.id}
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => onJobClick(job.id)}
              >
                <TableCell className="font-medium">
                  {job.sale_order_name}
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
                      <Badge variant={getStatusVariant()} className="text-xs">
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
