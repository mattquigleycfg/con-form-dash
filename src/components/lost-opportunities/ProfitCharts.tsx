import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ReferenceLine,
  Cell, PieChart, Pie,
} from "recharts";
import type { LostOppOrder, LostOppSummary } from "@/hooks/useLostOpportunities";

interface Props {
  orders: LostOppOrder[];
  summary: LostOppSummary;
}

const COLORS = {
  revenue: "#3b82f6",
  cogs: "#f97316",
  labour: "#6366f1",
  freight: "#f59e0b",
  product: "#10b981",
  excess: "#ef4444",
};

const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981"];

const fmt = (v: number) =>
  "$" + Math.abs(v).toLocaleString("en-AU", { maximumFractionDigits: 0 });

export default function ProfitCharts({ orders, summary }: Props) {
  const typeData = useMemo(
    () =>
      Object.entries(summary.by_product_type).map(([type, d]) => ({
        type,
        revenue: d.revenue,
        cogs: d.cogs,
        gp_pct: +(d.gp * 100).toFixed(1),
      })),
    [summary],
  );

  const stateData = useMemo(
    () =>
      Object.entries(summary.by_state).map(([state, d]) => ({
        state,
        revenue: d.revenue,
        cogs: d.cogs,
        gp_pct: +(d.gp * 100).toFixed(1),
      })),
    [summary],
  );

  const gpDistribution = useMemo(() => {
    const buckets: Record<string, number> = {
      "< 0%": 0, "0–20%": 0, "20–30%": 0, "30–40%": 0,
      "40–50%": 0, "50–60%": 0, "60–80%": 0, "> 80%": 0,
    };
    for (const o of orders) {
      const g = o.gp * 100;
      if (g < 0) buckets["< 0%"]++;
      else if (g < 20) buckets["0–20%"]++;
      else if (g < 30) buckets["20–30%"]++;
      else if (g < 40) buckets["30–40%"]++;
      else if (g < 50) buckets["40–50%"]++;
      else if (g < 60) buckets["50–60%"]++;
      else if (g < 80) buckets["60–80%"]++;
      else buckets["> 80%"]++;
    }
    return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
  }, [orders]);

  const scatterData = useMemo(
    () =>
      orders.map((o) => ({
        revenue: o.revenue,
        cogs: o.total_cogs,
        name: o.so_ref,
        over: o.is_over_estimate,
      })),
    [orders],
  );

  const costBreakdown = useMemo(
    () => [
      { name: "Labour", value: summary.total_labour_cost },
      { name: "Freight", value: summary.total_freight_cost },
      { name: "Product", value: summary.total_product_cost },
    ],
    [summary],
  );

  const maxAxis = useMemo(() => {
    const m = Math.max(...orders.map((o) => Math.max(o.revenue, o.total_cogs)), 0);
    return Math.ceil(m * 1.1);
  }, [orders]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* GP Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">GP Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={gpDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS.revenue} radius={[4, 4, 0, 0]}>
                {gpDistribution.map((entry) => (
                  <Cell
                    key={entry.bucket}
                    fill={
                      entry.bucket === "< 0%"
                        ? COLORS.excess
                        : entry.bucket.startsWith("4") ||
                          entry.bucket.startsWith("5") ||
                          entry.bucket.startsWith("6") ||
                          entry.bucket.startsWith(">")
                        ? COLORS.freight
                        : COLORS.revenue
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* COGS Breakdown Pie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">COGS Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={costBreakdown}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${fmt(value)}`}
                dataKey="value"
              >
                {costBreakdown.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue vs COGS by Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revenue vs COGS by Product Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="revenue" fill={COLORS.revenue} name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cogs" fill={COLORS.cogs} name="COGS" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue vs COGS by State */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Revenue vs COGS by State</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="state" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="revenue" fill={COLORS.revenue} name="Revenue" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cogs" fill={COLORS.cogs} name="COGS" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scatter: Revenue vs COGS */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm">Revenue vs COGS per Order</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="revenue"
                name="Revenue"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                domain={[0, maxAxis]}
              />
              <YAxis
                type="number"
                dataKey="cogs"
                name="COGS"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                domain={[0, maxAxis]}
              />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                labelFormatter={(_, payload) =>
                  payload?.[0]?.payload?.name || ""
                }
              />
              <Legend />
              <ReferenceLine
                segment={[{ x: 0, y: 0 }, { x: maxAxis, y: maxAxis }]}
                stroke="#94a3b8"
                strokeDasharray="5 5"
                label="Break-even"
              />
              <ReferenceLine
                segment={[{ x: 0, y: 0 }, { x: maxAxis, y: maxAxis * 0.6 }]}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label="40% GP"
              />
              <Scatter
                name="Normal GP"
                data={scatterData.filter((d) => !d.over)}
                fill={COLORS.revenue}
                opacity={0.6}
              />
              <Scatter
                name={`GP > ${(summary.gp_threshold * 100).toFixed(0)}%`}
                data={scatterData.filter((d) => d.over)}
                fill={COLORS.freight}
                opacity={0.7}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
