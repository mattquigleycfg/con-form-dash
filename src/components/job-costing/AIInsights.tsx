import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  AlertCircle, 
  X, 
  Sparkles,
  ArrowUpRight,
  Brain,
  Target,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useMLInsights, type MLInsights, type CostPrediction, type AnomalyScore, type WasteRisk, type OverrunWarning } from "@/hooks/useMLPredictions";
import { SHAPWaterfallChart } from "@/components/ml";
import type { Job } from "@/hooks/useJobs";

interface AIInsightsProps {
  jobs?: Job[];
  jobId?: string;
  analysisType?: 'all' | 'budget_variance' | 'anomalies' | 'predictions' | 'optimization' | 'waste';
  detailed?: boolean;
}

interface Insight {
  id: string;
  job_id: string;
  insight_type: 'variance' | 'anomaly' | 'prediction' | 'optimization' | 'waste' | 'comparison';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  data: any;
  recommendations: any[];
  dismissed: boolean;
  created_at: string;
}

export function AIInsights({ jobs, jobId, analysisType = 'all', detailed = false }: AIInsightsProps) {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null);
  const [showMLDetail, setShowMLDetail] = useState<string | null>(null);
  const [mlCardPage, setMlCardPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: mlInsights, isLoading: loadingML } = useMLInsights(jobId);

  const jobLookup = useMemo(() => {
    const map = new Map<string, Job>();
    (jobs || []).forEach(j => map.set(j.id, j));
    return map;
  }, [jobs]);

  // Fetch existing insights from database
  const { data: existingInsights, isLoading: loadingExisting, refetch: refetchExisting } = useQuery({
    queryKey: ['ai-insights', jobId],
    queryFn: async () => {
      let query = supabase
        .from('ai_job_insights')
        .select('*')
        .eq('dismissed', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter expired insights client-side
      const now = new Date();
      const activeInsights = (data as Insight[]).filter(
        insight => !insight.expires_at || new Date(insight.expires_at) > now
      );
      
      return activeInsights;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate new insights if needed
  const { data: newInsights, isLoading: loadingNew, refetch, isError, error } = useQuery({
    queryKey: ['ai-insights-analysis', jobId, analysisType],
    queryFn: async () => {
      
      
      const { data, error } = await supabase.functions.invoke('analyze-job-insights', {
        body: { job_id: jobId, analysis_type: analysisType },
      });

      if (error) {
        console.error('AI insights analysis error:', error);
        throw error;
      }
      
      
      
      // After analysis completes, refresh the existing insights to show new results
      await refetchExisting();
      
      // Show success message
      toast({
        title: "Analysis Complete",
        description: `Generated ${data?.count || 0} insights for your jobs.`,
      });
      
      return data;
    },
    enabled: false, // Only run when manually triggered
    retry: false,
  });

  const allInsights = existingInsights || [];
  const visibleInsights = allInsights.filter(i => !dismissedInsights.has(i.id));

  const handleDismiss = async (insightId: string) => {
    setDismissedInsights(prev => new Set(prev).add(insightId));

    // Update in database
    await supabase
      .from('ai_job_insights')
      .update({ dismissed: true })
      .eq('id', insightId);
  };

  // Group insights by type for the bento grid
  const insightsByType = visibleInsights.reduce((acc, insight) => {
    if (!acc[insight.insight_type]) {
      acc[insight.insight_type] = [];
    }
    acc[insight.insight_type].push(insight);
    return acc;
  }, {} as Record<string, Insight[]>);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string, size: string = "h-5 w-5") => {
    switch (type) {
      case 'variance':
        return <TrendingDown className={size} />;
      case 'anomaly':
        return <AlertCircle className={size} />;
      case 'prediction':
        return <TrendingUp className={size} />;
      case 'optimization':
        return <Lightbulb className={size} />;
      case 'waste':
        return <AlertTriangle className={size} />;
      default:
        return <Sparkles className={size} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'variance':
        return 'Budget Variance';
      case 'anomaly':
        return 'Cost Anomaly';
      case 'prediction':
        return 'Prediction';
      case 'optimization':
        return 'Optimization';
      case 'waste':
        return 'Material Waste';
      default:
        return 'Insight';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'variance':
        return 'border-orange-500/50 bg-orange-50 dark:bg-orange-950/20';
      case 'anomaly':
        return 'border-red-500/50 bg-red-50 dark:bg-red-950/20';
      case 'prediction':
        return 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/20';
      case 'optimization':
        return 'border-green-500/50 bg-green-50 dark:bg-green-950/20';
      case 'waste':
        return 'border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20';
      default:
        return 'border-purple-500/50 bg-purple-50 dark:bg-purple-950/20';
    }
  };

  if (loadingExisting) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (visibleInsights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Insights
              </CardTitle>
              <CardDescription>
                Rule-based cost analysis and ML-powered predictions for your jobs
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                refetch();
                toast({
                  title: "Starting Analysis",
                  description: "Analyzing job costs and generating insights...",
                });
              }}
              disabled={loadingNew}
            >
              {loadingNew ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Analysis Failed</AlertTitle>
              <AlertDescription>
                {error?.message || 'Failed to analyze jobs. Please check console for details.'}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>No insights yet</AlertTitle>
              <AlertDescription>
                Click "Run Analysis" to generate cost insights for your jobs. This analyzes budget variances, anomalies, predictions, optimization opportunities, and material waste. ML models provide confidence-scored predictions when available.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Insights
                <Badge variant="secondary">{visibleInsights.length}</Badge>
              </CardTitle>
              <CardDescription>
                Rule-based cost analysis and ML-powered predictions
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                refetch();
                toast({
                  title: "Refreshing Analysis",
                  description: "Analyzing job costs and generating new insights...",
                });
              }}
              disabled={loadingNew}
            >
              {loadingNew ? 'Analyzing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* ML Prediction Cards - prioritised, paginated */}
          {mlInsights && mlInsights.total_insights > 0 && (() => {
            const ML_PAGE_SIZE = 8;
            const allCards: Array<{ key: string; severity: number; node: React.ReactNode }> = [];

            (mlInsights.anomaly_scores || []).filter(a => a.is_anomaly).forEach((an) => {
              allCards.push({
                key: `an-${an.job_id}`,
                severity: an.severity === "critical" ? 3 : 2,
                node: (
                  <button
                    key={`an-${an.job_id}`}
                    onClick={() => setShowMLDetail(`anomaly-${an.job_id}`)}
                    className="p-3 rounded-lg border-2 border-red-500/30 bg-red-50 dark:bg-red-950/20 text-left hover:scale-[1.02] hover:shadow-md hover:border-red-500/60 hover:bg-red-100 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <ShieldAlert className="h-4 w-4 text-red-600" />
                      <Badge variant={an.severity === "critical" ? "destructive" : "default"} className="text-xs">{an.severity || "warning"}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Anomaly Detected</div>
                    <div className="text-sm font-semibold truncate">{an.sale_order_name}</div>
                    {jobLookup.get(an.job_id)?.opportunity_name && (
                      <div className="text-xs text-muted-foreground truncate">{jobLookup.get(an.job_id)?.opportunity_name}</div>
                    )}
                    <div className="text-xs mt-1">Score: {Math.round((an.anomaly_score ?? 0) * 100)}%</div>
                  </button>
                ),
              });
            });

            (mlInsights.overrun_warnings || []).filter(o => o.risk_level !== "low").forEach((ov) => {
              allCards.push({
                key: `ov-${ov.job_id}`,
                severity: ov.risk_level === "high" ? 3 : 2,
                node: (
                  <button
                    key={`ov-${ov.job_id}`}
                    onClick={() => setShowMLDetail(`overrun-${ov.job_id}`)}
                    className="p-3 rounded-lg border-2 border-orange-500/30 bg-orange-50 dark:bg-orange-950/20 text-left hover:scale-[1.02] hover:shadow-md hover:border-orange-500/60 hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <Badge variant={ov.risk_level === "high" ? "destructive" : "default"} className="text-xs">
                        {(ov.milestone || "budget").replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Overrun Warning</div>
                    <div className="text-sm font-semibold truncate">{ov.sale_order_name}</div>
                    {jobLookup.get(ov.job_id)?.opportunity_name && (
                      <div className="text-xs text-muted-foreground truncate">{jobLookup.get(ov.job_id)?.opportunity_name}</div>
                    )}
                    <div className="text-xs mt-1">{Math.round((ov.overrun_probability ?? 0) * 100)}% risk</div>
                    <Progress value={(ov.budget_utilization ?? 0) * 100} className="h-1 mt-2" />
                  </button>
                ),
              });
            });

            (mlInsights.waste_risks || []).filter(w => w.risk_level !== "low").forEach((wr) => {
              allCards.push({
                key: `wr-${wr.job_id}`,
                severity: wr.risk_level === "high" ? 3 : 2,
                node: (
                  <button
                    key={`wr-${wr.job_id}`}
                    onClick={() => setShowMLDetail(`waste-${wr.job_id}`)}
                    className="p-3 rounded-lg border-2 border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20 text-left hover:scale-[1.02] hover:shadow-md hover:border-yellow-500/60 hover:bg-yellow-100 dark:hover:bg-yellow-950/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Trash2 className="h-4 w-4 text-yellow-600" />
                      <Badge variant={wr.risk_level === "high" ? "destructive" : "default"} className="text-xs">{wr.risk_level} risk</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Waste Risk</div>
                    <div className="text-sm font-semibold truncate">{wr.sale_order_name}</div>
                    {jobLookup.get(wr.job_id)?.opportunity_name && (
                      <div className="text-xs text-muted-foreground truncate">{jobLookup.get(wr.job_id)?.opportunity_name}</div>
                    )}
                    <div className="text-xs mt-1">{Math.round((wr.waste_probability ?? 0) * 100)}% probability</div>
                  </button>
                ),
              });
            });

            const topCosts = [...(mlInsights.cost_predictions || [])]
              .sort((a, b) => Math.abs(b.predicted_overrun_pct ?? 0) - Math.abs(a.predicted_overrun_pct ?? 0))
              .slice(0, 8);
            topCosts.forEach((cp) => {
              const conf = Number.isFinite(cp.confidence_level) ? Math.round(cp.confidence_level * 100) : null;
              allCards.push({
                key: `cp-${cp.job_id}`,
                severity: Math.abs(cp.predicted_overrun_pct ?? 0) > 20 ? 2 : 1,
                node: (
                  <button
                    key={`cp-${cp.job_id}`}
                    onClick={() => setShowMLDetail(`cost-${cp.job_id}`)}
                    className="p-3 rounded-lg border-2 border-violet-500/30 bg-violet-50 dark:bg-violet-950/20 text-left hover:scale-[1.02] hover:shadow-md hover:border-violet-500/60 hover:bg-violet-100 dark:hover:bg-violet-950/40 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Target className="h-4 w-4 text-violet-600" />
                      {conf !== null && <Badge variant="outline" className="text-xs">{conf}% conf</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">Predicted Final Cost</div>
                    {(cp.sale_order_name || jobLookup.get(cp.job_id)?.sale_order_name) && (
                      <div className="text-xs font-medium truncate">{cp.sale_order_name || jobLookup.get(cp.job_id)?.sale_order_name}</div>
                    )}
                    {jobLookup.get(cp.job_id)?.opportunity_name && (
                      <div className="text-xs text-muted-foreground truncate">{jobLookup.get(cp.job_id)?.opportunity_name}</div>
                    )}
                    <div className="text-lg font-bold">{formatCurrency(cp.predicted_value)}</div>
                    <div className={cn("text-xs mt-1", (cp.predicted_overrun ?? 0) > 0 ? "text-red-600" : "text-green-600")}>
                      {(cp.predicted_overrun ?? 0) > 0 ? "+" : ""}{formatCurrency(cp.predicted_overrun ?? 0)} ({(cp.predicted_overrun_pct ?? 0) > 0 ? "+" : ""}{cp.predicted_overrun_pct ?? 0}%)
                    </div>
                    <Progress value={Math.min(100, ((cp.current_actual ?? 0) / Math.max(cp.budget || 1, 1)) * 100)} className="h-1 mt-2" />
                  </button>
                ),
              });
            });

            allCards.sort((a, b) => b.severity - a.severity);
            const visibleCount = mlCardPage * ML_PAGE_SIZE;
            const visible = allCards.slice(0, visibleCount);
            const hasMore = visibleCount < allCards.length;

            return (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-500" />
                    <span className="text-sm font-medium text-muted-foreground">
                      ML Predictions
                      <span className="ml-1 text-xs">({allCards.length} total)</span>
                    </span>
                    {loadingML && <Skeleton className="h-4 w-16" />}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {visible.map((c) => c.node)}
                </div>
                {hasMore && (
                  <div className="mt-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => setMlCardPage((p) => p + 1)}
                    >
                      Show more ({allCards.length - visibleCount} remaining)
                    </Button>
                  </div>
                )}
                {visibleCount > ML_PAGE_SIZE && (
                  <div className="mt-1 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => setMlCardPage(1)}
                    >
                      Show less
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(insightsByType).map(([type, insights]) => {
              const criticalCount = insights.filter(i => i.severity === 'critical').length;
              const warningCount = insights.filter(i => i.severity === 'warning').length;
              const mostSevere = insights.sort((a, b) => {
                const severityOrder = { critical: 3, warning: 2, info: 1 };
                return severityOrder[b.severity] - severityOrder[a.severity];
              })[0];

              return (
                <button
                  key={type}
                  onClick={() => setSelectedInsight(mostSevere)}
                  className={cn(
                    "relative p-4 rounded-lg border-2 transition-all hover:scale-105 hover:shadow-lg text-left group",
                    getTypeColor(type)
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-md bg-background/50">
                        {getTypeIcon(type, "h-5 w-5")}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {insights.length}
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        {getTypeLabel(type)}
                      </div>
                      <div className="flex items-center gap-2">
                        {criticalCount > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            {criticalCount}
                          </Badge>
                        )}
                        {warningCount > 0 && (
                          <Badge variant="default" className="text-xs px-1.5 py-0">
                            {warningCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-current/10">
                      <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {mostSevere.title}
                      </p>
                    </div>
                  </div>
                  
                  <ArrowUpRight className="absolute top-2 right-2 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ML Detail Dialog */}
      <Dialog open={!!showMLDetail} onOpenChange={() => setShowMLDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col [&>button]:hidden">
          {showMLDetail && mlInsights && (() => {
            const dashIdx = showMLDetail.indexOf('-');
            const type = showMLDetail.slice(0, dashIdx);
            const jobIdKey = showMLDetail.slice(dashIdx + 1);
            const matchedJob = jobLookup.get(jobIdKey);
            if (type === 'cost') {
              const cp = (mlInsights.cost_predictions || []).find(p => p.job_id === jobIdKey);
              if (!cp) return null;
              const displayName = cp.sale_order_name || matchedJob?.sale_order_name || '';
              const oppName = matchedJob?.opportunity_name;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-violet-500" />
                      ML Cost Prediction {displayName && `- ${displayName}`}
                    </DialogTitle>
                    <DialogDescription>
                      {oppName && <span className="font-medium">{oppName} — </span>}
                      XGBoost model prediction based on historical job patterns
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Budget</div>
                        <div className="text-lg font-bold">{formatCurrency(cp.budget)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Current Actual</div>
                        <div className="text-lg font-bold">{formatCurrency(cp.current_actual)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30">
                        <div className="text-xs text-muted-foreground">Predicted Final Cost</div>
                        <div className="text-lg font-bold text-violet-700 dark:text-violet-300">{formatCurrency(cp.predicted_value)}</div>
                      </div>
                      {(cp.confidence_lower != null || cp.confidence_upper != null) && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground">Confidence Range</div>
                          <div className="text-sm font-semibold">{formatCurrency(cp.confidence_lower ?? 0)} - {formatCurrency(cp.confidence_upper ?? 0)}</div>
                        </div>
                      )}
                    </div>
                    <div className={cn("p-3 rounded-lg", cp.predicted_overrun > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-green-50 dark:bg-green-950/20")}>
                      <div className="text-sm font-medium">
                        {cp.predicted_overrun > 0
                          ? `Projected to exceed budget by ${formatCurrency(cp.predicted_overrun)} (${cp.predicted_overrun_pct}%)`
                          : `Projected to come in under budget by ${formatCurrency(Math.abs(cp.predicted_overrun))}`}
                      </div>
                    </div>
                  </div>
                </>
              );
            }
            if (type === 'anomaly') {
              const an = (mlInsights.anomaly_scores || []).find(a => a.job_id === jobIdKey);
              if (!an) return null;
              const oppName = matchedJob?.opportunity_name;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-red-500" />
                      ML Anomaly Detection - {an.sale_order_name}
                    </DialogTitle>
                    <DialogDescription>
                      {oppName && <span className="font-medium">{oppName} — </span>}
                      Isolation Forest model detected unusual cost patterns
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Anomaly Score</div>
                        <div className="text-lg font-bold">{(an.anomaly_score * 100).toFixed(0)}%</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Budget</div>
                        <div className="text-lg font-bold">{formatCurrency(an.total_budget)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Actual</div>
                        <div className="text-lg font-bold">{formatCurrency(an.total_actual)}</div>
                      </div>
                    </div>
                    {an.contributing_factors?.length > 0 && (
                      <SHAPWaterfallChart
                        features={an.contributing_factors.map(f => ({
                          feature: f.feature,
                          z_score: f.z_score,
                          direction: f.direction,
                          value: f.value,
                        }))}
                        title="Contributing Factors (Z-Score)"
                      />
                    )}
                  </div>
                </>
              );
            }
            if (type === 'waste') {
              const wr = (mlInsights.waste_risks || []).find(w => w.job_id === jobIdKey);
              if (!wr) return null;
              const oppName = matchedJob?.opportunity_name;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5 text-yellow-500" />
                      ML Waste Risk - {wr.sale_order_name}
                    </DialogTitle>
                    <DialogDescription>
                      {oppName && <span className="font-medium">{oppName} — </span>}
                      Random Forest classifier with SHAP explanations
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Waste Probability</div>
                        <div className="text-lg font-bold">{(wr.waste_probability * 100).toFixed(0)}%</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Material Budget</div>
                        <div className="text-lg font-bold">{formatCurrency(wr.material_budget)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Material Actual</div>
                        <div className="text-lg font-bold">{formatCurrency(wr.material_actual)}</div>
                      </div>
                    </div>
                    {wr.feature_explanations?.length > 0 && (
                      <SHAPWaterfallChart
                        features={wr.feature_explanations}
                        title="Key Drivers (SHAP Values)"
                      />
                    )}
                    {(wr.recommendations?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
                        {wr.recommendations.map((r, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-card mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{r.impact}</Badge>
                              <span className="text-sm font-medium">{r.action}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{r.description}</p>
                            {r.expected_savings && (
                              <p className="text-xs text-green-600 mt-1">Expected savings: {formatCurrency(r.expected_savings)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            }
            if (type === 'overrun') {
              const ov = (mlInsights.overrun_warnings || []).find(o => o.job_id === jobIdKey);
              if (!ov) return null;
              const oppName = matchedJob?.opportunity_name;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Budget Overrun Warning - {ov.sale_order_name}
                    </DialogTitle>
                    <DialogDescription>
                      {oppName && <span className="font-medium">{oppName} — </span>}
                      XGBoost classifier predicting overrun probability at {(ov.milestone || 'current').replace(/_/g, ' ')} milestone
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4 overflow-y-auto">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Overrun Probability</div>
                        <div className="text-lg font-bold">{(ov.overrun_probability * 100).toFixed(0)}%</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Budget</div>
                        <div className="text-lg font-bold">{formatCurrency(ov.budget)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground">Spent</div>
                        <div className="text-lg font-bold">{(ov.budget_utilization * 100).toFixed(0)}%</div>
                      </div>
                    </div>
                    <Progress value={ov.budget_utilization * 100} className="h-2" />
                    {(ov.recommendations?.length ?? 0) > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Recommended Actions</h4>
                        {ov.recommendations.map((r, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-card mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{r.impact}</Badge>
                              <span className="text-sm font-medium">{r.action}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{r.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            }
            return null;
          })()}
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedInsight} onOpenChange={() => setSelectedInsight(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col [&>button]:hidden">
          {selectedInsight && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-start gap-4">
                  <div className={cn("p-2 rounded-lg flex-shrink-0", getTypeColor(selectedInsight.insight_type))}>
                    {getTypeIcon(selectedInsight.insight_type, "h-6 w-6")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl pr-8">{selectedInsight.title}</DialogTitle>
                    {jobLookup.get(selectedInsight.job_id)?.opportunity_name && (
                      <p className="text-sm text-muted-foreground mt-0.5">{jobLookup.get(selectedInsight.job_id)?.opportunity_name}</p>
                    )}
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Badge variant={getSeverityColor(selectedInsight.severity) as any}>
                        {selectedInsight.severity}
                      </Badge>
                      <span className="text-sm">{getTypeLabel(selectedInsight.insight_type)}</span>
                    </DialogDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleDismiss(selectedInsight.id);
                      setSelectedInsight(null);
                    }}
                    className="flex-shrink-0"
                  >
                    Dismiss
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4 overflow-y-auto pr-2 scrollbar-thin">
                {/* Description */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Analysis</h4>
                  <p className="text-sm text-muted-foreground">{selectedInsight.description}</p>
                </div>

                {/* Key Metrics */}
                {selectedInsight.data && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Key Metrics</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(selectedInsight.data).map(([key, value]: [string, any]) => {
                        if (key === 'job_id') return null;
                        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        const formattedValue = typeof value === 'number'
                          ? key.includes('percent') 
                            ? `${value.toFixed(1)}%`
                            : key.includes('cost') || key.includes('budget') || key.includes('actual') || key.includes('variance') || key.includes('savings')
                              ? formatCurrency(value)
                              : value.toFixed(2)
                          : String(value);
                        
                        return (
                          <div key={key} className="p-3 rounded-lg bg-muted/50">
                            <dt className="text-xs text-muted-foreground mb-1">{formattedKey}</dt>
                            <dd className="text-lg font-semibold">{formattedValue}</dd>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {(selectedInsight.recommendations?.length ?? 0) > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3">Recommendations</h4>
                    <div className="space-y-3">
                      {selectedInsight.recommendations.map((rec: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-start gap-3">
                            <Badge variant="outline" className="mt-0.5">
                              {rec.impact} Impact
                            </Badge>
                            <div className="flex-1 space-y-2">
                              <p className="font-medium text-sm">{rec.action}</p>
                              <p className="text-sm text-muted-foreground">{rec.description}</p>
                              {rec.expected_savings && (
                                <div className="flex items-center gap-2 pt-2 border-t">
                                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                    Expected savings: {formatCurrency(rec.expected_savings)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* View all insights of this type */}
                {insightsByType[selectedInsight.insight_type]?.length > 1 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3">
                      Other {getTypeLabel(selectedInsight.insight_type)} Issues ({insightsByType[selectedInsight.insight_type].length - 1})
                    </h4>
                    <div className="space-y-2">
                      {insightsByType[selectedInsight.insight_type]
                        .filter(i => i.id !== selectedInsight.id)
                        .map(insight => (
                          <button
                            key={insight.id}
                            onClick={() => setSelectedInsight(insight)}
                            className="w-full p-3 rounded-lg border bg-card hover:bg-accent text-left transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium line-clamp-1">{insight.title}</p>
                              <Badge variant={getSeverityColor(insight.severity) as any} className="text-xs">
                                {insight.severity}
                              </Badge>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

