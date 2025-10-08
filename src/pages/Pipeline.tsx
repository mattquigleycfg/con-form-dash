import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, DollarSign } from "lucide-react";

interface Opportunity {
  id: number;
  name: string;
  expected_revenue: number;
  probability: number;
  stage_id: [number, string];
}

export default function Pipeline() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'crm.lead',
          method: 'search_read',
          args: [
            [['type', '=', 'opportunity']],
            ['name', 'expected_revenue', 'probability', 'stage_id']
          ]
        }
      });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedByStage = opportunities.reduce((acc, opp) => {
    const stageName = opp.stage_id[1];
    if (!acc[stageName]) {
      acc[stageName] = [];
    }
    acc[stageName].push(opp);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Sales Pipeline</h1>
        <p className="mt-1 text-muted-foreground">
          Track your opportunities through each stage
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(groupedByStage).map(([stage, opps]) => (
            <Card key={stage}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {stage}
                </CardTitle>
                <CardDescription>
                  {opps.length} opportunities • ${opps.reduce((sum, o) => sum + o.expected_revenue, 0).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {opps.map((opp) => (
                    <div
                      key={opp.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{opp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {opp.probability}% probability
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-primary font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {opp.expected_revenue.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
