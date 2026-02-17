import { useState } from "react";
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
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceArea, ReferenceLine } from "recharts";
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

function displayName(soName: string | undefined, jobId: string): string {
  const name = soName?.trim();
  if (name && name.length > 0 && name !== jobId) return name;
  return jobId?.slice(0, 8) + "...";
}

export function RiskHeatmapChart({ data, jobLookup }: RiskHeatmapChartProps) {
  const navigate = useNavigate();
  const [selectedDot, setSelectedDot] = useState<OverrunWarning | null>(null);

  const chartData = data.map((d) => ({
    x: Math.round(d.budget_utilization * 100),
    y: Math.round(d.overrun_probability * 100),
    budget: d.budget,
    risk: d.risk_level,
    jobId: d.job_id,
    name: displayName(d.sale_order_name, d.job_id),
    opportunityName: jobLookup?.get(d.job_id)?.opportunity_name || "",
    soName: d.sale_order_name || jobLookup?.get(d.job_id)?.sale_order_name || "",
  }));

  const maxX = chartData.length > 0 ? Math.max(...chartData.map(d => d.x)) : 100;
  const xDomainMax = Math.min(250, Math.max(110, maxX + 10));

  const highRiskCount = chartData.filter((d) => d.risk === "high").length;
  const medRiskCount = chartData.filter((d) => d.risk === "medium").length;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Risk Heatmap</CardTitle>
          <CardDescription className="text-xs">
            {chartData.length} jobs plotted — {highRiskCount > 0 ? `${highRiskCount} high risk` : ""}
            {highRiskCount > 0 && medRiskCount > 0 ? ", " : ""}
            {medRiskCount > 0 ? `${medRiskCount} medium risk` : ""}
            {highRiskCount === 0 && medRiskCount === 0 ? "all jobs within safe range" : ""}
            {" "}| Click a dot for details
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
                <XAxis type="number" dataKey="x" name="Budget Used" unit="%" domain={[0, xDomainMax]} tick={{ fontSize: 11 }} label={{ value: "Budget Utilization %", position: "bottom", fontSize: 11 }} />
                <YAxis type="number" dataKey="y" name="Overrun Risk" unit="%" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Overrun Probability %", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm space-y-0.5">
                        <p className="font-semibold text-foreground">{d.soName || d.name}</p>
                        {d.opportunityName && (
                          <p className="text-xs text-muted-foreground">{d.opportunityName}</p>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ background: RISK_COLORS[d.risk] }} />
                          <span className="capitalize">{d.risk} Risk</span>
                        </div>
                        <p className="text-muted-foreground">Budget used: {d.x}%</p>
                        <p className="text-muted-foreground">Overrun likelihood: {d.y}%</p>
                        <p className="text-muted-foreground">Budget: ${d.budget?.toLocaleString()}</p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={chartData}
                  onClick={(d: any) => {
                    if (!d?.jobId) return;
                    const warning = data.find(w => w.job_id === d.jobId);
                    if (warning) setSelectedDot(warning);
                  }}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={RISK_COLORS[entry.risk] || RISK_COLORS.low} fillOpacity={0.7} cursor="pointer" />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDot} onOpenChange={() => setSelectedDot(null)}>
        <DialogContent className="max-w-lg">
          {selectedDot && (() => {
            const job = jobLookup?.get(selectedDot.job_id);
            const soName = selectedDot.sale_order_name || job?.sale_order_name || selectedDot.job_id.slice(0, 8);
            const oppName = job?.opportunity_name;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    Overrun Risk - {soName}
                  </DialogTitle>
                  {oppName && (
                    <DialogDescription>{oppName}</DialogDescription>
                  )}
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
                  {selectedDot.recommendations?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
                      {selectedDot.recommendations.map((r, i) => (
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
