import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign, ChevronDown, ChevronUp, Users } from "lucide-react";
import { FilterBar } from "@/components/filters/FilterBar";
import { AICopilot } from "@/components/AICopilot";
import { useOdooOpportunities } from "@/hooks/useOdooOpportunities";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Opportunity {
  id: number;
  name: string;
  expected_revenue: number;
  probability: number;
  stage_id: [number, string];
  partner_id: [number, string];
  user_id: [number, string] | false;
}

export default function Pipeline() {
  const { opportunities, isLoading } = useOdooOpportunities();
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  const groupedByStage = useMemo(() => {
    return opportunities.reduce((acc, opp) => {
      const stageName = opp.stage_id[1];
      if (!acc[stageName]) {
        acc[stageName] = [];
      }
      acc[stageName].push(opp);
      return acc;
    }, {} as Record<string, Opportunity[]>);
  }, [opportunities]);

  const toggleStage = (stage: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stage)) {
        newSet.delete(stage);
      } else {
        newSet.add(stage);
      }
      return newSet;
    });
  };

  const totalValue = opportunities.reduce((sum, o) => sum + o.expected_revenue, 0);
  const totalOpportunities = opportunities.length;
  const avgProbability = totalOpportunities > 0 
    ? opportunities.reduce((sum, o) => sum + o.probability, 0) / totalOpportunities 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sales Pipeline</h1>
            <p className="mt-1 text-muted-foreground">
              Track your opportunities through each stage
            </p>
          </div>
          
          {/* Synopsis Cards */}
          <div className="flex gap-4">
            <Card className="px-4 py-2">
              <div className="text-xs text-muted-foreground">Total Value</div>
              <div className="text-lg font-bold text-foreground">
                ${totalValue.toLocaleString()}
              </div>
            </Card>
            <Card className="px-4 py-2">
              <div className="text-xs text-muted-foreground">Opportunities</div>
              <div className="text-lg font-bold text-foreground">
                {totalOpportunities}
              </div>
            </Card>
            <Card className="px-4 py-2">
              <div className="text-xs text-muted-foreground">Avg Probability</div>
              <div className="text-lg font-bold text-foreground">
                {avgProbability.toFixed(0)}%
              </div>
            </Card>
          </div>
        </div>

        <FilterBar />

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByStage).map(([stage, opps]) => {
              const isExpanded = expandedStages.has(stage);
              const stageValue = opps.reduce((sum, o) => sum + o.expected_revenue, 0);
              const avgProb = opps.reduce((sum, o) => sum + o.probability, 0) / opps.length;

              return (
                <Collapsible
                  key={stage}
                  open={isExpanded}
                  onOpenChange={() => toggleStage(stage)}
                >
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <TrendingUp className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <CardTitle className="text-lg">{stage}</CardTitle>
                            <CardDescription className="mt-1">
                              {opps.length} opportunities • ${stageValue.toLocaleString()} • {avgProb.toFixed(0)}% avg probability
                            </CardDescription>
                          </div>
                        </div>
                        
                        {/* Card-like overview when collapsed */}
                        {!isExpanded && (
                          <div className="flex gap-6 mr-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-foreground">
                                {opps.length}
                              </div>
                              <div className="text-xs text-muted-foreground">Deals</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">
                                ${(stageValue / 1000).toFixed(0)}k
                              </div>
                              <div className="text-xs text-muted-foreground">Value</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-foreground">
                                {avgProb.toFixed(0)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Probability</div>
                            </div>
                          </div>
                        )}

                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </CardHeader>
                    
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-3">
                          {opps.map((opp) => (
                            <div
                              key={opp.id}
                              className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex-1 space-y-1">
                                <p className="font-medium text-sm">{opp.name}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{opp.partner_id[1]}</span>
                                  {opp.user_id && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {opp.user_id[1]}
                                      </span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-full font-medium",
                                      opp.probability >= 75 ? "bg-green-500/20 text-green-700 dark:text-green-400" :
                                      opp.probability >= 50 ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" :
                                      "bg-red-500/20 text-red-700 dark:text-red-400"
                                    )}
                                  >
                                    {opp.probability}% probability
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-primary font-semibold text-lg">
                                <DollarSign className="h-5 w-5" />
                                {opp.expected_revenue.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      <AICopilot />
    </DashboardLayout>
  );
}
