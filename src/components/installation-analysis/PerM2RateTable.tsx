import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PerM2Rate, ProductTypeStats } from "@/hooks/useInstallationAnalysis";

interface Props {
  perM2Rates: Record<string, PerM2Rate>;
  byProductType: Record<string, ProductTypeStats>;
}

const SIZE_BRACKETS = [
  { label: "< 10 m\u00B2", min: 0, max: 10 },
  { label: "10\u201325 m\u00B2", min: 10, max: 25 },
  { label: "25\u201350 m\u00B2", min: 25, max: 50 },
  { label: "50\u2013100 m\u00B2", min: 50, max: 100 },
  { label: "100+ m\u00B2", min: 100, max: Infinity },
];

export function PerM2RateTable({ perM2Rates, byProductType }: Props) {
  const [bracket, setBracket] = useState("all");

  const entries = useMemo(() => {
    const rows = Object.entries(perM2Rates)
      .map(([m2, data]) => ({ m2: parseInt(m2, 10), ...data }))
      .sort((a, b) => a.m2 - b.m2);

    if (bracket === "all") return rows;
    const b = SIZE_BRACKETS.find((s) => s.label === bracket);
    if (!b) return rows;
    return rows.filter((r) => r.m2 >= b.min && r.m2 < b.max);
  }, [perM2Rates, bracket]);

  const scatterData = entries.map((e) => ({
    area: e.m2,
    costPerM2: e.avg_install_per_m2,
    platforms: e.platforms,
  }));

  const bracketSummaries = useMemo(() => {
    const allRows = Object.entries(perM2Rates).map(([m2, data]) => ({
      m2: parseInt(m2, 10),
      ...data,
    }));
    return SIZE_BRACKETS.map((b) => {
      const filtered = allRows.filter((r) => r.m2 >= b.min && r.m2 < b.max);
      if (filtered.length === 0) return { ...b, count: 0, avgPerM2: 0, avgUnits: 0 };
      const totalCost = filtered.reduce((s, r) => s + r.avg_install_cost_per_plat * r.platforms, 0);
      const totalArea = filtered.reduce((s, r) => s + r.m2 * r.platforms, 0);
      const totalUnits = filtered.reduce((s, r) => s + r.avg_install_units_per_plat * r.platforms, 0);
      const totalPlats = filtered.reduce((s, r) => s + r.platforms, 0);
      return {
        ...b,
        count: totalPlats,
        avgPerM2: totalArea > 0 ? Math.round(totalCost / totalArea) : 0,
        avgUnits: totalPlats > 0 ? (totalUnits / totalPlats).toFixed(1) : "0",
      };
    });
  }, [perM2Rates]);

  return (
    <div className="space-y-6">
      {/* Bracket summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {bracketSummaries.map((b) => (
          <Card key={b.label} className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setBracket(bracket === b.label ? "all" : b.label)}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{b.label}</p>
              <p className="text-xl font-bold">
                ${b.avgPerM2.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/m&sup2;</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {b.avgUnits} units avg &middot; {b.count} platforms
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scatter chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Install Cost / m&sup2; by Platform Area
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="area" name="Area (m&sup2;)" unit=" m&sup2;" type="number" />
              <YAxis dataKey="costPerM2" name="$/m&sup2;" unit="$" type="number" />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "$/m\u00B2" ? [`$${value.toLocaleString()}`, name] : [value, name]
                }
              />
              <Scatter data={scatterData} fill="hsl(var(--primary))" opacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={bracket} onValueChange={setBracket}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All sizes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sizes</SelectItem>
            {SIZE_BRACKETS.map((b) => (
              <SelectItem key={b.label} value={b.label}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{entries.length} rows</Badge>
      </div>

      {/* Detailed table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background">Area (m&sup2;)</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Platforms</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Avg Units/Plat</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Avg Cost/Plat</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Avg $/m&sup2;</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Avg Units/m&sup2;</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => (
                  <TableRow key={e.m2}>
                    <TableCell className="font-medium">{e.m2} m&sup2;</TableCell>
                    <TableCell className="text-right">{e.platforms}</TableCell>
                    <TableCell className="text-right">{e.avg_install_units_per_plat}</TableCell>
                    <TableCell className="text-right">
                      ${e.avg_install_cost_per_plat.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${e.avg_install_per_m2.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{e.avg_units_per_m2}</TableCell>
                  </TableRow>
                ))}
                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No per-m&sup2; data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* By product type */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">By Product Type</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Qty</TableHead>
                <TableHead className="text-right">Avg Qty/Order</TableHead>
                <TableHead className="text-right">Avg $/Unit</TableHead>
                <TableHead className="text-right">Avg Area</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(byProductType).map(([type, stats]) => (
                <TableRow key={type}>
                  <TableCell>
                    <Badge variant="outline">{type}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{stats.order_count}</TableCell>
                  <TableCell className="text-right">{stats.total_install_qty}</TableCell>
                  <TableCell className="text-right">{stats.avg_qty_per_order}</TableCell>
                  <TableCell className="text-right">
                    ${stats.avg_price_per_unit.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {stats.avg_area_m2 ? `${stats.avg_area_m2} m\u00B2` : "\u2014"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
