import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { Job } from "@/hooks/useJobs";
import { formatCurrency } from "@/lib/utils";

interface VarianceAnalysisCardProps {
  jobs: Job[];
}

export function VarianceAnalysisCard({ jobs }: VarianceAnalysisCardProps) {
  // Calculate variance metrics
  const totalBudget = jobs.reduce((sum, job) => sum + job.total_budget, 0);
  const totalActual = jobs.reduce((sum, job) => sum + job.total_actual, 0);
  const overallVariance = totalBudget - totalActual;
  const overallVariancePercent = totalBudget > 0 ? (overallVariance / totalBudget) * 100 : 0;

  // Categorize jobs
  const overBudgetJobs = jobs.filter(j => j.total_actual > j.total_budget);
  const atRiskJobs = jobs.filter(j => {
    const util = j.total_budget > 0 ? (j.total_actual / j.total_budget) * 100 : 0;
    return util > 80 && util <= 100;
  });
  const underBudgetJobs = jobs.filter(j => j.total_actual < j.total_budget && (j.total_actual / j.total_budget) <= 0.8);

  // Top 3 overruns
  const top3Overruns = [...jobs]
    .filter(j => j.total_actual > j.total_budget)
    .sort((a, b) => (b.total_actual - b.total_budget) - (a.total_actual - a.total_budget))
    .slice(0, 3);

  // Material vs Non-Material variance
  const materialBudget = jobs.reduce((sum, job) => sum + job.material_budget, 0);
  const materialActual = jobs.reduce((sum, job) => sum + job.material_actual, 0);
  const materialVariance = materialBudget - materialActual;
  const materialVariancePercent = materialBudget > 0 ? (materialVariance / materialBudget) * 100 : 0;

  const nonMaterialBudget = jobs.reduce((sum, job) => sum + job.non_material_budget, 0);
  const nonMaterialActual = jobs.reduce((sum, job) => sum + job.non_material_actual, 0);
  const nonMaterialVariance = nonMaterialBudget - nonMaterialActual;
  const nonMaterialVariancePercent = nonMaterialBudget > 0 ? (nonMaterialVariance / nonMaterialBudget) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Variance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Variance */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Budget Variance</span>
            <Badge variant={overallVariance >= 0 ? "default" : "destructive"} className="gap-1">
              {overallVariance >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {overallVariancePercent >= 0 ? "+" : ""}{overallVariancePercent.toFixed(1)}%
            </Badge>
          </div>
          <div className={`text-2xl font-bold ${overallVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(overallVariance))} {overallVariance >= 0 ? 'under' : 'over'}
          </div>
        </div>

        {/* Job Categories */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{overBudgetJobs.length}</div>
            <div className="text-xs text-muted-foreground">Over Budget</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{atRiskJobs.length}</div>
            <div className="text-xs text-muted-foreground">At Risk (&gt;80%)</div>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{underBudgetJobs.length}</div>
            <div className="text-xs text-muted-foreground">Under Budget</div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Variance by Category</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Material Costs</span>
              <span className={`font-medium ${materialVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(materialVariance))} ({materialVariancePercent >= 0 ? "+" : ""}{materialVariancePercent.toFixed(1)}%)
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Non-Material Costs</span>
              <span className={`font-medium ${nonMaterialVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(nonMaterialVariance))} ({nonMaterialVariancePercent >= 0 ? "+" : ""}{nonMaterialVariancePercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Top Overruns */}
        {top3Overruns.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Top Budget Overruns
            </h4>
            <div className="space-y-2">
              {top3Overruns.map((job, idx) => {
                const overrun = job.total_actual - job.total_budget;
                return (
                  <div key={job.id} className="flex justify-between items-center text-sm p-2 bg-red-50 dark:bg-red-950 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs">
                        {idx + 1}
                      </Badge>
                      <span className="font-medium truncate">{job.sale_order_name}</span>
                    </div>
                    <span className="text-red-600 font-medium">
                      {formatCurrency(overrun)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

