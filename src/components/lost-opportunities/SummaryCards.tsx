import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, AlertTriangle, Package, Truck, Wrench } from "lucide-react";
import type { LostOppSummary } from "@/hooks/useLostOpportunities";

interface Props {
  summary: LostOppSummary;
}

const fmt = (v: number) =>
  "$" + v.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function SummaryCards({ summary }: Props) {
  const overPct = (summary.pct_above_threshold * 100).toFixed(1);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Orders Analysed</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total_orders_analysed}</div>
          <p className="text-xs text-muted-foreground">
            matched SO→PO pairs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overall GP</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{(summary.overall_gp * 100).toFixed(1)}%</div>
          <p className="text-xs text-muted-foreground">
            {fmt(summary.total_revenue)} rev / {fmt(summary.total_cogs)} COGS
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Above {(summary.gp_threshold * 100).toFixed(0)}% GP</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{summary.orders_above_threshold}</div>
          <p className="text-xs text-muted-foreground">
            {overPct}% of orders · {fmt(summary.total_excess_value)} excess
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Labour Cost</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmt(summary.total_labour_cost)}</div>
          <p className="text-xs text-muted-foreground">
            PO installation lines
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Freight Cost</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmt(summary.total_freight_cost)}</div>
          <p className="text-xs text-muted-foreground">
            PO freight lines
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Product Cost</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmt(summary.total_product_cost)}</div>
          <p className="text-xs text-muted-foreground">
            materials & other PO lines
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
