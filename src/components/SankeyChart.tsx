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
          <p className="text-sm text-muted-foreground">Loading sales data...</p>
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
          <CardTitle>Sales Performance Flow</CardTitle>
          <p className="text-sm text-muted-foreground">No sales data available for the selected period</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-card h-full flex flex-col">
      <CardHeader>
        <CardTitle>Sales Performance Flow</CardTitle>
        <p className="text-sm text-muted-foreground">Revenue breakdown by sales team and products</p>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={sankeyData}
            node={{ 
              fill: "hsl(142, 76%, 36%)", 
              fillOpacity: 0.9,
              stroke: "hsl(142, 76%, 26%)",
              strokeWidth: 2
            }}
            link={{ 
              stroke: "hsl(142, 76%, 36%)", 
              strokeOpacity: 0.4,
              fill: "none"
            }}
            nodePadding={32}
            nodeWidth={20}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                padding: "12px",
              }}
              itemStyle={{
                color: "hsl(var(--foreground))",
                fontSize: "14px"
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
