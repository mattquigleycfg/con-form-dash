import { useMemo, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { FreightSoPoRow } from "@/hooks/useFreightAnalysis";

interface Props {
  rows: FreightSoPoRow[];
}

function gapBadge(gap: number, pct: number | null) {
  const label = pct !== null ? `${(pct * 100).toFixed(0)}%` : "$" + Math.abs(gap).toLocaleString();
  if (gap > 100) return <Badge className="bg-green-600 hover:bg-green-700">{label}</Badge>;
  if (gap < -100) return <Badge variant="destructive">{label}</Badge>;
  return <Badge variant="secondary">{label}</Badge>;
}

export function FreightGapTable({ rows }: Props) {
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

  return (
    <div className="space-y-4">
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
                  <TableHead className="sticky top-0 bg-background text-right">SO Freight</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">PO Freight</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Gap</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Margin</TableHead>
                  <TableHead className="sticky top-0 bg-background">Vendors</TableHead>
                  <TableHead className="sticky top-0 bg-background">Match</TableHead>
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
                    <TableCell className="text-right font-medium">
                      ${r.so_freight.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${r.po_freight.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={r.gap > 0 ? "text-green-600" : r.gap < 0 ? "text-destructive" : ""}>
                        {r.gap > 0 ? "+" : ""}${r.gap.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {gapBadge(r.gap, r.gap_pct)}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground">
                      {r.vendors.join(", ") || "\u2014"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.match_method}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No matched freight pairs found
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
