import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from "recharts";
import type { SoPoRow } from "@/hooks/useInstallationAnalysis";

interface Props {
  rows: SoPoRow[];
}

export function OverquoteChart({ rows }: Props) {
  const matched = rows.filter((r) => r.overquote_ratio !== null);

  const byTypeData = useMemo(() => {
    const groups: Record<string, { soTotal: number; poTotal: number; count: number }> = {};
    for (const r of matched) {
      for (const t of r.product_types) {
        if (!groups[t]) groups[t] = { soTotal: 0, poTotal: 0, count: 0 };
        groups[t].soTotal += r.so_qty;
        groups[t].poTotal += r.po_qty;
        groups[t].count += 1;
      }
    }
    return Object.entries(groups)
      .map(([type, g]) => ({
        type,
        avgQuoted: g.count > 0 ? +(g.soTotal / g.count).toFixed(1) : 0,
        avgActual: g.count > 0 ? +(g.poTotal / g.count).toFixed(1) : 0,
      }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [matched]);

  const bySizeBracket = useMemo(() => {
    const brackets = [
      { label: "< 10 m\u00B2", min: 0, max: 10 },
      { label: "10\u201325 m\u00B2", min: 10, max: 25 },
      { label: "25\u201350 m\u00B2", min: 25, max: 50 },
      { label: "50\u2013100 m\u00B2", min: 50, max: 100 },
      { label: "100+ m\u00B2", min: 100, max: Infinity },
    ];
    return brackets.map((b) => {
      const inBracket = matched.filter(
        (r) => r.platform_area_m2 !== null && r.platform_area_m2 >= b.min && r.platform_area_m2 < b.max
      );
      const avgRatio =
        inBracket.length > 0
          ? +(inBracket.reduce((s, r) => s + (r.overquote_ratio ?? 1), 0) / inBracket.length).toFixed(2)
          : null;
      return { bracket: b.label, avgRatio, count: inBracket.length };
    }).filter((b) => b.count > 0);
  }, [matched]);

  const scatterData = matched.map((r) => ({
    soQty: r.so_qty,
    poQty: r.po_qty,
  }));
  const maxVal = Math.max(...scatterData.map((d) => Math.max(d.soQty, d.poQty)), 10);

  if (matched.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No matched SO-PO pairs available for charting.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Grouped bar: avg quoted vs avg actual by product type */}
      {byTypeData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Quoted vs Actual Days by Product Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis label={{ value: "Days", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgQuoted" name="Avg Quoted (SO)" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avgActual" name="Avg Actual (PO)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scatter: SO qty vs PO qty */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quoted vs Actual (each job)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="soQty" name="Quoted" type="number" domain={[0, maxVal + 2]} />
                <YAxis dataKey="poQty" name="Actual" type="number" domain={[0, maxVal + 2]} />
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: maxVal + 2, y: maxVal + 2 }]}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                />
                <Tooltip formatter={(v: number) => v.toFixed(1)} />
                <Scatter data={scatterData} fill="hsl(var(--primary))" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-1">
              Below the line = overquoted. Above = underquoted.
            </p>
          </CardContent>
        </Card>

        {/* Overquote ratio by size bracket */}
        {bySizeBracket.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Overquote Ratio by Platform Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bySizeBracket}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bracket" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, "auto"]} />
                  <Tooltip
                    formatter={(v: number) => [`${v}x`, "Avg Ratio"]}
                    labelFormatter={(label) => label}
                  />
                  <ReferenceLine y={1} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" label="1.0x" />
                  <Bar dataKey="avgRatio" name="Overquote Ratio" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-1">
                1.0x = perfectly quoted. &gt;1.0x = overquoted.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
