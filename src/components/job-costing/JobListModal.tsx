import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Job } from "@/hooks/useJobs";

interface JobListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Job[];
  title: string;
  variant: "overBudget" | "atRisk";
}

export function JobListModal({
  open,
  onOpenChange,
  jobs,
  title,
  variant,
}: JobListModalProps) {
  const enrichedJobs = useMemo(
    () =>
      jobs.map((job) => {
        const utilization =
          job.total_budget > 0
            ? (job.total_actual / job.total_budget) * 100
            : 0;
        const variance = job.total_actual - job.total_budget;
        return { ...job, utilization, variance };
      }),
    [jobs]
  );

  const accentColor =
    variant === "overBudget" ? "text-red-600" : "text-yellow-600";
  const badgeVariant =
    variant === "overBudget" ? "destructive" : ("secondary" as const);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={accentColor}>{title}</span>
            <Badge variant={badgeVariant}>{jobs.length} jobs</Badge>
          </DialogTitle>
          <DialogDescription>
            {variant === "overBudget"
              ? "Jobs where actual costs have exceeded the total budget (utilization > 100%)."
              : "Jobs approaching their budget limit (utilization between 80% and 100%)."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {enrichedJobs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No jobs found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Opportunity</TableHead>
                  <TableHead className="text-right">Budget</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Utilization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {job.sale_order_name}
                    </TableCell>
                    <TableCell>{job.customer_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {job.opportunity_name || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      ${job.total_budget.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      ${job.total_actual.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        job.variance > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {job.variance > 0 ? "+" : ""}$
                      {job.variance.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          job.utilization > 100 ? "destructive" : "secondary"
                        }
                        className={
                          job.utilization <= 100
                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200"
                            : ""
                        }
                      >
                        {job.utilization.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
