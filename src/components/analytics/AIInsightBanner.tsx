import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Sparkles, ChevronDown, TrendingUp, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { type DetailedMetrics, type TrafficSourceData } from "@/hooks/useWebsiteAnalytics";
import { generateMarketingInsights, type AIInsight } from "@/utils/analyticsInsights";
import { cn } from "@/lib/utils";

interface AIInsightBannerProps {
  metrics?: DetailedMetrics;
  sources?: TrafficSourceData[];
  className?: string;
}

export function AIInsightBanner({ metrics, sources, className }: AIInsightBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const insights = generateMarketingInsights(metrics, sources);

  if (insights.length === 0) {
    return null;
  }

  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "opportunity":
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      case "info":
        return <Info className="h-4 w-4 text-purple-600" />;
    }
  };

  const getInsightBadgeColor = (type: AIInsight["type"]) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 border-green-300";
      case "warning":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "opportunity":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "info":
        return "bg-purple-100 text-purple-800 border-purple-300";
    }
  };

  const getPriorityBadge = (priority: AIInsight["priority"]) => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-300",
      medium: "bg-orange-100 text-orange-800 border-orange-300",
      low: "bg-gray-100 text-gray-800 border-gray-300",
    };
    return colors[priority];
  };

  return (
    <div className={cn("relative p-[2px] rounded-lg bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500", className)}>
      <Card className="bg-background border-0 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Marketing Insights
              <Badge variant="outline" className="ml-2 bg-purple-50 text-purple-700 border-purple-300">
                {insights.length} insight{insights.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            AI-powered analysis of your website performance with actionable recommendations
          </p>
        </CardHeader>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{insight.metric}</span>
                          <Badge
                            variant="outline"
                            className={cn("text-xs", getInsightBadgeColor(insight.type))}
                          >
                            {insight.value}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.insight}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs shrink-0", getPriorityBadge(insight.priority))}
                    >
                      {insight.priority}
                    </Badge>
                  </div>

                  {insight.suggestions.length > 0 && (
                    <div className="mt-3 pl-6 space-y-1">
                      <p className="text-xs font-medium text-foreground mb-2">
                        💡 Recommendations:
                      </p>
                      <ul className="space-y-1.5">
                        {insight.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  Insights based on construction industry benchmarks • Powered by AI analysis
                </p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
