import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useJobs } from "@/hooks/useJobs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export default function JobCostingReports() {
  const navigate = useNavigate();
  const { jobs, isLoading } = useJobs();

  const totalBudget = jobs?.reduce((sum, job) => sum + job.total_budget, 0) || 0;
  const totalActual = jobs?.reduce((sum, job) => sum + job.total_actual, 0) || 0;
  const totalMaterialBudget = jobs?.reduce((sum, job) => sum + job.material_budget, 0) || 0;
  const totalMaterialActual = jobs?.reduce((sum, job) => sum + job.material_actual, 0) || 0;
  const totalNonMaterialBudget = jobs?.reduce((sum, job) => sum + job.non_material_budget, 0) || 0;
  const totalNonMaterialActual = jobs?.reduce((sum, job) => sum + job.non_material_actual, 0) || 0;

  const overallPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const materialPercentage = totalMaterialBudget > 0 ? (totalMaterialActual / totalMaterialBudget) * 100 : 0;
  const nonMaterialPercentage = totalNonMaterialBudget > 0 ? (totalNonMaterialActual / totalNonMaterialBudget) * 100 : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/job-costing")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Job Costing Reports</h1>
            <p className="text-muted-foreground mt-1">Consolidated view of all jobs</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Total Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">{formatCurrency(totalBudget)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual:</span>
                  <span className="font-medium">{formatCurrency(totalActual)}</span>
                </div>
                <Progress value={overallPercentage} className="mt-2" />
                <div className="text-xs text-muted-foreground text-right">{overallPercentage.toFixed(1)}% spent</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Material Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">{formatCurrency(totalMaterialBudget)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual:</span>
                  <span className="font-medium">{formatCurrency(totalMaterialActual)}</span>
                </div>
                <Progress value={materialPercentage} className="mt-2" />
                <div className="text-xs text-muted-foreground text-right">{materialPercentage.toFixed(1)}% spent</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Non-Material Costs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">{formatCurrency(totalNonMaterialBudget)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Actual:</span>
                  <span className="font-medium">{formatCurrency(totalNonMaterialActual)}</span>
                </div>
                <Progress value={nonMaterialPercentage} className="mt-2" />
                <div className="text-xs text-muted-foreground text-right">{nonMaterialPercentage.toFixed(1)}% spent</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jobs Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {!jobs || jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No jobs to report on yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total Budget</TableHead>
                    <TableHead className="text-right">Total Actual</TableHead>
                    <TableHead className="text-right">Material Budget</TableHead>
                    <TableHead className="text-right">Material Actual</TableHead>
                    <TableHead className="text-right">Non-Material Budget</TableHead>
                    <TableHead className="text-right">Non-Material Actual</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const variance = job.total_budget - job.total_actual;
                    return (
                      <TableRow 
                        key={job.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/job-costing/${job.id}`)}
                      >
                        <TableCell className="font-medium">{job.sale_order_name}</TableCell>
                        <TableCell>{job.customer_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(job.total_budget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(job.total_actual)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(job.material_budget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(job.material_actual)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(job.non_material_budget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(job.non_material_actual)}</TableCell>
                        <TableCell className={`text-right font-medium ${variance >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatCurrency(Math.abs(variance))} {variance >= 0 ? 'under' : 'over'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>TOTALS</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalActual)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalMaterialBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalMaterialActual)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalNonMaterialBudget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalNonMaterialActual)}</TableCell>
                    <TableCell className={`text-right ${(totalBudget - totalActual) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(Math.abs(totalBudget - totalActual))} {(totalBudget - totalActual) >= 0 ? 'under' : 'over'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
