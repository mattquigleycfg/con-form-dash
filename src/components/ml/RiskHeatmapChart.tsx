import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceArea, ReferenceLine } from "recharts";
import { useNavigate } from "react-router-dom";
import type { OverrunWarning } from "@/hooks/useMLPredictions";

interface RiskHeatmapChartProps {
  data: OverrunWarning[];
}

const RISK_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

function displayName(soName: string | undefined, jobId: string): string {
  const name = soName?.trim();
  if (name && name.length > 0 && name !== jobId) return name;
  return jobId?.slice(0, 8) + "...";
}

export function RiskHeatmapChart({ data }: RiskHeatmapChartProps) {
  const navigate = useNavigate();

  const chartData = data.map((d) => ({
    x: Math.round(d.budget_utilization * 100),
    y: Math.round(d.overrun_probability * 100),
    budget: d.budget,
    risk: d.risk_level,
    jobId: d.job_id,
    name: displayName(d.sale_order_name, d.job_id),
  }));

  const highRiskCount = chartData.filter((d) => d.risk === "high").length;
  const medRiskCount = chartData.filter((d) => d.risk === "medium").length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Risk Heatmap</CardTitle>
        <CardDescription className="text-xs">
          {chartData.length} jobs plotted — {highRiskCount > 0 ? `${highRiskCount} high risk` : ""}
          {highRiskCount > 0 && medRiskCount > 0 ? ", " : ""}
          {medRiskCount > 0 ? `${medRiskCount} medium risk` : ""}
          {highRiskCount === 0 && medRiskCount === 0 ? "all jobs within safe range" : ""}
          {" "}| Click a dot to view job
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No risk data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <ReferenceArea y1={70} y2={100} fill="#ef4444" fillOpacity={0.04} />
              <ReferenceArea y1={40} y2={70} fill="#f59e0b" fillOpacity={0.04} />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.4} />
              <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} />
              <ReferenceLine x={100} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.5} />
              <XAxis type="number" dataKey="x" name="Budget Used" unit="%" domain={[0, "auto"]} tick={{ fontSize: 11 }} label={{ value: "Budget Utilization %", position: "bottom", fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="Overrun Risk" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Overrun Probability %", angle: -90, position: "insideLeft", fontSize: 11 }} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm space-y-0.5">
                      <p className="font-semibold text-foreground">{d.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ background: RISK_COLORS[d.risk] }} />
                        <span className="capitalize">{d.risk} risk</span>
                      </div>
                      <p className="text-muted-foreground">Budget used: {d.x}%</p>
                      <p className="text-muted-foreground">Overrun likelihood: {d.y}%</p>
                      <p className="text-muted-foreground">Budget: ${d.budget?.toLocaleString()}</p>
                    </div>
                  );
                }}
              />
              <Scatter data={chartData} onClick={(d: any) => d?.jobId && navigate(`/job-costing/${d.jobId}`)}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={RISK_COLORS[entry.risk] || RISK_COLORS.low} fillOpacity={0.7} cursor="pointer" />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
