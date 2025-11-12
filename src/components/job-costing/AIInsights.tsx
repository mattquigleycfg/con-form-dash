import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface AIInsightsProps {
  jobs?: any[];
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
      console.log('Starting AI insights analysis...', { jobId, analysisType });
      
      const { data, error } = await supabase.functions.invoke('analyze-job-insights', {
        body: { job_id: jobId, analysis_type: analysisType },
      });

      if (error) {
        console.error('AI insights analysis error:', error);
        throw error;
      }
      
      console.log('AI insights analysis completed:', data);
      
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
                Rule-based cost analysis and recommendations for your jobs
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
                Click "Run Analysis" to generate cost insights for your jobs. This analyzes budget variances, anomalies, predictions, optimization opportunities, and material waste.
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
                Rule-based cost analysis and recommendations
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedInsight} onOpenChange={() => setSelectedInsight(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedInsight && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", getTypeColor(selectedInsight.insight_type))}>
                      {getTypeIcon(selectedInsight.insight_type, "h-6 w-6")}
                    </div>
                    <div>
                      <DialogTitle className="text-xl">{selectedInsight.title}</DialogTitle>
                      <DialogDescription className="flex items-center gap-2 mt-1">
                        <Badge variant={getSeverityColor(selectedInsight.severity) as any}>
                          {selectedInsight.severity}
                        </Badge>
                        <span className="text-sm">{getTypeLabel(selectedInsight.insight_type)}</span>
                      </DialogDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleDismiss(selectedInsight.id);
                      setSelectedInsight(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
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
                {selectedInsight.recommendations.length > 0 && (
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

