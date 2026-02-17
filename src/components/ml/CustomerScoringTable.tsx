import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CustomerScore } from "@/hooks/useMLPredictions";

interface CustomerScoringTableProps {
  data: CustomerScore[];
}

const SEGMENT_COLORS: Record<string, string> = {
  high_value: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  medium_value: "bg-amber-500/10 text-amber-600 border-amber-200",
  at_risk: "bg-red-500/10 text-red-600 border-red-200",
};

const SEGMENT_LABELS: Record<string, string> = {
  high_value: "High Value",
  medium_value: "Medium",
  at_risk: "At Risk",
};

type SortKey = "reorder_probability" | "total_revenue" | "recency_days" | "total_jobs";

export function CustomerScoringTable({ data }: CustomerScoringTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("total_revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...data].sort((a, b) => {
    const mult = sortDir === "asc" ? 1 : -1;
    return (a[sortKey] - b[sortKey]) * mult;
  });

  const lowVariance = useMemo(() => {
    if (data.length < 5) return false;
    const probs = data.map((d) => d.reorder_probability);
    const min = Math.min(...probs);
    const max = Math.max(...probs);
    return (max - min) < 0.1;
  }, [data]);

  const segmentCounts = useMemo(() => {
    const counts = { high_value: 0, medium_value: 0, at_risk: 0 };
    data.forEach((d) => { counts[d.segment] = (counts[d.segment] || 0) + 1; });
    return counts;
  }, [data]);

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-xs" onClick={() => toggleSort(field)}>
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Customer Re-order Scoring</CardTitle>
        <CardDescription className="text-xs">
          {data.length} customers —{" "}
          {segmentCounts.high_value > 0 && <span className="text-emerald-600">{segmentCounts.high_value} high value</span>}
          {segmentCounts.high_value > 0 && segmentCounts.at_risk > 0 && ", "}
          {segmentCounts.at_risk > 0 && <span className="text-red-500">{segmentCounts.at_risk} at risk</span>}
          {segmentCounts.high_value === 0 && segmentCounts.at_risk === 0 && `${segmentCounts.medium_value} medium`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lowVariance && (
          <div className="flex items-center gap-2 mb-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Re-order scores have low variance — the model may need retraining with more data. Sort by Revenue or Recency for more useful ranking.
            </p>
          </div>
        )}
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">No customer data available</div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs"><SortHeader label="Re-order %" field="reorder_probability" /></TableHead>
                  <TableHead className="text-xs"><SortHeader label="Jobs" field="total_jobs" /></TableHead>
                  <TableHead className="text-xs"><SortHeader label="Revenue" field="total_revenue" /></TableHead>
                  <TableHead className="text-xs"><SortHeader label="Recency" field="recency_days" /></TableHead>
                  <TableHead className="text-xs">Segment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.slice(0, 50).map((c) => (
                  <TableRow key={c.customer_name}>
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">{c.customer_name}</TableCell>
                    <TableCell className="text-xs">{Math.round(c.reorder_probability * 100)}%</TableCell>
                    <TableCell className="text-xs">{c.total_jobs}</TableCell>
                    <TableCell className="text-xs">${c.total_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-xs">{c.recency_days}d ago</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${SEGMENT_COLORS[c.segment] || ""}`}>
                        {SEGMENT_LABELS[c.segment] || c.segment}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
