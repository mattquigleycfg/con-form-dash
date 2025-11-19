import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download, FileSpreadsheet, Search, Minus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useState, useMemo } from "react";
import { DateRange, BudgetSort } from "@/hooks/useJobFilters";
import { useJobReportsFiltering } from "@/hooks/useJobReportsFiltering";
import { JobFilterBar } from "@/components/job-costing/JobFilterBar";
import { SalesPersonFilter } from "@/components/job-costing/SalesPersonFilter";
import { SubcontractorFilter } from "@/components/job-costing/SubcontractorFilter";
import { CustomerFilter } from "@/components/job-costing/CustomerFilter";
import { ProductCategoryFilter } from "@/components/job-costing/ProductCategoryFilter";
import { ProductSummaryCell } from "@/components/job-costing/ProductSummaryCell";
import { VarianceAnalysisCard } from "@/components/job-costing/VarianceAnalysisCard";
import { CostCategoryChart } from "@/components/job-costing/CostCategoryChart";
import { useJobsWithInvoicedPOs } from "@/hooks/useJobsWithInvoicedPOs";

export default function JobCostingReports() {
  const navigate = useNavigate();
  const { jobs, isLoading } = useJobs();
  const { toast } = useToast();

  // Filter state
  const [dateRange, setDateRange] = useState<DateRange | null>(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return { start: threeMonthsAgo, end: new Date() };
  });
  const [projectManager, setProjectManager] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [budgetSort, setBudgetSort] = useState<BudgetSort>("high-low");
  const [salesPerson, setSalesPerson] = useState<string | null>(null);
  const [subcontractor, setSubcontractor] = useState<string | null>(null);
  const [customers, setCustomers] = useState<string[]>([]); // Changed to array
  const [productCategory, setProductCategory] = useState<string | null>(null); // Changed to string | null
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [showOnlyInvoicedPOs, setShowOnlyInvoicedPOs] = useState(false);

  // Fetch jobs with invoiced POs
  const { data: invoicedPOsData, isLoading: loadingInvoicedPOs } = useJobsWithInvoicedPOs(jobs);

  // Apply filters
  const filteredJobs = useJobReportsFiltering(jobs, {
    dateRange,
    budgetSort,
    searchTerm,
    projectManager,
    salesPerson,
    subcontractor,
    customers, // Changed from customer
    productCategory,
    showOnlyInvoicedPOs,
    jobIdsWithInvoicedPOs: invoicedPOsData?.jobIdsWithInvoicedPOs,
  });

  // Selection helpers
  const toggleAllJobs = () => {
    if (selectedJobs.size === filteredJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(filteredJobs.map((job) => job.id)));
    }
  };

  const toggleJob = (jobId: string) => {
    const newSelection = new Set(selectedJobs);
    if (newSelection.has(jobId)) {
      newSelection.delete(jobId);
    } else {
      newSelection.add(jobId);
    }
    setSelectedJobs(newSelection);
  };

  const allJobsSelected = filteredJobs.length > 0 && selectedJobs.size === filteredJobs.length;
  const someJobsSelected = selectedJobs.size > 0 && selectedJobs.size < filteredJobs.length;

  const totalBudget = filteredJobs?.reduce((sum, job) => sum + job.total_budget, 0) || 0;
  const totalActual = filteredJobs?.reduce((sum, job) => sum + job.total_actual, 0) || 0;
  const totalMaterialBudget = filteredJobs?.reduce((sum, job) => sum + job.material_budget, 0) || 0;
  const totalMaterialActual = filteredJobs?.reduce((sum, job) => sum + job.material_actual, 0) || 0;
  const totalNonMaterialBudget = filteredJobs?.reduce((sum, job) => sum + job.non_material_budget, 0) || 0;
  const totalNonMaterialActual = filteredJobs?.reduce((sum, job) => sum + job.non_material_actual, 0) || 0;

  const overallPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const materialPercentage = totalMaterialBudget > 0 ? (totalMaterialActual / totalMaterialBudget) * 100 : 0;
  const nonMaterialPercentage = totalNonMaterialBudget > 0 ? (totalNonMaterialActual / totalNonMaterialBudget) * 100 : 0;

  const handleExport = (format: 'csv' | 'excel') => {
    // Determine which jobs to export
    const jobsToExport = selectedJobs.size > 0
      ? filteredJobs.filter((job) => selectedJobs.has(job.id))
      : filteredJobs;

    if (!jobsToExport || jobsToExport.length === 0) {
      toast({
        title: "No data to export",
        description: selectedJobs.size > 0 ? "No jobs selected." : "There are no jobs to export.",
        variant: "destructive",
      });
      return;
    }

    // Prepare export data with calculated fields and new columns
    const exportData = jobsToExport.map(job => ({
      sale_order_name: job.sale_order_name,
      customer_name: job.customer_name,
      sales_person: job.sales_person_name || '-',
      project_manager: job.project_manager_name || '-',
      subcontractor: job.subcontractor_name || '-',
      total_budget: job.total_budget,
      total_actual: job.total_actual,
      material_budget: job.material_budget,
      material_actual: job.material_actual,
      non_material_budget: job.non_material_budget,
      non_material_actual: job.non_material_actual,
      variance: job.total_budget - job.total_actual,
      variance_status: (job.total_budget - job.total_actual) >= 0 ? 'Under Budget' : 'Over Budget',
    }));

    // Calculate totals for export
    const exportTotalBudget = jobsToExport.reduce((sum, job) => sum + job.total_budget, 0);
    const exportTotalActual = jobsToExport.reduce((sum, job) => sum + job.total_actual, 0);
    const exportMaterialBudget = jobsToExport.reduce((sum, job) => sum + job.material_budget, 0);
    const exportMaterialActual = jobsToExport.reduce((sum, job) => sum + job.material_actual, 0);
    const exportNonMaterialBudget = jobsToExport.reduce((sum, job) => sum + job.non_material_budget, 0);
    const exportNonMaterialActual = jobsToExport.reduce((sum, job) => sum + job.non_material_actual, 0);

    // Add totals row
    exportData.push({
      sale_order_name: 'TOTALS',
      customer_name: '',
      sales_person: '',
      project_manager: '',
      subcontractor: '',
      total_budget: exportTotalBudget,
      total_actual: exportTotalActual,
      material_budget: exportMaterialBudget,
      material_actual: exportMaterialActual,
      non_material_budget: exportNonMaterialBudget,
      non_material_actual: exportNonMaterialActual,
      variance: exportTotalBudget - exportTotalActual,
      variance_status: (exportTotalBudget - exportTotalActual) >= 0 ? 'Under Budget' : 'Over Budget',
    });

    const exportOptions = {
      filename: 'job_costing_report',
      sheetName: 'Job Costing Report',
      columns: [
        { key: 'sale_order_name', label: 'Job' },
        { key: 'customer_name', label: 'Customer' },
        { key: 'sales_person', label: 'Sales Person' },
        { key: 'project_manager', label: 'Project Manager' },
        { key: 'subcontractor', label: 'Subcontractor' },
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
          description: `${jobsToExport.length} job(s) exported to CSV.`,
        });
      } else {
        exportToExcel(exportOptions);
        toast({
          title: "Export successful",
          description: `${jobsToExport.length} job(s) exported to Excel.`,
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
          
          <div className="flex items-center gap-2">
            {selectedJobs.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedJobs.size} job(s) selected
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  {selectedJobs.size > 0 ? `Export Selected (${selectedJobs.size})` : 'Export All'}
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
        </div>

        {/* Filter Bars */}
        <div className="space-y-4">
          {/* Main filters - from JobCosting page */}
          <JobFilterBar
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            budgetSort={budgetSort}
            onBudgetSortChange={setBudgetSort}
            view="list"
            onViewChange={() => {}}
            projectManager={projectManager}
            onProjectManagerChange={setProjectManager}
          />

          {/* Additional report-specific filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-sm font-medium mb-2 block">Sales Person</label>
              <SalesPersonFilter
                jobs={jobs}
                value={salesPerson}
                onChange={setSalesPerson}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Customer</label>
              <CustomerFilter
                jobs={jobs}
                value={customers}
                onChange={setCustomers}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Subcontractor</label>
              <SubcontractorFilter
                value={subcontractor}
                onChange={setSubcontractor}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Product Type</label>
              <ProductCategoryFilter
                value={productCategory}
                onChange={setProductCategory}
              />
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="invoiced-pos"
                checked={showOnlyInvoicedPOs}
                onCheckedChange={(checked) => setShowOnlyInvoicedPOs(checked as boolean)}
              />
              <label
                htmlFor="invoiced-pos"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Show only jobs with invoiced POs
                {showOnlyInvoicedPOs && invoicedPOsData && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({invoicedPOsData.jobIdsWithInvoicedPOs.size} jobs)
                  </span>
                )}
              </label>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by SO, customer, opportunity, sales person, or project manager..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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

        {/* Accounting Analysis Components */}
        <div className="grid gap-4 lg:grid-cols-2">
          <VarianceAnalysisCard jobs={filteredJobs} />
          <CostCategoryChart jobs={filteredJobs} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jobs Summary ({filteredJobs.length} jobs)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!filteredJobs || filteredJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No jobs match your filters.
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <Table className="min-w-[1700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 sticky left-0 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <Checkbox
                          checked={allJobsSelected}
                          onCheckedChange={toggleAllJobs}
                          aria-label="Select all jobs"
                          className={someJobsSelected ? "data-[state=checked]:bg-primary" : ""}
                        >
                          {someJobsSelected && !allJobsSelected && <Minus className="h-3 w-3" />}
                        </Checkbox>
                      </TableHead>
                      <TableHead className="sticky left-12 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        Job
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Sales Person</TableHead>
                      <TableHead>Project Manager</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Subcontractor</TableHead>
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
                    {filteredJobs.map((job) => {
                      const variance = job.total_budget - job.total_actual;
                      const isSelected = selectedJobs.has(job.id);
                      return (
                        <TableRow 
                          key={job.id}
                          className={`hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}
                        >
                          <TableCell className="sticky left-0 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleJob(job.id)}
                              aria-label={`Select ${job.sale_order_name}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableCell>
                          <TableCell 
                            className="font-medium sticky left-12 z-10 bg-background shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer"
                            onClick={() => navigate(`/job-costing/${job.id}`)}
                          >
                            {job.sale_order_name}
                          </TableCell>
                          <TableCell>{job.customer_name}</TableCell>
                          <TableCell className="text-sm">{job.sales_person_name || '-'}</TableCell>
                          <TableCell className="text-sm">{job.project_manager_name || '-'}</TableCell>
                          <TableCell>
                            <ProductSummaryCell jobId={job.id} />
                          </TableCell>
                          <TableCell className="text-sm">{job.subcontractor_name || '-'}</TableCell>
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
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell className="sticky left-0 z-10 bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      </TableCell>
                      <TableCell className="sticky left-12 z-10 bg-muted/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        TOTALS
                      </TableCell>
                      <TableCell colSpan={4}></TableCell>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
