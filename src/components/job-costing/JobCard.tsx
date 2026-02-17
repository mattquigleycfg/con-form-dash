import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Job } from "@/hooks/useJobs";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Truck, Brain, AlertTriangle, Trash2 } from "lucide-react";
import { useCachedMLPredictions } from "@/hooks/useMLPredictions";

interface JobCardProps {
  job: Job;
  onClick: () => void;
  compact?: boolean;
}

export function JobCard({ job, onClick, compact = false }: JobCardProps) {
  const { data: mlPredictions } = useCachedMLPredictions(job.id);

  const overrunPrediction = mlPredictions?.find((p: any) => p.prediction_type === "overrun_warning");
  const wastePrediction = mlPredictions?.find((p: any) => p.prediction_type === "waste_risk");
  const anomalyPrediction = mlPredictions?.find((p: any) => p.prediction_type === "anomaly_score");

  const hasMLWarning = overrunPrediction?.predicted_value > 0.5 ||
    wastePrediction?.predicted_value > 0.5 ||
    (anomalyPrediction?.metadata as any)?.is_anomaly;

  const budgetUtilization = job.total_budget > 0 
    ? (job.total_actual / job.total_budget) * 100 
    : 0;

  const getStatusColor = () => {
    if (budgetUtilization < 80) return "bg-success";
    if (budgetUtilization < 100) return "bg-warning";
    return "bg-destructive";
  };

  const getStatusLabel = () => {
    if (budgetUtilization < 80) return "On Track";
    if (budgetUtilization < 100) return "At Risk";
    return "Over Budget";
  };

  const getChartColor = () => {
    if (budgetUtilization > 100) return "#ef4444";
    if (budgetUtilization > 80) return "#f59e0b";
    return "#10b981";
  };

  const chartData = [
    { value: Math.min(job.total_actual, job.total_budget) },
    { value: Math.max(0, job.total_budget - job.total_actual) },
  ];

  return (
    <Card 
      className="cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200"
      onClick={onClick}
    >
      <CardHeader className={compact ? "pb-3" : "pb-4"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {job.sale_order_name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {job.customer_name}
            </p>
            {job.subcontractor_name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-1">
                <Truck className="h-3 w-3 shrink-0" />
                {job.subcontractor_name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Mini Donut Chart */}
            <div className="relative w-10 h-10">
              <ResponsiveContainer width={40} height={40}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx={20}
                    cy={20}
                    innerRadius={12}
                    outerRadius={18}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    <Cell fill={getChartColor()} />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-bold" style={{ color: getChartColor() }}>
                  {Math.round(budgetUtilization)}%
                </span>
              </div>
            </div>
            <Badge 
              variant={budgetUtilization > 100 ? "destructive" : "secondary"} 
              className={`text-xs shrink-0 ${
                budgetUtilization > 100 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                  : budgetUtilization > 80 
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}
            >
              {getStatusLabel()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : ""}>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium">
                ${job.total_budget.toLocaleString()}
              </span>
            </div>
            <Progress value={budgetUtilization} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              ${job.total_actual.toLocaleString()} / ${job.total_budget.toLocaleString()}
            </p>
          </div>
          
          {!compact && job.date_order && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Confirmed</span>
              <span>{format(new Date(job.date_order), "MMM d, yyyy")}</span>
            </div>
          )}
          
          {job.project_stage_name && job.project_stage_name !== 'Unassigned' && (
            <Badge variant="outline" className="text-xs">
              {job.project_stage_name}
            </Badge>
          )}
          
          {/* ML Risk Badges */}
          {hasMLWarning && (
            <TooltipProvider>
              <div className="flex items-center gap-1 mt-1">
                {overrunPrediction?.predicted_value > 0.5 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive" className="text-[10px] px-1 py-0 gap-0.5">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {Math.round(overrunPrediction.predicted_value * 100)}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>ML: {Math.round(overrunPrediction.predicted_value * 100)}% overrun probability</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {wastePrediction?.predicted_value > 0.5 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="default" className="text-[10px] px-1 py-0 gap-0.5 bg-yellow-600">
                        <Trash2 className="h-2.5 w-2.5" />
                        waste
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>ML: {Math.round(wastePrediction.predicted_value * 100)}% waste probability</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {(anomalyPrediction?.metadata as any)?.is_anomaly && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="default" className="text-[10px] px-1 py-0 gap-0.5 bg-red-600">
                        <Brain className="h-2.5 w-2.5" />
                        anomaly
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>ML: Unusual cost pattern detected</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
