import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useOdooPipeline } from "@/hooks/useOdooPipeline";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function PipelineChart() {
  const { pipelineData, isLoading } = useOdooPipeline();

  // Cap values at 500 for display while preserving original for tooltip
  const cappedData = pipelineData.map(item => ({
    ...item,
    displayCount: Math.min(item.count, 500),
    actualCount: item.count
  }));

  if (isLoading) {
    return (
      <Card className="shadow-card h-full flex flex-col">
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
          <p className="text-sm text-muted-foreground">Current opportunities by stage</p>
        </CardHeader>
        <CardContent className="flex-1 min-h-[220px]">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (pipelineData.length === 0) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
          <p className="text-sm text-muted-foreground">No pipeline data available</p>
        </CardHeader>
      </Card>
    );
  }

  return (
  <Card className="shadow-card h-full flex flex-col">
    <CardHeader>
      <CardTitle>Sales Pipeline</CardTitle>
      <p className="text-sm text-muted-foreground">Current opportunities by stage</p>
    </CardHeader>
    <CardContent className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={cappedData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            domain={[0, 500]}
          />
          <YAxis
            type="category"
            dataKey="stage"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            width={100}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string, props: any) => {
              if (name === "displayCount") {
                return [props.payload.actualCount, "Count"];
              }
              if (name === "value") {
                return [`$${value.toLocaleString()}`, "Total Value"];
              }
              return [value, "Count"];
            }}
          />
          <Bar dataKey="displayCount" radius={[0, 8, 8, 0]}>
            {cappedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
  );
}
