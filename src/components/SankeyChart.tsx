import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { useOdooSankey } from "@/hooks/useOdooSankey";
import { Skeleton } from "@/components/ui/skeleton";

export function SankeyChart() {
  const { sankeyData, isLoading } = useOdooSankey();

  if (isLoading) {
    return (
      <Card className="shadow-card h-full flex flex-col">
        <CardHeader>
        <CardTitle>Sales Performance Flow</CardTitle>
        <p className="text-sm text-muted-foreground">Sales team activity to customer retention</p>
        </CardHeader>
        <CardContent className="flex-1 min-h-[220px] overflow-hidden">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (sankeyData.nodes.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Revenue Generation Flow</CardTitle>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <CardTitle>Sales Performance Flow</CardTitle>
        <p className="text-sm text-muted-foreground">Sales Reps → Opportunity Stages → Deal Outcomes → Customer Retention</p>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            node={{ fill: "hsl(var(--primary))", fillOpacity: 0.8 }}
            link={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.3 }}
            nodePadding={24}
            margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
