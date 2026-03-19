import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job } from "@/hooks/useJobs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { AnimatedBarChart } from "@/components/ui/animated-icon";

interface CostCategoryChartProps {
  jobs: Job[];
}

type GroupBy = "customer" | "sales_person" | "project_manager" | "subcontractor";

const CHART_PALETTE = {
  materialBudget:     "hsl(177 100% 33%)",
  materialActual:     "hsl(177 100% 22%)",
  nonMaterialBudget:  "hsl(200 80% 52%)",
  nonMaterialActual:  "hsl(200 80% 36%)",
  materialBudgetMuted:     "hsl(177 100% 33% / 0.18)",
  nonMaterialBudgetMuted:  "hsl(200 80% 52% / 0.18)",
};

export function CostCategoryChart({ jobs }: CostCategoryChartProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>("customer");

  const groupedData = jobs.reduce((acc, job) => {
    let groupKey = "";
    switch (groupBy) {
      case "customer":       groupKey = job.customer_name        || "Unknown";    break;
      case "sales_person":   groupKey = job.sales_person_name    || "Unassigned"; break;
      case "project_manager":groupKey = job.project_manager_name || "Unassigned"; break;
      case "subcontractor":  groupKey = job.subcontractor_name   || "None";       break;
    }
    if (!acc[groupKey]) {
      acc[groupKey] = { name: groupKey, materialBudget: 0, materialActual: 0, nonMaterialBudget: 0, nonMaterialActual: 0 };
    }
    acc[groupKey].materialBudget    += job.material_budget;
    acc[groupKey].materialActual    += job.material_actual;
    acc[groupKey].nonMaterialBudget += job.non_material_budget;
    acc[groupKey].nonMaterialActual += job.non_material_actual;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(groupedData)
    .sort((a, b) => (b.materialBudget + b.nonMaterialBudget) - (a.materialBudget + a.nonMaterialBudget))
    .slice(0, 10);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-background border border-border rounded-xl px-4 py-3 shadow-hover min-w-[200px] animate-scale-in">
        <p className="text-title-sm font-semibold text-foreground mb-2.5 truncate max-w-[220px]">
          {payload[0].payload.name}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-label-lg text-muted-foreground">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: entry.color }}
                />
                {entry.name}
              </span>
              <span className="text-label-lg font-semibold tabular-nums">
                ${formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
        {/* variance row */}
        {payload.length >= 2 && (
          <div className="mt-2.5 pt-2 border-t border-border/60 flex justify-between text-label-md">
            <span className="text-muted-foreground">Variance</span>
            {(() => {
              const budget = payload[0]?.value || 0;
              const actual = payload[1]?.value || 0;
              const delta = actual - budget;
              return (
                <span className={delta > 0 ? "text-destructive font-semibold" : "text-primary font-semibold"}>
                  {delta > 0 ? "+" : ""}${formatCurrency(Math.abs(delta))}
                </span>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-3">
      {payload?.map((entry: any, i: number) => (
        <span key={i} className="flex items-center gap-1.5 text-label-lg text-muted-foreground">
          <span
            className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
            style={{ background: entry.color }}
          />
          {entry.value}
        </span>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AnimatedBarChart size={18} className="text-primary flex-shrink-0" />
            <CardTitle className="text-title-lg">Cost Breakdown by Category</CardTitle>
          </div>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[190px] h-8 text-label-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">By Customer</SelectItem>
              <SelectItem value="sales_person">By Sales Person</SelectItem>
              <SelectItem value="project_manager">By Project Manager</SelectItem>
              <SelectItem value="subcontractor">By Subcontractor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-body-sm">
            No data available for selected grouping
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 12, left: 8, bottom: 90 }}
              barCategoryGap="28%"
              barGap={3}
            >
              <CartesianGrid
                strokeDasharray="0"
                vertical={false}
                stroke="hsl(var(--border))"
                strokeOpacity={0.6}
              />
              <XAxis
                dataKey="name"
                angle={-40}
                textAnchor="end"
                height={96}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.5, radius: 6 } as any}
              />
              <Legend content={<CustomLegend />} />
              <Bar
                dataKey="materialBudget"
                name="Mat. Budget"
                fill={CHART_PALETTE.materialBudget}
                radius={[5, 5, 0, 0]}
                isAnimationActive
                animationDuration={700}
                animationEasing="ease-out"
                maxBarSize={32}
              />
              <Bar
                dataKey="materialActual"
                name="Mat. Actual"
                fill={CHART_PALETTE.materialActual}
                radius={[5, 5, 0, 0]}
                isAnimationActive
                animationDuration={700}
                animationBegin={80}
                animationEasing="ease-out"
                maxBarSize={32}
              />
              <Bar
                dataKey="nonMaterialBudget"
                name="Non-Mat. Budget"
                fill={CHART_PALETTE.nonMaterialBudget}
                radius={[5, 5, 0, 0]}
                isAnimationActive
                animationDuration={700}
                animationBegin={160}
                animationEasing="ease-out"
                maxBarSize={32}
              />
              <Bar
                dataKey="nonMaterialActual"
                name="Non-Mat. Actual"
                fill={CHART_PALETTE.nonMaterialActual}
                radius={[5, 5, 0, 0]}
                isAnimationActive
                animationDuration={700}
                animationBegin={240}
                animationEasing="ease-out"
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
