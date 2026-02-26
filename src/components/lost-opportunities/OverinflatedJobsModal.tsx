import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { LostLead } from "@/hooks/useLostOpportunities";
import LeadDetailCard from "./LeadDetailCard";

const FLAG_LABELS: Record<string, { label: string; color: string }> = {
  high_gp: { label: "High GP", color: "bg-amber-100 text-amber-800" },
  high_labour: { label: "High Labour", color: "bg-red-100 text-red-800" },
  high_freight: { label: "High Freight", color: "bg-orange-100 text-orange-800" },
};

const FLAG_KEYS = Object.keys(FLAG_LABELS) as const;
type SortKey = "newest" | "oldest" | "value_high" | "value_low";

function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const fmt = (v: number) =>
  "$" + Math.abs(v).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface Props {
  leads: LostLead[];
  open: boolean;
  onClose: () => void;
}

export default function OverinflatedJobsModal({ leads, open, onClose }: Props) {
  const [selectedLead, setSelectedLead] = useState<LostLead | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [flagFilter, setFlagFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const flaggedLeads = useMemo(
    () => leads.filter((l) => l.flags.length > 0),
    [leads]
  );

  const stageOptions = useMemo(
    () => [...new Set(flaggedLeads.map((l) => l.stage))].sort(),
    [flaggedLeads]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let cutoff = "";
    if (dateFilter === "30d") cutoff = dateOffset(30);
    else if (dateFilter === "90d") cutoff = dateOffset(90);
    else if (dateFilter === "6mo") cutoff = dateOffset(182);
    else if (dateFilter === "1yr") cutoff = dateOffset(365);

    const out = flaggedLeads.filter((l) => {
      if (q && !l.name.toLowerCase().includes(q) && !l.customer.toLowerCase().includes(q)) return false;
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (flagFilter !== "all" && !l.flags.includes(flagFilter)) return false;
      if (cutoff && l.date_lost < cutoff) return false;
      return true;
    });

    switch (sortBy) {
      case "newest": out.sort((a, b) => (b.date_lost || "").localeCompare(a.date_lost || "")); break;
      case "oldest": out.sort((a, b) => (a.date_lost || "").localeCompare(b.date_lost || "")); break;
      case "value_high": out.sort((a, b) => b.revenue - a.revenue); break;
      case "value_low": out.sort((a, b) => a.revenue - b.revenue); break;
    }

    return out;
  }, [flaggedLeads, search, stageFilter, flagFilter, dateFilter, sortBy]);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setSelectedLead(null);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Overinflated Jobs</DialogTitle>
            <DialogDescription>
              {flaggedLeads.length} lost opportunities with high GP, labour, or freight flags
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 -mx-1">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Search name or customer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-[200px] h-8 text-sm"
              />
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {stageOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={flagFilter} onValueChange={setFlagFilter}>
                <SelectTrigger className="w-[140px] h-8 text-sm"><SelectValue placeholder="Flag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Flags</SelectItem>
                  {FLAG_KEYS.map((f) => (
                    <SelectItem key={f} value={f}>{FLAG_LABELS[f].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px] h-8 text-sm"><SelectValue placeholder="Date" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="6mo">Last 6 Months</SelectItem>
                  <SelectItem value="1yr">Last Year</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                <SelectTrigger className="w-[170px] h-8 text-sm"><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Sort: Newest First</SelectItem>
                  <SelectItem value="oldest">Sort: Oldest First</SelectItem>
                  <SelectItem value="value_high">Sort: Highest Value</SelectItem>
                  <SelectItem value="value_low">Sort: Lowest Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-auto flex-1 -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      {flaggedLeads.length === 0 ? "No flagged opportunities." : "No opportunities match filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((l) => (
                    <TableRow
                      key={l.id}
                      className="cursor-pointer hover:bg-muted/60"
                      onClick={() => setSelectedLead(l)}
                    >
                      <TableCell className="font-medium text-xs max-w-[200px] truncate">{l.name}</TableCell>
                      <TableCell className="text-xs max-w-[160px] truncate">{l.customer}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] whitespace-nowrap">{l.stage}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{l.date_lost}</TableCell>
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
                      <TableCell className="text-right text-xs font-medium">
                        {l.revenue > 0 ? fmt(l.revenue) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      <LeadDetailCard
        lead={selectedLead}
        open={selectedLead !== null}
        onClose={() => setSelectedLead(null)}
      />
    </>
  );
}
