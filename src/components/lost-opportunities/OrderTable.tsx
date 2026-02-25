import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { LostLead, FilterOptions } from "@/hooks/useLostOpportunities";

interface Props {
  leads: LostLead[];
  filterOptions: FilterOptions;
}

const fmt = (v: number) =>
  "$" + Math.abs(v).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  high_gp: { label: "High GP", color: "bg-amber-100 text-amber-800" },
  high_labour: { label: "High Labour", color: "bg-red-100 text-red-800" },
  high_freight: { label: "High Freight", color: "bg-orange-100 text-orange-800" },
};

export default function OrderTable({ leads, filterOptions }: Props) {
  const [search, setSearch] = useState("");
  const [spFilter, setSpFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [valueFilter, setValueFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q) && !l.customer.toLowerCase().includes(q)) return false;
      if (spFilter !== "all" && l.salesperson !== spFilter) return false;
      if (reasonFilter !== "all" && l.lost_reason !== reasonFilter) return false;
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (valueFilter === "under50k" && l.revenue >= 50000) return false;
      if (valueFilter === "50k-200k" && (l.revenue < 50000 || l.revenue >= 200000)) return false;
      if (valueFilter === "200k-500k" && (l.revenue < 200000 || l.revenue >= 500000)) return false;
      if (valueFilter === "over500k" && l.revenue < 500000) return false;
      return true;
    });
  }, [leads, search, spFilter, reasonFilter, stageFilter, valueFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={spFilter} onValueChange={setSpFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Salesperson" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Salespersons</SelectItem>
            {filterOptions.salespersons.map((sp) => (
              <SelectItem key={sp} value={sp}>{sp}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={reasonFilter} onValueChange={setReasonFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Lost Reason" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reasons</SelectItem>
            {filterOptions.reasons.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Stage" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {filterOptions.stages.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={valueFilter} onValueChange={setValueFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Value" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Values</SelectItem>
            <SelectItem value="under50k">Under $50K</SelectItem>
            <SelectItem value="50k-200k">$50K – $200K</SelectItem>
            <SelectItem value="200k-500k">$200K – $500K</SelectItem>
            <SelectItem value="over500k">Over $500K</SelectItem>
          </SelectContent>
        </Select>
        <span className="self-center text-sm text-muted-foreground">
          {filtered.length} / {leads.length}
        </span>
      </div>

      <div className="rounded-md border max-h-[600px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Opportunity</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Salesperson</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Lost Reason</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right">Quote</TableHead>
              <TableHead className="text-right">Labour</TableHead>
              <TableHead className="text-right">Freight</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  No opportunities match filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((l) => (
              <TableRow key={l.id} className={l.flags.length > 0 ? "bg-amber-50/40" : ""}>
                <TableCell className="text-xs font-medium max-w-[200px] truncate">{l.name}</TableCell>
                <TableCell className="text-xs max-w-[160px] truncate">{l.customer}</TableCell>
                <TableCell className="text-xs">{l.salesperson}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] whitespace-nowrap">{l.stage}</Badge>
                </TableCell>
                <TableCell className="text-xs max-w-[160px] truncate">{l.lost_reason}</TableCell>
                <TableCell className="text-right text-xs font-medium">{l.revenue > 0 ? fmt(l.revenue) : "—"}</TableCell>
                <TableCell className="text-right text-xs">{l.has_quote ? fmt(l.quote_total) : "—"}</TableCell>
                <TableCell className="text-right text-xs">{l.quote_labour > 0 ? fmt(l.quote_labour) : "—"}</TableCell>
                <TableCell className="text-right text-xs">{l.quote_freight > 0 ? fmt(l.quote_freight) : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {l.flags.map((f) => {
                      const fl = FLAG_LABELS[f];
                      return fl ? (
                        <Badge key={f} className={`${fl.color} text-[9px]`}>{fl.label}</Badge>
                      ) : null;
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.date_lost}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
