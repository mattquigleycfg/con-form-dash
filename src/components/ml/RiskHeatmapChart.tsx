import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from "recharts";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { OverrunWarning } from "@/hooks/useMLPredictions";
import type { Job } from "@/hooks/useJobs";

interface RiskHeatmapChartProps {
  data: OverrunWarning[];
  jobLookup?: Map<string, Job>;
}

const RISK_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

function resolveJobName(
  predictionSoName: string | undefined,
  jobId: string,
  jobLookup?: Map<string, Job>,
): { soName: string; opportunityName: string; customerName: string; budget: number } {
  const job = jobLookup?.get(jobId) || (predictionSoName ? jobLookup?.get(predictionSoName) : undefined);
  const soName = job?.sale_order_name || predictionSoName?.trim() || "";
  const opportunityName = job?.opportunity_name || "";
  const customerName = job?.customer_name || "";
  const budget = job?.total_budget || 0;
  return { soName, opportunityName, customerName, budget };
}

export function RiskHeatmapChart({ data, jobLookup }: RiskHeatmapChartProps) {
  const navigate = useNavigate();
  const [selectedDot, setSelectedDot] = useState<OverrunWarning | null>(null);

  // Focus on higher-value jobs, sorted by budget descending, capped at 30
  const chartData = useMemo(() => {
    const enriched = data.map((d) => {
      const { soName, opportunityName, customerName, budget: jobBudget } = resolveJobName(d.sale_order_name, d.job_id, jobLookup);
      const displayBudget = d.budget > 0 ? d.budget : jobBudget;
      return {
        raw: d,
        name: soName || opportunityName || "Unknown",
        soName,
        opportunityName,
        customerName,
        budget: Math.round(displayBudget),
        actual: Math.round((d.budget_utilization || 0) * displayBudget),
        overrunPct: Math.round(d.overrun_probability * 100),
        utilization: Math.round((d.budget_utilization || 0) * 100),
        risk: d.risk_level,
        jobId: d.job_id,
      };
    });

    return enriched
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 30);
  }, [data, jobLookup]);

  const highRiskCount = chartData.filter((d) => d.risk === "high").length;
  const medRiskCount = chartData.filter((d) => d.risk === "medium").length;
  const fmt = (v: number) => `$${(v / 1000).toFixed(0)}k`;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Risk Analysis — Top Jobs by Budget</CardTitle>
          <CardDescription className="text-xs">
            {chartData.length} highest-value jobs —{" "}
            {highRiskCount > 0 ? <span className="text-red-500">{highRiskCount} high risk</span> : ""}
            {highRiskCount > 0 && medRiskCount > 0 ? ", " : ""}
            {medRiskCount > 0 ? <span className="text-amber-500">{medRiskCount} medium risk</span> : ""}
            {highRiskCount === 0 && medRiskCount === 0 ? "all within safe range" : ""}
            {" "}| Click a bar for details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No risk data available</div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  height={55}
                />
                <YAxis
                  yAxisId="cost"
                  tickFormatter={fmt}
                  tick={{ fontSize: 10 }}
                  label={{ value: "Cost ($)", angle: -90, position: "insideLeft", fontSize: 10, offset: -5 }}
                />
                <YAxis
                  yAxisId="pct"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => `${v}%`}
                  label={{ value: "Overrun Risk %", angle: 90, position: "insideRight", fontSize: 10, offset: -5 }}
                />
                <ReferenceLine yAxisId="pct" y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine yAxisId="pct" y={40} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.4} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm space-y-0.5">
                        <p className="font-semibold text-foreground">{d.soName || d.name}</p>
                        {d.opportunityName && <p className="text-xs text-muted-foreground">{d.opportunityName}</p>}
                        {d.customerName && <p className="text-xs text-muted-foreground">{d.customerName}</p>}
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ background: RISK_COLORS[d.risk] }} />
                          <span className="capitalize">{d.risk} Risk</span>
                        </div>
                        <p className="text-muted-foreground">Budget: {formatCurrency(d.budget)}</p>
                        <p className="text-muted-foreground">Actual: {formatCurrency(d.actual)}</p>
                        <p className="text-muted-foreground">Utilization: {d.utilization}%</p>
                        <p className="text-muted-foreground">Overrun likelihood: {d.overrunPct}%</p>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="cost"
                  dataKey="budget"
                  fill="hsl(var(--chart-4))"
                  opacity={0.3}
                  name="Budget"
                  barSize={10}
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  yAxisId="cost"
                  dataKey="actual"
                  name="Actual Spend"
                  barSize={10}
                  radius={[2, 2, 0, 0]}
                  onClick={(d: any) => {
                    if (!d?.jobId) return;
                    const warning = data.find(w => w.job_id === d.jobId);
                    if (warning) setSelectedDot(warning);
                  }}
                  cursor="pointer"
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={RISK_COLORS[entry.risk] || RISK_COLORS.low}
                      fillOpacity={0.7}
                    />
                  ))}
                </Bar>
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="overrunPct"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  name="Overrun Risk %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDot} onOpenChange={() => setSelectedDot(null)}>
        <DialogContent className="max-w-lg">
          {selectedDot && (() => {
            const { soName, opportunityName: oppName, customerName } = resolveJobName(selectedDot.sale_order_name, selectedDot.job_id, jobLookup);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Overrun Risk — {soName || "Unknown Job"}
                  </DialogTitle>
                  <DialogDescription>
                    {oppName ? oppName : customerName ? customerName : soName ? "" : "Job details unavailable"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Risk Level</div>
                      <Badge variant={selectedDot.risk_level === "high" ? "destructive" : "default"} className="mt-1 capitalize">
                        {selectedDot.risk_level}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Overrun Probability</div>
                      <div className="text-lg font-bold">{Math.round(selectedDot.overrun_probability * 100)}%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Budget Used</div>
                      <div className="text-lg font-bold">{Math.round(selectedDot.budget_utilization * 100)}%</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Budget</div>
                      <div className="text-lg font-bold">{formatCurrency(selectedDot.budget)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="text-xs text-muted-foreground">Actual Spent</div>
                      <div className="text-lg font-bold">{formatCurrency(selectedDot.actual)}</div>
                    </div>
                  </div>
                  <Progress value={selectedDot.budget_utilization * 100} className="h-2" />
                  {(selectedDot.recommendations?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
                      {selectedDot.recommendations!.map((r, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-card mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{r.impact}</Badge>
                            <span className="text-sm font-medium">{r.action}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => navigate(`/job-costing/${selectedDot.job_id}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Job Details
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
