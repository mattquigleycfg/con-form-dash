import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, ArrowUpDown, TrendingUp, TrendingDown, Minus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
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
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [recencyFilter, setRecencyFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerScore | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let result = [...data];

    if (segmentFilter !== "all") {
      result = result.filter(c => c.segment === segmentFilter);
    }

    if (recencyFilter !== "all") {
      const maxDays = parseInt(recencyFilter);
      result = result.filter(c => c.recency_days <= maxDays);
    }

    return result;
  }, [data, segmentFilter, recencyFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const mult = sortDir === "asc" ? 1 : -1;
      return (a[sortKey] - b[sortKey]) * mult;
    });
  }, [filtered, sortKey, sortDir]);

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

  const getTrendIcon = (trend: number) => {
    if (trend > 0.05) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (trend < -0.05) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Customer Re-order Scoring</CardTitle>
              <CardDescription className="text-xs">
                {data.length} customers —{" "}
                {segmentCounts.high_value > 0 && <span className="text-emerald-600">{segmentCounts.high_value} high value</span>}
                {segmentCounts.high_value > 0 && segmentCounts.at_risk > 0 && ", "}
                {segmentCounts.at_risk > 0 && <span className="text-red-500">{segmentCounts.at_risk} at risk</span>}
                {segmentCounts.high_value === 0 && segmentCounts.at_risk === 0 && `${segmentCounts.medium_value} medium`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="h-7 text-xs w-[110px]">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Segments</SelectItem>
                  <SelectItem value="high_value">High Value</SelectItem>
                  <SelectItem value="medium_value">Medium</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                </SelectContent>
              </Select>
              <Select value={recencyFilter} onValueChange={setRecencyFilter}>
                <SelectTrigger className="h-7 text-xs w-[100px]">
                  <SelectValue placeholder="Recency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="30">Last 30d</SelectItem>
                  <SelectItem value="90">Last 90d</SelectItem>
                  <SelectItem value="180">Last 180d</SelectItem>
                  <SelectItem value="365">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
            <div className="overflow-auto">
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
                  {sorted.map((c) => (
                    <TableRow
                      key={c.customer_name}
                      className="hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedCustomer(c)}
                    >
                      <TableCell className="text-xs font-medium max-w-[200px] truncate">{c.customer_name}</TableCell>
                      <TableCell className="text-xs">{Math.round(c.reorder_probability * 100)}%</TableCell>
                      <TableCell className="text-xs">{c.total_jobs}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(c.total_revenue)}</TableCell>
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

      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-lg">
          {selectedCustomer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedCustomer.customer_name}
                  <Badge variant="outline" className={`text-xs ${SEGMENT_COLORS[selectedCustomer.segment] || ""}`}>
                    {SEGMENT_LABELS[selectedCustomer.segment] || selectedCustomer.segment}
                  </Badge>
                </DialogTitle>
                <DialogDescription>Customer insights and scoring breakdown</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Re-order Probability</span>
                    <span className="text-lg font-bold">{Math.round(selectedCustomer.reorder_probability * 100)}%</span>
                  </div>
                  <Progress value={selectedCustomer.reorder_probability * 100} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Total Jobs</div>
                    <div className="text-lg font-bold">{selectedCustomer.total_jobs}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Total Revenue</div>
                    <div className="text-lg font-bold">{formatCurrency(selectedCustomer.total_revenue)}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Last Order</div>
                    <div className="text-lg font-bold">{selectedCustomer.recency_days}d ago</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Order Frequency</div>
                    <div className="text-lg font-bold">{selectedCustomer.order_frequency_yearly.toFixed(1)}/yr</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium">Value Trend</span>
                    {getTrendIcon(selectedCustomer.value_trend)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedCustomer.value_trend > 0.05
                      ? `Order values are trending upward (${(selectedCustomer.value_trend * 100).toFixed(0)}%). This customer is growing.`
                      : selectedCustomer.value_trend < -0.05
                        ? `Order values are trending downward (${(selectedCustomer.value_trend * 100).toFixed(0)}%). Consider proactive engagement.`
                        : "Order values are stable. Maintain current relationship."}
                  </p>
                </div>

                {selectedCustomer.segment === "at_risk" && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <p className="text-xs text-red-700 dark:text-red-400 font-medium mb-1">At Risk Customer</p>
                    <p className="text-xs text-red-600 dark:text-red-400/80">
                      {selectedCustomer.recency_days > 180
                        ? "This customer hasn't ordered in over 6 months. Consider reaching out to maintain the relationship."
                        : "This customer shows declining engagement patterns. Proactive follow-up recommended."}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
