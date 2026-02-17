import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, ArrowUpDown, TrendingUp, TrendingDown, Minus, Filter, Mail, Phone, FileText, Users, DollarSign, Clock, Download, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [isExporting, setIsExporting] = useState(false);

  // Batch-fetch customer emails from Odoo (res.partner with customer_rank > 0)
  const customerNames = useMemo(() => data.map(c => c.customer_name), [data]);
  const { data: customerEmails } = useQuery({
    queryKey: ["odoo-customer-emails", customerNames.length],
    queryFn: async () => {
      if (customerNames.length === 0) return new Map<string, { email: string; phone: string }>();

      // Fetch in batches of 100 to avoid Odoo limits
      const batchSize = 100;
      const allResults: any[] = [];
      for (let i = 0; i < customerNames.length; i += batchSize) {
        const batch = customerNames.slice(i, i + batchSize);
        const { data: partners, error } = await supabase.functions.invoke("odoo-query", {
          body: {
            model: "res.partner",
            method: "search_read",
            args: [
              [["name", "in", batch], ["customer_rank", ">", 0]],
              ["id", "name", "email", "phone", "mobile"],
              0,
              batchSize,
            ],
          },
        });
        if (!error && Array.isArray(partners)) {
          allResults.push(...partners);
        }
      }

      const map = new Map<string, { email: string; phone: string }>();
      for (const p of allResults) {
        const email = (p.email && p.email !== false) ? String(p.email) : "";
        const phone = (p.phone && p.phone !== false) ? String(p.phone) : (p.mobile && p.mobile !== false) ? String(p.mobile) : "";
        if (!map.has(p.name)) {
          map.set(p.name, { email, phone });
        }
      }
      return map;
    },
    staleTime: 10 * 60 * 1000,
    enabled: customerNames.length > 0,
  });

  const getCustomerContact = (name: string) => customerEmails?.get(name) || { email: "", phone: "" };

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
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (trend < 0) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  /**
   * Format value_trend into a readable description.
   * The ML model returns raw coefficients that can be very large —
   * we classify into qualitative bands rather than showing raw %.
   */
  const formatTrend = (trend: number): { label: string; description: string } => {
    const abs = Math.abs(trend);
    if (abs < 0.01) return { label: "Stable", description: "Order values are stable. Maintain current relationship." };
    if (trend > 0) {
      if (abs > 10) return { label: "Strong growth", description: "Order values are trending significantly upward. This is a high-growth customer." };
      if (abs > 1) return { label: "Growing", description: "Order values are trending upward. This customer is growing." };
      return { label: "Slight growth", description: "Order values show a slight upward trend." };
    }
    if (abs > 10) return { label: "Sharp decline", description: "Order values are trending significantly downward. Consider urgent engagement." };
    if (abs > 1) return { label: "Declining", description: "Order values are trending downward. Consider proactive engagement." };
    return { label: "Slight decline", description: "Order values show a slight downward trend." };
  };

  // Aggregate stats for summary
  const summaryStats = useMemo(() => {
    if (data.length === 0) return null;
    const totalRevenue = data.reduce((sum, c) => sum + c.total_revenue, 0);
    const totalJobs = data.reduce((sum, c) => sum + c.total_jobs, 0);
    const avgRecency = Math.round(data.reduce((sum, c) => sum + c.recency_days, 0) / data.length);
    const avgFrequency = (data.reduce((sum, c) => sum + c.order_frequency_yearly, 0) / data.length).toFixed(1);
    const activeCustomers = data.filter(c => c.recency_days <= 90).length;
    const topCustomer = [...data].sort((a, b) => b.total_revenue - a.total_revenue)[0];
    return { totalRevenue, totalJobs, avgRecency, avgFrequency, activeCustomers, topCustomer };
  }, [data]);

  // CSV Export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const SEGMENT_LABELS_MAP: Record<string, string> = {
        high_value: "High Value",
        medium_value: "Medium",
        at_risk: "At Risk",
      };

      const headers = [
        "Customer",
        "Email",
        "Phone",
        "Re-order %",
        "Total Jobs",
        "Total Revenue",
        "Recency (days)",
        "Order Frequency (yr)",
        "Value Trend",
        "Segment",
      ];

      const rows = sorted.map((c) => {
        const contact = getCustomerContact(c.customer_name);
        return [
          `"${c.customer_name.replace(/"/g, '""')}"`,
          `"${contact.email}"`,
          `"${contact.phone}"`,
          `${Math.round(c.reorder_probability * 100)}%`,
          c.total_jobs,
          c.total_revenue.toFixed(2),
          c.recency_days,
          c.order_frequency_yearly.toFixed(1),
          formatTrend(c.value_trend).label,
          SEGMENT_LABELS_MAP[c.segment] || c.segment,
        ].join(",");
      });

      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `customer-scoring-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${rows.length} customers to CSV`);
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export customer data");
    } finally {
      setIsExporting(false);
    }
  }, [sorted, customerEmails]);

  return (
    <>
      {/* Customer Summary Cards */}
      {summaryStats && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-4">
          <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-[10px] text-muted-foreground font-medium">Total Customers</span>
              </div>
              <p className="text-lg font-bold">{data.length}</p>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-[10px] text-muted-foreground font-medium">Total Revenue</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(summaryStats.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">Total Jobs</span>
              </div>
              <p className="text-lg font-bold">{summaryStats.totalJobs}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">Avg Recency</span>
              </div>
              <p className="text-lg font-bold">{summaryStats.avgRecency}d</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[10px] text-muted-foreground font-medium">Active (90d)</span>
              </div>
              <p className="text-lg font-bold">{summaryStats.activeCustomers}</p>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-[10px] text-muted-foreground font-medium">At Risk</span>
              </div>
              <p className="text-lg font-bold">{segmentCounts.at_risk}</p>
            </CardContent>
          </Card>
        </div>
      )}

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
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleExport}
                disabled={isExporting || sorted.length === 0}
              >
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export CSV
              </Button>
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
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs"><SortHeader label="Re-order %" field="reorder_probability" /></TableHead>
                    <TableHead className="text-xs"><SortHeader label="Jobs" field="total_jobs" /></TableHead>
                    <TableHead className="text-xs"><SortHeader label="Revenue" field="total_revenue" /></TableHead>
                    <TableHead className="text-xs"><SortHeader label="Recency" field="recency_days" /></TableHead>
                    <TableHead className="text-xs">Trend</TableHead>
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
                      <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                        {getCustomerContact(c.customer_name).email || "—"}
                      </TableCell>
                      <TableCell className="text-xs">{Math.round(c.reorder_probability * 100)}%</TableCell>
                      <TableCell className="text-xs">{c.total_jobs}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(c.total_revenue)}</TableCell>
                      <TableCell className="text-xs">{c.recency_days}d ago</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          {getTrendIcon(c.value_trend)}
                          <span className="text-[10px] text-muted-foreground">{formatTrend(c.value_trend).label}</span>
                        </div>
                      </TableCell>
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
              {(() => {
                const contact = getCustomerContact(selectedCustomer.customer_name);
                return (contact.email || contact.phone) ? (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground -mt-1 mb-1">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Mail className="h-3 w-3" />{contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        <Phone className="h-3 w-3" />{contact.phone}
                      </a>
                    )}
                  </div>
                ) : null;
              })()}
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
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {formatTrend(selectedCustomer.value_trend).label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTrend(selectedCustomer.value_trend).description}
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

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      window.open(`mailto:?subject=Expression%20of%20Interest%20-%20Con-Form%20Group&body=${encodeURIComponent(
                        `Dear ${selectedCustomer.customer_name},\n\n` +
                        `Thank you for your continued partnership with Con-Form Group. We wanted to reach out regarding potential upcoming projects and express our interest in continuing to work together.\n\n` +
                        `As a valued ${selectedCustomer.segment === 'high_value' ? 'premium' : ''} customer with ${selectedCustomer.total_jobs} completed projects, we appreciate the trust you have placed in us.\n\n` +
                        `We would welcome the opportunity to discuss any upcoming requirements you may have. Our team is ready to provide competitive pricing and our full range of formwork and construction services.\n\n` +
                        `Please don't hesitate to get in touch to arrange a meeting or request a quote.\n\n` +
                        `Kind regards,\nCon-Form Group\nwww.con-formgroup.com.au\nPhone: 1300 266 367`
                      )}`, '_blank');
                    }}
                  >
                    <Mail className="h-3.5 w-3.5 mr-1.5" />
                    Send EOI
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => window.open('tel:1300266367')}
                  >
                    <Phone className="h-3.5 w-3.5 mr-1.5" />
                    Call
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
