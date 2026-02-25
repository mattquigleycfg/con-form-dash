import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import type {
  ReasonBreakdown, StageBreakdown, SalespersonBreakdown,
} from "@/hooks/useLostOpportunities";

interface Props {
  byReason: ReasonBreakdown[];
  byStage: StageBreakdown[];
  bySalesperson: SalespersonBreakdown[];
}

const REASON_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#6366f1", "#f43f5e",
  "#a855f7", "#06b6d4", "#84cc16", "#d946ef", "#0ea5e9",
];

const fmt = (v: number) =>
  "$" + Math.abs(v).toLocaleString("en-AU", { maximumFractionDigits: 0 });

export default function ProfitCharts({ byReason, byStage, bySalesperson }: Props) {
  const reasonPie = useMemo(
    () => byReason.slice(0, 12).map((r) => ({ name: r.reason, value: r.count })),
    [byReason],
  );

  const stageBar = useMemo(
    () => byStage.map((s) => ({ stage: s.stage, count: s.count, value: s.value })),
    [byStage],
  );

  const spBar = useMemo(
    () => bySalesperson.slice(0, 15).map((sp) => ({
      name: sp.salesperson.split(" ").slice(0, 2).join(" "),
      count: sp.count,
      value: sp.value,
    })),
    [bySalesperson],
  );

  const reasonBar = useMemo(
    () => byReason.map((r) => ({
      reason: r.reason.length > 25 ? r.reason.slice(0, 22) + "…" : r.reason,
      count: r.count,
      value: r.value,
    })),
    [byReason],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Lost Reason - Bar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Lost Reasons</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(280, reasonBar.length * 28)}>
            <BarChart data={reasonBar} layout="vertical" margin={{ left: 140 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="reason" type="category" tick={{ fontSize: 11 }} width={140} />
              <Tooltip formatter={(v: number, name: string) =>
                name === "value" ? fmt(v) : v
              } />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Count" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lost Reason Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lost Reasons (% share)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={reasonPie}
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ name, percent }) =>
                  `${name.length > 18 ? name.slice(0, 15) + "…" : name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
                dataKey="value"
              >
                {reasonPie.map((_, i) => (
                  <Cell key={i} fill={REASON_COLORS[i % REASON_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pipeline Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pipeline Stage at Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={stageBar}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={80} />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(v: number, name: string) =>
                name === "value" ? fmt(v) : v
              } />
              <Legend />
              <Bar dataKey="count" fill="#6366f1" name="Count" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Value lost by Salesperson */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Value Lost by Salesperson</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={spBar}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="value" fill="#f97316" name="Value Lost" radius={[4, 4, 0, 0]} />
              <Bar dataKey="count" fill="#3b82f6" name="Deals Lost" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
