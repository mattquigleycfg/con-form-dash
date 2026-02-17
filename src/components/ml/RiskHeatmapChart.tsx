import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import type { OverrunWarning } from "@/hooks/useMLPredictions";

interface RiskHeatmapChartProps {
  data: OverrunWarning[];
}

const RISK_COLORS = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

export function RiskHeatmapChart({ data }: RiskHeatmapChartProps) {
  const navigate = useNavigate();

  const chartData = data.map((d) => ({
    x: Math.round(d.budget_utilization * 100),
    y: Math.round(d.overrun_probability * 100),
    budget: d.budget,
    risk: d.risk_level,
    jobId: d.job_id,
    name: d.sale_order_name,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Risk Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No risk data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" dataKey="x" name="Budget Used" unit="%" domain={[0, 150]} tick={{ fontSize: 11 }} label={{ value: "Budget Utilization %", position: "bottom", fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="Overrun Risk" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Overrun Probability %", angle: -90, position: "insideLeft", fontSize: 11 }} />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ payload }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium">{d.name || d.jobId}</p>
                      <p>Budget Used: {d.x}%</p>
                      <p>Overrun Risk: {d.y}%</p>
                      <p>Budget: ${d.budget?.toLocaleString()}</p>
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
