import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, CartesianGrid } from "recharts";

const data = [
  { month: "Jan", actual: 45000, target: 50000 },
  { month: "Feb", actual: 52000, target: 50000 },
  { month: "Mar", actual: 48000, target: 55000 },
  { month: "Apr", actual: 61000, target: 55000 },
  { month: "May", actual: 58000, target: 60000 },
  { month: "Jun", actual: 67000, target: 60000 },
  { month: "Jul", actual: 71000, target: 65000 },
  { month: "Aug", actual: 69000, target: 65000 },
];

export function RevenueChart() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Revenue vs Target</CardTitle>
        <p className="text-sm text-muted-foreground">Year-to-date performance tracking</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
              name="Actual Revenue"
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Target"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
