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
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  AlertCircle, 
  X, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
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

  const toggleExpanded = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'variance':
        return <TrendingDown className="h-5 w-5" />;
      case 'anomaly':
        return <AlertCircle className="h-5 w-5" />;
      case 'prediction':
        return <TrendingUp className="h-5 w-5" />;
      case 'optimization':
        return <Lightbulb className="h-5 w-5" />;
      case 'waste':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
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
              AI-powered analysis and recommendations
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
      <CardContent className="space-y-4">
        {visibleInsights.map((insight) => {
          const isExpanded = expandedInsights.has(insight.id);

          return (
            <Alert key={insight.id} variant={getSeverityColor(insight.severity) as any}>
              <div className="flex items-start gap-3 w-full">
                {getTypeIcon(insight.insight_type)}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <AlertTitle className="flex items-center gap-2">
                        {insight.title}
                        <Badge variant={getSeverityColor(insight.severity) as any} className="text-xs">
                          {insight.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription className="mt-2">
                        {insight.description}
                      </AlertDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      {insight.recommendations.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(insight.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(insight.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <Collapsible open={isExpanded}>
                    <CollapsibleContent className="mt-3">
                      {insight.recommendations.length > 0 && (
                        <div className="space-y-2 pl-6 border-l-2 border-muted">
                          <p className="text-sm font-semibold">Recommendations:</p>
                          {insight.recommendations.map((rec: any, idx: number) => (
                            <div key={idx} className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {rec.impact} Impact
                                </Badge>
                                <span className="font-medium">{rec.action}</span>
                              </div>
                              <p className="text-muted-foreground text-xs">{rec.description}</p>
                              {rec.expected_savings && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                  Expected savings: {formatCurrency(rec.expected_savings)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Additional data */}
                      {detailed && insight.data && (
                        <div className="mt-3 p-3 bg-muted/50 rounded-md">
                          <p className="text-xs font-semibold mb-2">Details:</p>
                          <dl className="grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(insight.data).map(([key, value]: [string, any]) => {
                              if (key === 'job_id') return null;
                              const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                              const formattedValue = typeof value === 'number'
                                ? key.includes('percent') 
                                  ? `${value.toFixed(1)}%`
                                  : key.includes('cost') || key.includes('budget') || key.includes('actual') || key.includes('variance')
                                    ? formatCurrency(value)
                                    : value.toFixed(2)
                                : String(value);
                              
                              return (
                                <div key={key}>
                                  <dt className="text-muted-foreground">{formattedKey}:</dt>
                                  <dd className="font-medium">{formattedValue}</dd>
                                </div>
                              );
                            })}
                          </dl>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
}

