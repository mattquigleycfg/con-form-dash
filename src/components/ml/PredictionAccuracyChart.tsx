import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { CostPrediction } from "@/hooks/useMLPredictions";
import type { Job } from "@/hooks/useJobs";

interface PredictionAccuracyChartProps {
  data: CostPrediction[];
  jobLookup?: Map<string, Job>;
}

export function PredictionAccuracyChart({ data, jobLookup }: PredictionAccuracyChartProps) {
  const sorted = [...data]
    .filter((d) => d.budget > 0)
    .sort((a, b) => b.budget - a.budget)
    .slice(0, 30);

  const chartData = sorted.map((d) => {
    const hasConfidence = d.confidence_lower != null && d.confidence_upper != null &&
      d.confidence_lower > 0 && d.confidence_upper > 0;
    const job = jobLookup?.get(d.job_id);
    const soName = job?.sale_order_name || d.sale_order_name?.trim() || "";
    const opportunityName = job?.opportunity_name || "";
    return {
      name: soName || opportunityName || "Unknown",
      soName,
      opportunityName,
      budget: Math.round(d.budget),
      actual: Math.round(d.current_actual),
      predicted: Math.round(d.predicted_value),
      confLower: hasConfidence ? Math.round(d.confidence_lower!) : null,
      confUpper: hasConfidence ? Math.round(d.confidence_upper!) : null,
      overrunPct: d.predicted_overrun_pct,
    };
  });

  const hasAnyConfidence = chartData.some(d => d.confLower != null);
  const fmt = (v: number) => `$${(v / 1000).toFixed(0)}k`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Predicted vs Actual Cost</CardTitle>
        <CardDescription className="text-xs">
          Top {chartData.length} jobs by budget — comparing ML-predicted final cost against actual spend and budget
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No prediction data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 30, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} height={50} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 10 }} />
              <Tooltip
                content={({ payload, label }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm space-y-1">
                      <p className="font-semibold text-foreground">{d.soName || label}</p>
                      {d.opportunityName && (
                        <p className="text-xs text-muted-foreground">{d.opportunityName}</p>
                      )}
                      <div className="space-y-0.5 pt-1 border-t">
                        {payload.map((entry: any, i: number) => {
                          if (entry.name === " " || entry.name === "Confidence Band") return null;
                          return (
                            <p key={i} className="text-xs">
                              <span style={{ color: entry.color }}>{entry.name}: </span>
                              ${Number(entry.value).toLocaleString()}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {hasAnyConfidence && (
                <>
                  <Area dataKey="confUpper" stroke="none" fill="hsl(var(--primary))" fillOpacity={0.1} name="Confidence Band" />
                  <Area dataKey="confLower" stroke="none" fill="white" fillOpacity={1} name=" " legendType="none" />
                </>
              )}
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
