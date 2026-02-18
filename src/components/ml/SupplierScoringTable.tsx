import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { SupplierScore } from "@/hooks/useMLPredictions";

interface SupplierScoringTableProps {
  data: SupplierScore[];
  onRowClick?: (vendorName: string) => void;
}

const TIER_COLORS: Record<string, string> = {
  preferred: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  standard: "bg-blue-500/10 text-blue-600 border-blue-200",
  review: "bg-red-500/10 text-red-600 border-red-200",
};

type SortKey = "composite_score" | "on_time_rate" | "total_value" | "total_orders";

export function SupplierScoringTable({ data, onRowClick }: SupplierScoringTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("composite_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...data].sort((a, b) => (sortDir === "asc" ? 1 : -1) * (a[sortKey] - b[sortKey]));

  const tierCounts = useMemo(() => {
    const c = { preferred: 0, standard: 0, review: 0 };
    data.forEach((d) => { c[d.tier] = (c[d.tier] || 0) + 1; });
    return c;
  }, [data]);

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-xs" onClick={() => toggleSort(field)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Supplier Performance Scoring</CardTitle>
        <CardDescription className="text-xs">
          {data.length} vendors scored —{" "}
          {tierCounts.preferred > 0 && <span className="text-emerald-600">{tierCounts.preferred} preferred</span>}
          {tierCounts.preferred > 0 && tierCounts.review > 0 && ", "}
          {tierCounts.review > 0 && <span className="text-red-500">{tierCounts.review} under review</span>}
          {tierCounts.preferred === 0 && tierCounts.review === 0 && `${tierCounts.standard} standard`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">No supplier data available</div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Vendor</TableHead>
                  <TableHead className="text-xs"><SortHeader label="Score" field="composite_score" /></TableHead>
                  <TableHead className="text-xs">Delivery</TableHead>
                  <TableHead className="text-xs">Reliability</TableHead>
                  <TableHead className="text-xs"><SortHeader label="On-Time" field="on_time_rate" /></TableHead>
                  <TableHead className="text-xs"><SortHeader label="Orders" field="total_orders" /></TableHead>
                  <TableHead className="text-xs">Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.slice(0, 50).map((s) => (
                  <TableRow key={s.vendor_name} className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""} onClick={() => onRowClick?.(s.vendor_name)}>
                    <TableCell className="text-xs font-medium max-w-[180px] truncate">{s.vendor_name}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <Progress value={s.composite_score} className="h-1.5 w-16" />
                        <span>{Math.round(s.composite_score)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{Math.round(s.delivery_score)}</TableCell>
                    <TableCell className="text-xs">{Math.round(s.reliability_score)}</TableCell>
                    <TableCell className="text-xs">{Math.round(s.on_time_rate * 100)}%</TableCell>
                    <TableCell className="text-xs">{s.total_orders}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${TIER_COLORS[s.tier]}`}>
                        {s.tier.charAt(0).toUpperCase() + s.tier.slice(1)}
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
