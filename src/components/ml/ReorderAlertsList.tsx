import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Package,
  Truck,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import type { ReorderRule } from "@/hooks/useMLPredictions";

interface ReorderAlertsListProps {
  data: ReorderRule[];
}

const URGENCY_CONFIG: Record<
  string,
  { color: string; border: string; icon: typeof AlertTriangle; label: string }
> = {
  critical: {
    color: "bg-red-500/10 text-red-600 border-red-200",
    border: "border-red-300 dark:border-red-800",
    icon: AlertTriangle,
    label: "Critical",
  },
  warning: {
    color: "bg-amber-500/10 text-amber-600 border-amber-200",
    border: "border-amber-300 dark:border-amber-800",
    icon: AlertCircle,
    label: "Warning",
  },
  ok: {
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    border: "",
    icon: CheckCircle2,
    label: "OK",
  },
};

function DeltaIndicator({ value, label }: { value: number; label: string }) {
  if (Math.abs(value) < 0.01) return null;
  const isPositive = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
        isPositive ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {isPositive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })} {label}
    </span>
  );
}

function ReorderCard({ rule }: { rule: ReorderRule }) {
  const config = URGENCY_CONFIG[rule.urgency] || URGENCY_CONFIG.ok;
  const Icon = config.icon;

  const onHandPct =
    rule.reorder_point > 0 ? ((rule.on_hand / rule.reorder_point) * 100).toFixed(0) : "—";

  return (
    <Card className={`${config.border} transition-colors`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0" />
              <h4 className="text-sm font-medium truncate">{rule.product_name}</h4>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${config.color}`}>
                {config.label}
              </Badge>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground">On Hand</p>
                <p
                  className={`text-sm font-semibold ${
                    rule.is_below_rop ? "text-red-600" : ""
                  }`}
                >
                  {rule.on_hand.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">{onHandPct}% of ROP</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Reorder Point</p>
                <p className="text-sm font-semibold">
                  {rule.reorder_point.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Safety: {rule.safety_stock.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Order Qty</p>
                <p className="text-sm font-semibold">
                  {rule.order_quantity.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Max: {rule.max_quantity.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Primary Vendor</p>
                <p className="text-sm font-medium truncate flex items-center gap-1">
                  <Truck className="h-3 w-3 shrink-0 text-muted-foreground" />
                  {rule.lead_time_stats?.primary_vendor || "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Lead: {rule.lead_time_stats?.avg_days?.toFixed(0) || "?"}d avg
                </p>
              </div>
            </div>

            {/* Odoo vs Calculated deltas */}
            {rule.is_discrepant && (
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5">
                  Odoo Settings vs Calculated
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Min Qty (Odoo)</span>
                    <span className="text-[10px] font-medium">
                      {rule.odoo_min_qty.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Calc. ROP</span>
                    <span className="text-[10px] font-medium">
                      {rule.reorder_point.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Max Qty (Odoo)</span>
                    <span className="text-[10px] font-medium">
                      {rule.odoo_max_qty.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Calc. Max</span>
                    <span className="text-[10px] font-medium">
                      {rule.max_quantity.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <DeltaIndicator value={rule.min_qty_delta} label="min" />
                  </div>
                  <div>
                    <DeltaIndicator value={rule.max_qty_delta} label="max" />
                  </div>
                </div>
              </div>
            )}

            {/* Demand stats */}
            {rule.demand_stats && (
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>Avg daily: {rule.demand_stats.avg_daily.toFixed(1)}</span>
                <span>Std: {rule.demand_stats.std_daily.toFixed(1)}</span>
                <span>Annual: {rule.demand_stats.annual.toLocaleString()}</span>
                <span>CV: {rule.demand_stats.cv.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReorderAlertsList({ data }: ReorderAlertsListProps) {
  const sorted = useMemo(() => {
    const urgencyOrder: Record<string, number> = { critical: 0, warning: 1, ok: 2 };
    return [...data].sort(
      (a, b) => (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2)
    );
  }, [data]);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, ok: 0 };
    data.forEach((d) => {
      c[d.urgency] = (c[d.urgency] || 0) + 1;
    });
    return c;
  }, [data]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Reorder Alerts
              </CardTitle>
              <CardDescription className="text-xs">
                {data.length} products —{" "}
                {counts.critical > 0 && (
                  <span className="text-red-500">{counts.critical} critical</span>
                )}
                {counts.critical > 0 && counts.warning > 0 && ", "}
                {counts.warning > 0 && (
                  <span className="text-amber-500">{counts.warning} warning</span>
                )}
                {counts.critical > 0 && counts.ok > 0 && ", "}
                {counts.warning > 0 && counts.ok > 0 && ", "}
                {counts.ok > 0 && (
                  <span className="text-emerald-500">{counts.ok} OK</span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {sorted.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          No reorder data available
        </div>
      ) : (
        sorted.map((rule) => <ReorderCard key={rule.product_id} rule={rule} />)
      )}
    </div>
  );
}
