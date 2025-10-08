import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { useOdooSankey } from "@/hooks/useOdooSankey";
import { Skeleton } from "@/components/ui/skeleton";

export function SankeyChart() {
  const { sankeyData, isLoading } = useOdooSankey();

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Revenue Generation Flow</CardTitle>
          <p className="text-sm text-muted-foreground">Lead sources to revenue outcomes</p>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
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
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Revenue Generation Flow</CardTitle>
        <p className="text-sm text-muted-foreground">Lead sources → Stages → Outcomes → Revenue</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <Sankey
            data={sankeyData}
            node={{ fill: "hsl(var(--primary))", fillOpacity: 0.8 }}
            link={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.3 }}
            nodePadding={50}
            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
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
