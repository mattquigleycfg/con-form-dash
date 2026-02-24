import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ReferenceLine,
} from "recharts";
import type { FreightSummary, FreightSoPoRow } from "@/hooks/useFreightAnalysis";

interface Props {
  summary: FreightSummary;
  rows: FreightSoPoRow[];
}

export function FreightCharts({ summary, rows }: Props) {
  const byTypeData = useMemo(() => {
    return Object.entries(summary.by_product_type || {}).map(([type, d]) => ({
      type,
      "SO Freight": d.so_total,
      "PO Freight": d.po_total,
      gap: d.gap,
    }));
  }, [summary]);

  const byStateData = useMemo(() => {
    return Object.entries(summary.by_state || {}).map(([state, d]) => ({
      state,
      "SO Freight": d.so_total,
      "PO Freight": d.po_total,
      gap: d.gap,
    }));
  }, [summary]);

  const scatterData = useMemo(() => {
    return rows
      .filter((r) => r.so_freight > 0 && r.po_freight > 0)
      .map((r) => ({
        soFreight: r.so_freight,
        poFreight: r.po_freight,
        soRef: r.so_ref,
      }));
  }, [rows]);

  const maxScatter = Math.max(
    ...scatterData.map((d) => Math.max(d.soFreight, d.poFreight)),
    1000
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {byTypeData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                SO vs PO Freight by Product Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                  <Legend />
                  <Bar dataKey="SO Freight" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="PO Freight" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {byStateData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                SO vs PO Freight by State
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byStateData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="state" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, ""]} />
                  <Legend />
                  <Bar dataKey="SO Freight" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="PO Freight" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {scatterData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              SO Freight vs PO Freight (per order)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="soFreight"
                  name="SO Freight"
                  type="number"
                  domain={[0, maxScatter * 1.1]}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  dataKey="poFreight"
                  name="PO Freight"
                  type="number"
                  domain={[0, maxScatter * 1.1]}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: maxScatter * 1.1, y: maxScatter * 1.1 },
                  ]}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  label="Break-even"
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
                />
                <Scatter data={scatterData} fill="hsl(var(--primary))" opacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-1">
              Points below the line = SO freight exceeds PO (positive margin).
              Above = PO costs more than quoted.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
