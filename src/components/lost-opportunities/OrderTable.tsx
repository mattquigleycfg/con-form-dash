import { useState, useMemo, useEffect } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import type { LostLead, FilterOptions } from "@/hooks/useLostOpportunities";
import LeadDetailCard from "./LeadDetailCard";

const PAGE_SIZES = [25, 50, 100, 200] as const;

interface Props {
  leads: LostLead[];
  filterOptions: FilterOptions;
}

const STATE_RATES: Record<string, number> = {
  NSW: 1450, QLD: 1365, WA: 1550, VIC: 2180, SA: 2180, TAS: 1450,
};

const fmt = (v: number) =>
  "$" + Math.abs(v).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  high_gp: { label: "High GP", color: "bg-amber-100 text-amber-800" },
  high_labour: { label: "High Labour", color: "bg-red-100 text-red-800" },
  high_freight: { label: "High Freight", color: "bg-orange-100 text-orange-800" },
};

type SortKey = "newest" | "oldest" | "value_high" | "value_low" | "salesperson" | "reason";

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function buildHoverContent(l: LostLead) {
  const parts: { label: string; value: string; status: string }[] = [];

  if (l.quote_labour > 0 && l.labour_qty > 0) {
    const rate = l.quote_labour / l.labour_qty;
    const bench = l.quote_state ? STATE_RATES[l.quote_state] : null;
    const variance = bench ? ((rate - bench) / bench) * 100 : null;
    parts.push({
      label: `Labour (${l.quote_state || "?"})`,
      value: `${fmt(rate)}/day${bench ? ` vs ${fmt(bench)} bench` : ""}`,
      status: variance != null ? (variance > 25 ? "red" : variance > 10 ? "amber" : "green") : "neutral",
    });
  }

  if (l.quote_freight > 0 && l.quote_total > 0) {
    const pct = (l.quote_freight / l.quote_total) * 100;
    parts.push({
      label: "Freight",
      value: `${fmt(l.quote_freight)} (${pct.toFixed(1)}% of quote)`,
      status: pct > 5 ? "amber" : "green",
    });
  }

  if (l.margin_pct > 0) {
    parts.push({
      label: "Product GP",
      value: `${l.margin_pct.toFixed(1)}%`,
      status: l.margin_pct > 40 ? "amber" : "green",
    });
  }

  return parts;
}

const STATUS_DOT: Record<string, string> = {
  red: "bg-red-500", amber: "bg-amber-500", green: "bg-green-500", neutral: "bg-gray-400",
};

export default function OrderTable({ leads, filterOptions }: Props) {
  const [search, setSearch] = useState("");
  const [spFilter, setSpFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [valueFilter, setValueFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [selectedLead, setSelectedLead] = useState<LostLead | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let cutoff = "";
    if (dateFilter === "30d") cutoff = dateOffset(30);
    else if (dateFilter === "90d") cutoff = dateOffset(90);
    else if (dateFilter === "6mo") cutoff = dateOffset(182);
    else if (dateFilter === "1yr") cutoff = dateOffset(365);

    const out = leads.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q) && !l.customer.toLowerCase().includes(q)) return false;
      if (spFilter !== "all" && l.salesperson !== spFilter) return false;
      if (reasonFilter !== "all" && l.lost_reason !== reasonFilter) return false;
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (valueFilter === "under50k" && l.revenue >= 50000) return false;
      if (valueFilter === "50k-200k" && (l.revenue < 50000 || l.revenue >= 200000)) return false;
      if (valueFilter === "200k-500k" && (l.revenue < 200000 || l.revenue >= 500000)) return false;
      if (valueFilter === "over500k" && l.revenue < 500000) return false;
      if (cutoff && l.date_lost < cutoff) return false;
      return true;
    });

    switch (sortBy) {
      case "newest": out.sort((a, b) => (b.date_lost || "").localeCompare(a.date_lost || "")); break;
      case "oldest": out.sort((a, b) => (a.date_lost || "").localeCompare(b.date_lost || "")); break;
      case "value_high": out.sort((a, b) => b.revenue - a.revenue); break;
      case "value_low": out.sort((a, b) => a.revenue - b.revenue); break;
      case "salesperson": out.sort((a, b) => a.salesperson.localeCompare(b.salesperson)); break;
      case "reason": out.sort((a, b) => a.lost_reason.localeCompare(b.lost_reason)); break;
    }

    return out;
  }, [leads, search, spFilter, reasonFilter, stageFilter, valueFilter, dateFilter, sortBy]);

  useEffect(() => {
    setPage(1);
  }, [search, spFilter, reasonFilter, stageFilter, valueFilter, dateFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const paginatedRows = filtered.slice(startIdx, startIdx + pageSize);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Filters row 1 */}
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
        </div>

        {/* Filters row 2 */}
        <div className="flex flex-wrap gap-3">
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
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="6mo">Last 6 Months</SelectItem>
              <SelectItem value="1yr">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Sort: Newest First</SelectItem>
              <SelectItem value="oldest">Sort: Oldest First</SelectItem>
              <SelectItem value="value_high">Sort: Highest Value</SelectItem>
              <SelectItem value="value_low">Sort: Lowest Value</SelectItem>
              <SelectItem value="salesperson">Sort: Salesperson</SelectItem>
              <SelectItem value="reason">Sort: Lost Reason</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[100px]"><SelectValue placeholder="Per page" /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>{n} per page</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="self-center text-sm text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)} of {filtered.length}
          </span>
        </div>

        {/* Table */}
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
                <TableHead>Flags</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No opportunities match filters.
                  </TableCell>
                </TableRow>
              )}
              {paginatedRows.map((l) => {
                const hoverParts = buildHoverContent(l);
                const hasHover = hoverParts.length > 0;

                const row = (
                  <TableRow
                    key={l.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/60 ${l.flags.length > 0 ? "bg-amber-50/40" : ""}`}
                    onClick={() => setSelectedLead(l)}
                  >
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">{l.name}</TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">{l.customer}</TableCell>
                    <TableCell className="text-xs">{l.salesperson}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] whitespace-nowrap">{l.stage}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">{l.lost_reason}</TableCell>
                    <TableCell className="text-right text-xs font-medium">{l.revenue > 0 ? fmt(l.revenue) : "—"}</TableCell>
                    <TableCell className="text-right text-xs">{l.has_quote ? fmt(l.quote_total) : "—"}</TableCell>
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
                );

                if (!hasHover) return row;

                return (
                  <Tooltip key={l.id}>
                    <TooltipTrigger asChild>{row}</TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs p-3">
                      <div className="space-y-1.5">
                        <p className="font-medium text-xs mb-1">Margin Snapshot</p>
                        {hoverParts.map((p) => (
                          <div key={p.label} className="flex items-center gap-2 text-xs">
                            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[p.status]}`} />
                            <span className="font-medium">{p.label}:</span>
                            <span className="text-muted-foreground">{p.value}</span>
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filtered.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageNum);
                        }}
                        isActive={page === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {/* Detail card */}
        <LeadDetailCard
          lead={selectedLead}
          open={selectedLead !== null}
          onClose={() => setSelectedLead(null)}
        />
      </div>
    </TooltipProvider>
  );
}
