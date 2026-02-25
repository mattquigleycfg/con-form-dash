import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { LostOppOrder } from "@/hooks/useLostOpportunities";

interface Props {
  orders: LostOppOrder[];
  gpThreshold: number;
}

const fmt = (v: number) =>
  "$" + Math.abs(v).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function gpBadge(gp: number, threshold: number) {
  if (gp < 0) return <Badge variant="destructive">{(gp * 100).toFixed(1)}%</Badge>;
  if (gp > threshold) return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">{(gp * 100).toFixed(1)}%</Badge>;
  return <Badge variant="secondary">{(gp * 100).toFixed(1)}%</Badge>;
}

export default function OrderTable({ orders, gpThreshold }: Props) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [gpFilter, setGpFilter] = useState("all");

  const types = useMemo(
    () => [...new Set(orders.flatMap((o) => o.product_types))].sort(),
    [orders],
  );
  const states = useMemo(
    () => [...new Set(orders.map((o) => o.state).filter(Boolean))].sort() as string[],
    [orders],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      if (q && !o.so_ref.toLowerCase().includes(q) && !o.customer.toLowerCase().includes(q)) return false;
      if (typeFilter !== "all" && !o.product_types.includes(typeFilter)) return false;
      if (stateFilter !== "all" && o.state !== stateFilter) return false;
      if (gpFilter === "over" && !o.is_over_estimate) return false;
      if (gpFilter === "under" && o.gp >= 0) return false;
      if (gpFilter === "normal" && (o.is_over_estimate || o.gp < 0)) return false;
      return true;
    });
  }, [orders, search, typeFilter, stateFilter, gpFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search SO or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={gpFilter} onValueChange={setGpFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="GP Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All GP</SelectItem>
            <SelectItem value="over">Over {(gpThreshold * 100).toFixed(0)}%</SelectItem>
            <SelectItem value="normal">0–{(gpThreshold * 100).toFixed(0)}%</SelectItem>
            <SelectItem value="under">Negative GP</SelectItem>
          </SelectContent>
        </Select>
        <span className="self-center text-sm text-muted-foreground">
          {filtered.length} / {orders.length} orders
        </span>
      </div>

      <div className="rounded-md border max-h-[600px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>SO Ref</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Labour</TableHead>
              <TableHead className="text-right">Freight</TableHead>
              <TableHead className="text-right">Product</TableHead>
              <TableHead className="text-right">COGS</TableHead>
              <TableHead className="text-center">GP</TableHead>
              <TableHead className="text-right">Excess</TableHead>
              <TableHead>Match</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground">
                  No orders match filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((o, idx) => (
              <TableRow
                key={`${o.so_ref}-${idx}`}
                className={o.is_over_estimate ? "bg-amber-50/50" : o.gp < 0 ? "bg-red-50/40" : ""}
              >
                <TableCell className="font-mono text-xs whitespace-nowrap">{o.so_ref}</TableCell>
                <TableCell className="max-w-[180px] truncate text-xs">{o.customer}</TableCell>
                <TableCell className="text-xs">{o.product_types.join(", ")}</TableCell>
                <TableCell className="text-xs">{o.state || "—"}</TableCell>
                <TableCell className="text-right text-xs">{fmt(o.revenue)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(o.cogs_labour)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(o.cogs_freight)}</TableCell>
                <TableCell className="text-right text-xs">{fmt(o.cogs_product)}</TableCell>
                <TableCell className="text-right text-xs font-medium">{fmt(o.total_cogs)}</TableCell>
                <TableCell className="text-center">{gpBadge(o.gp, gpThreshold)}</TableCell>
                <TableCell className="text-right text-xs">
                  {o.excess_value > 0 ? fmt(o.excess_value) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">{o.match_method}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
