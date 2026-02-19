import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, TrendingUp, TrendingDown, Package, DollarSign, Clock } from "lucide-react";
import { useSupplierDetail } from "@/hooks/useMLPredictions";

interface SupplierDetailPanelProps {
  vendorName: string;
  onClose: () => void;
}

export function SupplierDetailPanel({ vendorName, onClose }: SupplierDetailPanelProps) {
  const { data, isLoading } = useSupplierDetail(vendorName);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{vendorName}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No detail data available for this vendor
          </div>
        </CardContent>
      </Card>
    );
  }

  const safe = (v: unknown, fallback = 0): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const formatCurrency = (val: unknown) => {
    const n = safe(val);
    return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{data.vendor_name}</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Detailed breakdown across {data.product_count} products
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Total Spend</span>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(data.total_spend)}</p>
          </div>
          <div className="rounded-md border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Products</span>
            </div>
            <p className="text-lg font-semibold">{data.product_count}</p>
          </div>
          <div className="rounded-md border p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Avg On-Time</span>
            </div>
            <p className="text-lg font-semibold">{Math.round(safe(data.avg_on_time_rate) * 100)}%</p>
          </div>
        </div>

        {data.products.length === 0 ? (
          <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
            No product data
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs">Avg Lead Time</TableHead>
                  <TableHead className="text-xs">LT Std Dev</TableHead>
                  <TableHead className="text-xs">On-Time %</TableHead>
                  <TableHead className="text-xs">Unit Price</TableHead>
                  <TableHead className="text-xs">Price Trend</TableHead>
                  <TableHead className="text-xs">Orders</TableHead>
                  <TableHead className="text-xs">Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.products.map((p) => (
                  <TableRow key={p.product_id}>
                    <TableCell className="text-xs font-medium max-w-[160px] truncate">
                      {p.product_name}
                    </TableCell>
                    <TableCell className="text-xs">{safe(p.avg_lead_time).toFixed(1)}d</TableCell>
                    <TableCell className="text-xs">{safe(p.lead_time_stddev).toFixed(1)}d</TableCell>
                    <TableCell className="text-xs">{Math.round(safe(p.on_time_rate) * 100)}%</TableCell>
                    <TableCell className="text-xs">${safe(p.avg_unit_price).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">
                      <span className={`inline-flex items-center gap-0.5 ${safe(p.price_trend_pct) >= 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {safe(p.price_trend_pct) >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(safe(p.price_trend_pct)).toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{p.total_orders ?? 0}</TableCell>
                    <TableCell className="text-xs">{formatCurrency(p.total_spend)}</TableCell>
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
