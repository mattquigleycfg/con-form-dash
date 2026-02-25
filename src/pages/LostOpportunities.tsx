import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/DashboardLayout";
import { useLostOpportunities } from "@/hooks/useLostOpportunities";
import SummaryCards from "@/components/lost-opportunities/SummaryCards";
import OrderTable from "@/components/lost-opportunities/OrderTable";
import ProfitCharts from "@/components/lost-opportunities/ProfitCharts";
import TypeStateBreakdown from "@/components/lost-opportunities/TypeStateBreakdown";

export default function LostOpportunities() {
  const { data, isLoading, error, refresh, isRefreshing } = useLostOpportunities();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lost Opportunities</h1>
            <p className="text-sm text-muted-foreground">
              Cost breakdown and GP analysis across matched SO→PO project orders.
              Orders above 40% GP are flagged as potential over-estimates.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refresh()}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        )}

        {/* Error */}
        {!isLoading && (error || !data) && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <p className="text-sm">
              {error ? String(error) : "Lost opportunities data is not available. Click Refresh to load from Odoo."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </div>
        )}

        {/* Data */}
        {data && (
          <>
            <SummaryCards summary={data.summary} />

            <Tabs defaultValue="orders" className="space-y-4">
              <TabsList>
                <TabsTrigger value="orders">Order Breakdown</TabsTrigger>
                <TabsTrigger value="charts">Charts</TabsTrigger>
                <TabsTrigger value="breakdown">Type / State</TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
                <OrderTable
                  orders={data.orders}
                  gpThreshold={data.summary.gp_threshold}
                />
              </TabsContent>

              <TabsContent value="charts">
                <ProfitCharts orders={data.orders} summary={data.summary} />
              </TabsContent>

              <TabsContent value="breakdown">
                <TypeStateBreakdown summary={data.summary} />
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground text-right">
              Generated {new Date(data.generated_at).toLocaleString()} ·{" "}
              Analytic field: {data.analytic_field_used}
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
