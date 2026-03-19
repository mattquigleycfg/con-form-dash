import { Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CostAnalysis } from "@/hooks/useJobCostAnalysis";
import { Job } from "@/hooks/useJobs";
import { cn, formatCurrency } from "@/lib/utils";

interface CostAnalysisCardProps {
  analysis: CostAnalysis;
  job: Job;
  materialActualTotal?: number;
  nonMaterialActualTotal?: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Positive variance = under budget (good). Negative = over budget (bad). */
function varianceClass(variance: number, suppress: boolean): string {
  if (suppress) return "text-muted-foreground";
  if (variance > 0) return "text-green-600 dark:text-green-400 font-medium";
  if (variance < 0) return "text-red-600 dark:text-red-400 font-medium";
  return "text-muted-foreground";
}

function marginClass(value: number): string {
  if (value > 0) return "text-green-600 dark:text-green-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

/**
 * Returns the variance-percent cell content.
 * When budget === 0 and actual > 0 (unbudgeted spend), shows an em-dash in red.
 * When noActuals, returns "—" with muted colour.
 */
function VariancePctCell({
  budget,
  actual,
  pct,
  noActuals,
}: {
  budget: number;
  actual: number;
  pct: number;
  noActuals: boolean;
}) {
  if (noActuals) {
    return (
      <TableCell className="text-right text-muted-foreground py-3">—</TableCell>
    );
  }
  if (budget === 0 && actual > 0) {
    return (
      <TableCell className="text-right text-red-600 dark:text-red-400 font-medium py-3">
        —
      </TableCell>
    );
  }
  const sign = pct > 0 ? "+" : "";
  return (
    <TableCell
      className={cn(
        "text-right py-3",
        varianceClass(pct, false),
      )}
    >
      {sign}{pct.toFixed(1)}%
    </TableCell>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export function CostAnalysisCard({
  analysis,
  job,
  materialActualTotal,
  nonMaterialActualTotal,
}: CostAnalysisCardProps) {
  const actualMaterialCost    = materialActualTotal    ?? job.material_actual;
  const actualNonMaterialCost = nonMaterialActualTotal ?? job.non_material_actual;
  const totalActualCost       = actualMaterialCost + actualNonMaterialCost;

  /** Guard: no actuals have been posted yet */
  const noActuals = totalActualCost === 0;

  // Variances — budget minus actual (positive = under budget)
  const materialVariance           = analysis.materialBudget    - actualMaterialCost;
  const materialVariancePct        = analysis.materialBudget    > 0
    ? (materialVariance / analysis.materialBudget)    * 100 : 0;

  const nonMaterialVariance        = analysis.nonMaterialBudget - actualNonMaterialCost;
  const nonMaterialVariancePct     = analysis.nonMaterialBudget > 0
    ? (nonMaterialVariance / analysis.nonMaterialBudget) * 100 : 0;

  const totalVariance              = analysis.totalBudget       - totalActualCost;
  const totalVariancePct           = analysis.totalBudget       > 0
    ? (totalVariance / analysis.totalBudget)          * 100 : 0;

  const actualMargin               = analysis.budgetedRevenue   - totalActualCost;
  const actualMarginPct            = analysis.budgetedRevenue   > 0
    ? (actualMargin / analysis.budgetedRevenue)       * 100 : 0;

  return (
    <div className="space-y-6">

      {/* ── Cost Analysis label ────────────────────────────────────────────── */}
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Cost Analysis
      </p>

      {/* ── No-actuals callout ─────────────────────────────────────────────── */}
      {noActuals && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-4 py-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-body-sm text-muted-foreground">
            Actual costs will appear here once posted in Odoo.
          </p>
        </div>
      )}

      {/* ── Cost Breakdown table ───────────────────────────────────────────── */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-medium text-muted-foreground normal-case tracking-normal">
              Category
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground normal-case tracking-normal">
              Budget
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground normal-case tracking-normal">
              Actual
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground normal-case tracking-normal">
              Variance ($)
            </TableHead>
            <TableHead className="text-right text-xs font-medium text-muted-foreground normal-case tracking-normal">
              Variance (%)
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>

          {/* Materials row */}
          <TableRow>
            <TableCell className="py-3 text-body-sm">Materials</TableCell>
            <TableCell className="text-right py-3 text-body-sm tabular-nums">
              {formatCurrency(analysis.materialBudget)}
            </TableCell>
            {noActuals ? (
              <TableCell className="text-right py-3 text-muted-foreground" colSpan={3}>
                No actuals recorded yet
              </TableCell>
            ) : (
              <>
                <TableCell className="text-right py-3 text-body-sm tabular-nums">
                  {formatCurrency(actualMaterialCost)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right py-3 text-body-sm tabular-nums",
                    varianceClass(materialVariance, noActuals),
                  )}
                >
                  {materialVariance > 0 ? "+" : ""}{formatCurrency(materialVariance)}
                </TableCell>
                <VariancePctCell
                  budget={analysis.materialBudget}
                  actual={actualMaterialCost}
                  pct={materialVariancePct}
                  noActuals={noActuals}
                />
              </>
            )}
          </TableRow>

          {/* Non-Materials row */}
          <TableRow>
            <TableCell className="py-3 text-body-sm">Non-Materials (Services)</TableCell>
            <TableCell className="text-right py-3 text-body-sm tabular-nums">
              {formatCurrency(analysis.nonMaterialBudget)}
            </TableCell>
            {noActuals ? (
              <TableCell className="text-right py-3 text-muted-foreground" colSpan={3}>
                No actuals recorded yet
              </TableCell>
            ) : (
              <>
                <TableCell className="text-right py-3 text-body-sm tabular-nums">
                  {formatCurrency(actualNonMaterialCost)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right py-3 text-body-sm tabular-nums",
                    varianceClass(nonMaterialVariance, noActuals),
                  )}
                >
                  {nonMaterialVariance > 0 ? "+" : ""}{formatCurrency(nonMaterialVariance)}
                </TableCell>
                <VariancePctCell
                  budget={analysis.nonMaterialBudget}
                  actual={actualNonMaterialCost}
                  pct={nonMaterialVariancePct}
                  noActuals={noActuals}
                />
              </>
            )}
          </TableRow>

          {/* Total Cost row — visually separated */}
          <TableRow className="border-t-2 border-border">
            <TableCell className="py-3 text-body-sm font-semibold">Total Cost</TableCell>
            <TableCell className="text-right py-3 text-body-sm font-semibold tabular-nums">
              {formatCurrency(analysis.totalBudget)}
            </TableCell>
            {noActuals ? (
              <TableCell className="text-right py-3 text-muted-foreground" colSpan={3}>
                No actuals recorded yet
              </TableCell>
            ) : (
              <>
                <TableCell className="text-right py-3 text-body-sm font-semibold tabular-nums">
                  {formatCurrency(totalActualCost)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right py-3 text-body-sm font-semibold tabular-nums",
                    varianceClass(totalVariance, noActuals),
                  )}
                >
                  {totalVariance > 0 ? "+" : ""}{formatCurrency(totalVariance)}
                </TableCell>
                <VariancePctCell
                  budget={analysis.totalBudget}
                  actual={totalActualCost}
                  pct={totalVariancePct}
                  noActuals={noActuals}
                />
              </>
            )}
          </TableRow>

        </TableBody>
      </Table>

      {/* ── Performance Metrics ────────────────────────────────────────────── */}
      <div className="border-t pt-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Performance Metrics
          </p>

          {/* Revenue chip — fixed input, not tracked against actuals */}
          {analysis.budgetedRevenue > 0 && (
            <span className="text-xs font-medium bg-muted text-muted-foreground px-3 py-1 rounded-full">
              Sale Price: {formatCurrency(analysis.budgetedRevenue)}
            </span>
          )}
        </div>

        {/* Key/value list — clean, no outer border */}
        <div className="divide-y divide-border/50">

          {/* Total Cost row */}
          <div className="flex items-center justify-between py-3 gap-4">
            <span className="text-body-sm text-muted-foreground">Total Cost</span>
            <div className="flex items-center gap-6 flex-shrink-0">
              <span className="text-body-sm tabular-nums text-foreground">
                {formatCurrency(analysis.totalBudget)}
              </span>
              <span
                className={cn(
                  "text-body-sm tabular-nums w-28 text-right",
                  noActuals
                    ? "text-muted-foreground"
                    : totalActualCost > analysis.totalBudget
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400",
                )}
              >
                {noActuals ? "—" : formatCurrency(totalActualCost)}
              </span>
            </div>
          </div>

          {/* Gross Margin row */}
          <div className="flex items-center justify-between py-3 gap-4">
            <span className="text-body-sm text-muted-foreground">Gross Margin</span>
            <div className="flex items-center gap-6 flex-shrink-0">
              <span className={cn("text-body-sm font-semibold tabular-nums", marginClass(analysis.budgetedMargin))}>
                {formatCurrency(analysis.budgetedMargin)}
              </span>
              <span
                className={cn(
                  "text-body-sm font-semibold tabular-nums w-28 text-right",
                  noActuals ? "text-muted-foreground" : marginClass(actualMargin),
                )}
              >
                {noActuals ? "—" : formatCurrency(actualMargin)}
              </span>
            </div>
          </div>

          {/* Gross Margin % row */}
          <div className="flex items-center justify-between py-3 gap-4">
            <span className="text-body-sm text-muted-foreground">Gross Margin %</span>
            <div className="flex items-center gap-6 flex-shrink-0">
              <span className={cn("text-body-sm font-semibold tabular-nums", marginClass(analysis.budgetedMarginPercent))}>
                {analysis.budgetedMarginPercent.toFixed(1)}%
              </span>
              <span
                className={cn(
                  "text-body-sm font-semibold tabular-nums w-28 text-right",
                  noActuals ? "text-muted-foreground" : marginClass(actualMarginPct),
                )}
              >
                {noActuals ? "—" : `${actualMarginPct.toFixed(1)}%`}
              </span>
            </div>
          </div>

        </div>

        {/* Column labels for the metrics rows */}
        <div className="flex items-center justify-end gap-6 pt-1">
          <span className="text-xs text-muted-foreground/60 w-28 text-right">Budgeted</span>
          <span className="text-xs text-muted-foreground/60 w-28 text-right">Actual</span>
        </div>
      </div>

      {/* ── BoM callout ────────────────────────────────────────────────────── */}
      {analysis.bomEstimatedMaterialCost > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-body-sm text-muted-foreground">
            <strong>BoM Estimated Material Cost:</strong>{" "}
            {formatCurrency(analysis.bomEstimatedMaterialCost)}
          </p>
          <p className="text-label-md text-muted-foreground mt-1">
            Based on {analysis.bomBreakdowns.length} manufacturing order(s)
          </p>
        </div>
      )}

    </div>
  );
}
