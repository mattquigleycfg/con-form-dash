import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CostAnalysis } from "@/hooks/useJobCostAnalysis";
import { Job } from "@/hooks/useJobs";
import { formatCurrency } from "@/lib/utils";

interface CostAnalysisCardProps {
  analysis: CostAnalysis;
  job: Job;
  materialActualTotal?: number; // Optional: pass calculated material actual
  nonMaterialActualTotal?: number; // Optional: pass calculated non-material actual
}

export function CostAnalysisCard({ analysis, job, materialActualTotal, nonMaterialActualTotal }: CostAnalysisCardProps) {
  // Color coding: green for negative variances <100% (under budget), red for positive (over budget)
  const getVarianceClass = (variancePercent: number) => {
    if (variancePercent < 0 && Math.abs(variancePercent) < 100) {
      return "text-green-600 dark:text-green-400";
    }
    if (variancePercent > 0) {
      return "text-red-600 dark:text-red-400";
    }
    return "";
  };

  // Use calculated actuals if provided, otherwise fall back to job database values
  const actualMaterialCost = materialActualTotal ?? job.material_actual;
  const actualNonMaterialCost = nonMaterialActualTotal ?? job.non_material_actual;
  const totalActualCost = actualMaterialCost + actualNonMaterialCost;

  // Variance = Actual - Budget (negative = under budget/good, positive = over budget/bad)
  const materialVariance = actualMaterialCost - analysis.materialBudget;
  const materialVariancePercent = analysis.materialBudget > 0 ? (materialVariance / analysis.materialBudget) * 100 : 0;
  const nonMaterialVariance = actualNonMaterialCost - analysis.nonMaterialBudget;
  const nonMaterialVariancePercent = analysis.nonMaterialBudget > 0 ? (nonMaterialVariance / analysis.nonMaterialBudget) * 100 : 0;
  const totalVariance = totalActualCost - analysis.totalBudget;
  const totalVariancePercent = analysis.totalBudget > 0 ? (totalVariance / analysis.totalBudget) * 100 : 0;
  
  const actualMargin = analysis.budgetedRevenue - totalActualCost;
  const actualMarginPercent = analysis.budgetedRevenue > 0 ? (actualMargin / analysis.budgetedRevenue) * 100 : 0;

  // Count total analytic line entries
  const totalEntries = analysis.analyticLines?.length || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>Cost Analysis Overview</CardTitle>
        <span className="text-sm text-muted-foreground">{totalEntries} entries</span>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cost Analysis Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Cost Analysis</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance ($)</TableHead>
                <TableHead className="text-right">Variance (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Materials</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(analysis.materialBudget)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(actualMaterialCost)}
                </TableCell>
                <TableCell className={`text-right ${getVarianceClass(materialVariancePercent)}`}>
                  {materialVariance >= 0 ? '+' : ''}{formatCurrency(materialVariance)}
                </TableCell>
                <TableCell className={`text-right ${getVarianceClass(materialVariancePercent)}`}>
                  {materialVariance >= 0 ? '+' : ''}{materialVariancePercent.toFixed(1)}%
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Non-Materials (Services)</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(analysis.nonMaterialBudget)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(actualNonMaterialCost)}
                </TableCell>
                <TableCell className={`text-right ${getVarianceClass(nonMaterialVariancePercent)}`}>
                  {nonMaterialVariance >= 0 ? '+' : ''}{formatCurrency(nonMaterialVariance)}
                </TableCell>
                <TableCell className={`text-right ${getVarianceClass(nonMaterialVariancePercent)}`}>
                  {nonMaterialVariance >= 0 ? '+' : ''}{nonMaterialVariancePercent.toFixed(1)}%
                </TableCell>
              </TableRow>

              <TableRow className="font-bold border-t-2">
                <TableCell>Total Cost</TableCell>
                <TableCell className="text-right">{formatCurrency(analysis.totalBudget)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalActualCost)}
                </TableCell>
                <TableCell className={`text-right ${getVarianceClass(totalVariancePercent)}`}>
                  {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)}
                </TableCell>
                <TableCell className={`text-right ${getVarianceClass(totalVariancePercent)}`}>
                  {totalVariance >= 0 ? '+' : ''}{totalVariancePercent.toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Performance Metrics Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3 border-t pt-4">Performance Metrics</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Revenue (Sale Price)</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(analysis.budgetedRevenue)}
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Total Cost</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(analysis.totalBudget)}
                </TableCell>
              </TableRow>

              <TableRow className="font-bold border-t-2">
                <TableCell>Gross Margin</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(analysis.budgetedMargin)}
                </TableCell>
              </TableRow>

              <TableRow className="font-bold">
                <TableCell>Gross Margin %</TableCell>
                <TableCell className="text-right">
                  {analysis.budgetedMarginPercent.toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {analysis.bomEstimatedMaterialCost > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>BoM Estimated Material Cost:</strong> {formatCurrency(analysis.bomEstimatedMaterialCost)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {analysis.bomBreakdowns.length} manufacturing order(s)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
