import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CostAnalysis } from "@/hooks/useJobCostAnalysis";
import { formatCurrency } from "@/lib/utils";

interface CostAnalysisCardProps {
  analysis: CostAnalysis;
}

export function CostAnalysisCard({ analysis }: CostAnalysisCardProps) {
  const getVarianceClass = (variance: number) => {
    if (variance > 0) return "text-green-600 dark:text-green-400";
    if (variance < 0) return "text-red-600 dark:text-red-400";
    return "";
  };

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
                ${formatCurrency(analysis.budgetedRevenue)}
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="pl-8">Materials</TableCell>
              <TableCell className="text-right">
                ${formatCurrency(analysis.materialBudget)}
              </TableCell>
              <TableCell className="text-right">
                ${formatCurrency(analysis.actualMaterialCost)}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(analysis.materialVariance)}`}>
                ${formatCurrency(Math.abs(analysis.materialVariance))}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(analysis.materialVariance)}`}>
                {analysis.materialVariancePercent.toFixed(1)}%
              </TableCell>
            </TableRow>

            <TableRow>
              <TableCell className="pl-8">Non-Materials (Services)</TableCell>
              <TableCell className="text-right">
                ${formatCurrency(analysis.nonMaterialBudget)}
              </TableCell>
              <TableCell className="text-right">
                ${formatCurrency(analysis.actualNonMaterialCost)}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(analysis.nonMaterialVariance)}`}>
                ${formatCurrency(Math.abs(analysis.nonMaterialVariance))}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(analysis.nonMaterialVariance)}`}>
                {analysis.nonMaterialVariancePercent.toFixed(1)}%
              </TableCell>
            </TableRow>

            <TableRow className="font-bold border-t-2">
              <TableCell>Total Cost</TableCell>
              <TableCell className="text-right">${formatCurrency(analysis.totalBudget)}</TableCell>
              <TableCell className="text-right">
                ${formatCurrency(analysis.totalActualCost)}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(analysis.totalVariance)}`}>
                ${formatCurrency(Math.abs(analysis.totalVariance))}
              </TableCell>
              <TableCell className={`text-right ${getVarianceClass(analysis.totalVariance)}`}>
                {analysis.totalVariancePercent.toFixed(1)}%
              </TableCell>
            </TableRow>

            <TableRow className="font-bold border-t-2 bg-muted/50">
              <TableCell>Gross Margin</TableCell>
              <TableCell className="text-right">
                ${formatCurrency(analysis.budgetedMargin)}
              </TableCell>
              <TableCell className="text-right">
                ${formatCurrency(analysis.actualMargin)}
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell
                className={`text-right ${getVarianceClass(analysis.actualMargin)}`}
              >
                {analysis.actualMarginPercent.toFixed(1)}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {analysis.bomEstimatedMaterialCost > 0 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>BoM Estimated Material Cost:</strong> ${formatCurrency(analysis.bomEstimatedMaterialCost)}
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
