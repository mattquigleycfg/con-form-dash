import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const data = [
  { stage: "Leads", count: 245, value: 612500 },
  { stage: "Qualified", count: 156, value: 468000 },
  { stage: "Proposal", count: 89, value: 356000 },
  { stage: "Negotiation", count: 45, value: 247500 },
  { stage: "Closed Won", count: 32, value: 192000 },
];

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function PipelineChart() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Sales Pipeline</CardTitle>
        <p className="text-sm text-muted-foreground">Current opportunities by stage</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data} layout="vertical">
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
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
