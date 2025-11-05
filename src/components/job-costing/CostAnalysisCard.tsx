import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CostAnalysis } from "@/hooks/useJobCostAnalysis";
import { Job } from "@/hooks/useJobs";
import { formatCurrency } from "@/lib/utils";

interface CostAnalysisCardProps {
  analysis: CostAnalysis;
  job: Job;
}

export function CostAnalysisCard({ analysis, job }: CostAnalysisCardProps) {
  const getVarianceClass = (variance: number) => {
    if (variance > 0) return "text-green-600 dark:text-green-400";
    if (variance < 0) return "text-red-600 dark:text-red-400";
    return "";
  };

  // Use job actuals (which include imported analytic entries)
  const actualMaterialCost = job.material_actual;
  const actualNonMaterialCost = job.non_material_actual;
  const totalActualCost = actualMaterialCost + actualNonMaterialCost;

  // Recalculate variances using job actuals
  const materialVariance = analysis.materialBudget - actualMaterialCost;
  const materialVariancePercent = analysis.materialBudget > 0 ? (materialVariance / analysis.materialBudget) * 100 : 0;
  const nonMaterialVariance = analysis.nonMaterialBudget - actualNonMaterialCost;
  const nonMaterialVariancePercent = analysis.nonMaterialBudget > 0 ? (nonMaterialVariance / analysis.nonMaterialBudget) * 100 : 0;
  const totalVariance = analysis.totalBudget - totalActualCost;
  const totalVariancePercent = analysis.totalBudget > 0 ? (totalVariance / analysis.totalBudget) * 100 : 0;
  const actualMargin = analysis.budgetedRevenue - totalActualCost;
  const actualMarginPercent = analysis.budgetedRevenue > 0 ? (actualMargin / analysis.budgetedRevenue) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Budgeted</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="font-semibold bg-muted/50">
              <TableCell>Revenue (Sale Price)</TableCell>
              <TableCell className="text-right">
                {formatCurrency(analysis.budgetedRevenue)}
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="pl-8">Materials</TableCell>
              <TableCell className="text-right">
                {formatCurrency(analysis.materialBudget)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(actualMaterialCost)}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(materialVariance)}`}>
                {formatCurrency(Math.abs(materialVariance))}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(materialVariance)}`}>
                {materialVariancePercent.toFixed(1)}%
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="pl-8">Non-Materials (Services)</TableCell>
              <TableCell className="text-right">
                {formatCurrency(analysis.nonMaterialBudget)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(actualNonMaterialCost)}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(nonMaterialVariance)}`}>
                {formatCurrency(Math.abs(nonMaterialVariance))}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(nonMaterialVariance)}`}>
                {nonMaterialVariancePercent.toFixed(1)}%
              </TableCell>
            </TableRow>

            <TableRow className="font-bold border-t-2">
              <TableCell>Total Cost</TableCell>
              <TableCell className="text-right">{formatCurrency(analysis.totalBudget)}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(totalActualCost)}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(totalVariance)}`}>
                {formatCurrency(Math.abs(totalVariance))}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(totalVariance)}`}>
                {totalVariancePercent.toFixed(1)}%
              </TableCell>
            </TableRow>

            <TableRow className="font-bold border-t-2 bg-muted/50">
              <TableCell>Gross Margin</TableCell>
              <TableCell className="text-right">
                {formatCurrency(analysis.budgetedMargin)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(actualMargin)}
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell
                className={`text-right ${getVarianceClass(actualMargin)}`}
              >
                {actualMarginPercent.toFixed(1)}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

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
