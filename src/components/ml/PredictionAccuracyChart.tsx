import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { CostPrediction } from "@/hooks/useMLPredictions";

interface PredictionAccuracyChartProps {
  data: CostPrediction[];
}

export function PredictionAccuracyChart({ data }: PredictionAccuracyChartProps) {
  const sorted = [...data]
    .filter((d) => d.budget > 0)
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 30);

  const chartData = sorted.map((d, i) => ({
    name: `Job ${i + 1}`,
    budget: Math.round(d.budget),
    actual: Math.round(d.current_actual),
    predicted: Math.round(d.predicted_value),
    confLower: Math.round(d.confidence_lower || d.predicted_value * 0.85),
    confUpper: Math.round(d.confidence_upper || d.predicted_value * 1.15),
  }));

  const fmt = (v: number) => `$${(v / 1000).toFixed(0)}k`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Predicted vs Actual Cost</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No prediction data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area dataKey="confUpper" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.1} name="Confidence Band" />
              <Area dataKey="confLower" stroke="none" fill="white" fillOpacity={1} name=" " legendType="none" />
              <Bar dataKey="actual" fill="hsl(var(--chart-1))" opacity={0.7} name="Actual" barSize={8} />
              <Line type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Predicted" />
              <Line type="monotone" dataKey="budget" stroke="hsl(var(--chart-4))" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Budget" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
