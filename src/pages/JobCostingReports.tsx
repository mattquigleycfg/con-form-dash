import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useJobs } from "@/hooks/useJobs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { exportToCSV, exportToExcel, formatCurrencyForExport } from "@/utils/exportData";
import { useToast } from "@/hooks/use-toast";

export default function JobCostingReports() {
  const navigate = useNavigate();
  const { jobs, isLoading } = useJobs();
  const { toast } = useToast();

  const totalBudget = jobs?.reduce((sum, job) => sum + job.total_budget, 0) || 0;
  const totalActual = jobs?.reduce((sum, job) => sum + job.total_actual, 0) || 0;
  const totalMaterialBudget = jobs?.reduce((sum, job) => sum + job.material_budget, 0) || 0;
  const totalMaterialActual = jobs?.reduce((sum, job) => sum + job.material_actual, 0) || 0;
  const totalNonMaterialBudget = jobs?.reduce((sum, job) => sum + job.non_material_budget, 0) || 0;
  const totalNonMaterialActual = jobs?.reduce((sum, job) => sum + job.non_material_actual, 0) || 0;

  const overallPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const materialPercentage = totalMaterialBudget > 0 ? (totalMaterialActual / totalMaterialBudget) * 100 : 0;
  const nonMaterialPercentage = totalNonMaterialBudget > 0 ? (totalNonMaterialActual / totalNonMaterialBudget) * 100 : 0;

  const handleExport = (format: 'csv' | 'excel') => {
    if (!jobs || jobs.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no jobs to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare export data with calculated fields
    const exportData = jobs.map(job => ({
      sale_order_name: job.sale_order_name,
      customer_name: job.customer_name,
      total_budget: job.total_budget,
      total_actual: job.total_actual,
      material_budget: job.material_budget,
      material_actual: job.material_actual,
      non_material_budget: job.non_material_budget,
      non_material_actual: job.non_material_actual,
      variance: job.total_budget - job.total_actual,
      variance_status: (job.total_budget - job.total_actual) >= 0 ? 'Under Budget' : 'Over Budget',
    }));

    // Add totals row
    exportData.push({
      sale_order_name: 'TOTALS',
      customer_name: '',
      total_budget: totalBudget,
      total_actual: totalActual,
      material_budget: totalMaterialBudget,
      material_actual: totalMaterialActual,
      non_material_budget: totalNonMaterialBudget,
      non_material_actual: totalNonMaterialActual,
      variance: totalBudget - totalActual,
      variance_status: (totalBudget - totalActual) >= 0 ? 'Under Budget' : 'Over Budget',
    });

    const exportOptions = {
      filename: 'job_costing_report',
      sheetName: 'Job Costing Report',
      columns: [
        { key: 'sale_order_name', label: 'Job' },
        { key: 'customer_name', label: 'Customer' },
        { key: 'total_budget', label: 'Total Budget', format: formatCurrencyForExport },
        { key: 'total_actual', label: 'Total Actual', format: formatCurrencyForExport },
        { key: 'material_budget', label: 'Material Budget', format: formatCurrencyForExport },
        { key: 'material_actual', label: 'Material Actual', format: formatCurrencyForExport },
        { key: 'non_material_budget', label: 'Non-Material Budget', format: formatCurrencyForExport },
        { key: 'non_material_actual', label: 'Non-Material Actual', format: formatCurrencyForExport },
        { key: 'variance', label: 'Variance', format: formatCurrencyForExport },
        { key: 'variance_status', label: 'Status' },
      ],
      data: exportData,
      includeTimestamp: true,
    };

    try {
      if (format === 'csv') {
        exportToCSV(exportOptions);
        toast({
          title: "Export successful",
          description: "Job costing report exported to CSV.",
        });
      } else {
        exportToExcel(exportOptions);
        toast({
          title: "Export successful",
          description: "Job costing report exported to Excel.",
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting the report.",
        variant: "destructive",
      });
    }
  };

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/job-costing")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Job Costing Reports</h1>
              <p className="text-muted-foreground mt-1">Consolidated view of all jobs</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export to CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Export to Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
