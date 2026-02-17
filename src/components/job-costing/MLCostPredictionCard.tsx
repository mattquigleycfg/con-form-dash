import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Target, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useCostPrediction, useOverrunWarning } from "@/hooks/useMLPredictions";

interface MLCostPredictionCardProps {
  jobId: string;
  budget: number;
  actual: number;
}

export function MLCostPredictionCard({ jobId, budget, actual }: MLCostPredictionCardProps) {
  const { data: costPrediction, isLoading: loadingCost } = useCostPrediction(jobId);
  const { data: overrunWarning, isLoading: loadingOverrun } = useOverrunWarning(jobId);

  const isLoading = loadingCost || loadingOverrun;
  const hasPredictions = costPrediction || overrunWarning;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasPredictions) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-500" />
          ML Predictions
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </CardTitle>
        <CardDescription>
          Machine learning predictions based on historical job patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cost Prediction */}
          {costPrediction && (
            <div className="p-4 rounded-lg border bg-violet-50/50 dark:bg-violet-950/20">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold">Predicted Final Cost</span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {Math.round(costPrediction.confidence_level * 100)}% confidence
                </Badge>
              </div>

              <div className="text-2xl font-bold text-violet-700 dark:text-violet-300 mb-2">
                {formatCurrency(costPrediction.predicted_value)}
              </div>

              <div className="text-xs text-muted-foreground mb-3">
                Range: {formatCurrency(costPrediction.confidence_lower)} - {formatCurrency(costPrediction.confidence_upper)}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Budget</span>
                  <span>{formatCurrency(budget)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Current Spent</span>
                  <span>{formatCurrency(actual)}</span>
                </div>
                <Progress
                  value={Math.min(100, (costPrediction.predicted_value / budget) * 100)}
                  className="h-2"
                />
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  costPrediction.predicted_overrun > 0 ? "text-red-600" : "text-green-600"
                )}>
                  {costPrediction.predicted_overrun > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {costPrediction.predicted_overrun > 0 ? "+" : ""}
                  {formatCurrency(costPrediction.predicted_overrun)}
                  {" "}({costPrediction.predicted_overrun_pct > 0 ? "+" : ""}
                  {costPrediction.predicted_overrun_pct}% vs budget)
                </div>
              </div>
            </div>
          )}

          {/* Overrun Warning */}
          {overrunWarning && (
            <div className={cn(
              "p-4 rounded-lg border",
              overrunWarning.risk_level === "high"
                ? "bg-red-50/50 dark:bg-red-950/20"
                : overrunWarning.risk_level === "medium"
                ? "bg-orange-50/50 dark:bg-orange-950/20"
                : "bg-green-50/50 dark:bg-green-950/20"
            )}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  overrunWarning.risk_level === "high" ? "text-red-600" :
                  overrunWarning.risk_level === "medium" ? "text-orange-600" : "text-green-600"
                )} />
                <span className="text-sm font-semibold">Budget Overrun Risk</span>
                <Badge
                  variant={overrunWarning.risk_level === "high" ? "destructive" : "secondary"}
                  className="text-xs ml-auto"
                >
                  {overrunWarning.risk_level}
                </Badge>
              </div>

              <div className="text-2xl font-bold mb-2">
                {Math.round(overrunWarning.overrun_probability * 100)}%
              </div>

              <div className="text-xs text-muted-foreground mb-3">
                Probability of exceeding budget at {overrunWarning.milestone.replace(/_/g, ' ')} stage
              </div>

              <Progress value={overrunWarning.budget_utilization * 100} className="h-2 mb-3" />

              {overrunWarning.recommendations.length > 0 && (
                <div className="space-y-1">
                  {overrunWarning.recommendations.slice(0, 2).map((rec, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-background/50 flex items-start gap-1">
                      <Badge variant="outline" className="text-[10px] px-1 shrink-0">{rec.impact}</Badge>
                      <span>{rec.action}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
