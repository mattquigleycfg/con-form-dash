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

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
          <p className="text-sm text-muted-foreground">Current opportunities by stage</p>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
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
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Sales Pipeline</CardTitle>
        <p className="text-sm text-muted-foreground">Current opportunities by stage</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={pipelineData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
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
              formatter={(value: number, name: string) => {
                if (name === "value") {
                  return [`$${value.toLocaleString()}`, "Total Value"];
                }
                return [value, "Count"];
              }}
            />
            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
              {pipelineData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
