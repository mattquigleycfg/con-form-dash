import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { SoPoRow } from "@/hooks/useInstallationAnalysis";

interface Props {
  rows: SoPoRow[];
}

function ratioBadge(ratio: number | null) {
  if (ratio === null) return <Badge variant="secondary">N/A</Badge>;
  if (ratio > 1.5) return <Badge variant="destructive">{ratio.toFixed(2)}x</Badge>;
  if (ratio > 1.1) return <Badge className="bg-amber-500 hover:bg-amber-600">{ratio.toFixed(2)}x</Badge>;
  return <Badge className="bg-green-600 hover:bg-green-700">{ratio.toFixed(2)}x</Badge>;
}

export function SoPoComparisonTable({ rows }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");

  const types = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.product_types.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [rows]);

  const states = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.state) set.add(r.state); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search && !r.so_ref.toLowerCase().includes(search.toLowerCase()) &&
          !r.customer.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && !r.product_types.includes(typeFilter)) return false;
      if (stateFilter !== "all" && r.state !== stateFilter) return false;
      return true;
    });
  }, [rows, search, typeFilter, stateFilter]);

  const scatterData = filtered
    .filter((r) => r.overquote_ratio !== null)
    .map((r) => ({
      soQty: r.so_qty,
      poQty: r.po_qty,
      soRef: r.so_ref,
      ratio: r.overquote_ratio,
    }));

  const maxVal = Math.max(
    ...scatterData.map((d) => Math.max(d.soQty, d.poQty)),
    10
  );

  return (
    <div className="space-y-6">
      {/* Scatter: SO qty vs PO qty */}
      {scatterData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Quoted Days (SO) vs Actual Days (PO)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="soQty"
                  name="SO Qty (quoted)"
                  type="number"
                  domain={[0, maxVal + 2]}
                />
                <YAxis
                  dataKey="poQty"
                  name="PO Qty (actual)"
                  type="number"
                  domain={[0, maxVal + 2]}
                />
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: maxVal + 2, y: maxVal + 2 }]}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  label="1:1"
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    value.toFixed(1),
                    name === "SO Qty (quoted)" ? "Quoted" : "Actual",
                  ]}
                />
                <Scatter data={scatterData} fill="hsl(var(--primary))" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-1">
              Points below the dashed line = overquoted (we quoted more days than the sub used)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search SO ref or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All states" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {states.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filtered.length} rows</Badge>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background">SO Ref</TableHead>
                  <TableHead className="sticky top-0 bg-background">Customer</TableHead>
                  <TableHead className="sticky top-0 bg-background">Type</TableHead>
                  <TableHead className="sticky top-0 bg-background">State</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Area m&sup2;</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Quoted</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Actual</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Ratio</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Excess Days</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">SO Rev</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">PO Cost</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => (
                  <TableRow key={`${r.so_ref}-${i}`}>
                    <TableCell className="font-mono text-xs">{r.so_ref}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{r.customer}</TableCell>
                    <TableCell>
                      {r.product_types.map((t) => (
                        <Badge key={t} variant="outline" className="mr-1 text-xs">{t}</Badge>
                      ))}
                    </TableCell>
                    <TableCell>{r.state || "\u2014"}</TableCell>
                    <TableCell className="text-right">
                      {r.platform_area_m2 ? `${r.platform_area_m2}` : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right font-medium">{r.so_qty}</TableCell>
                    <TableCell className="text-right font-medium">{r.po_qty}</TableCell>
                    <TableCell className="text-right">{ratioBadge(r.overquote_ratio)}</TableCell>
                    <TableCell className="text-right">
                      {r.overquote_days !== null ? (
                        <span className={r.overquote_days > 0 ? "text-destructive" : "text-green-600"}>
                          {r.overquote_days > 0 ? `+${r.overquote_days}` : r.overquote_days}
                        </span>
                      ) : "\u2014"}
                    </TableCell>
                    <TableCell className="text-right">
                      ${r.so_revenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${r.po_cost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.margin_pct !== null ? (
                        <span className={r.margin_pct > 0 ? "text-green-600" : "text-destructive"}>
                          {(r.margin_pct * 100).toFixed(0)}%
                        </span>
                      ) : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                      No matched SO-PO pairs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
