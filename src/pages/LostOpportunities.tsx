import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useLostOpportunities } from "@/hooks/useLostOpportunities";
import SummaryCards from "@/components/lost-opportunities/SummaryCards";
import OrderTable from "@/components/lost-opportunities/OrderTable";
import ProfitCharts from "@/components/lost-opportunities/ProfitCharts";

export default function LostOpportunities() {
  const { data, isLoading, error, refresh, isRefreshing } = useLostOpportunities();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lost Opportunities</h1>
            <p className="text-sm text-muted-foreground">
              CRM opportunities marked as lost — reasons, pipeline stage, quote breakdown and overinflation flags.
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

        {isLoading && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>
        )}

        {!isLoading && (error || !data) && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <p className="text-sm">
              {error ? String(error) : "Lost opportunities data is not available. Click Refresh to load from Odoo CRM."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Retry
            </Button>
          </div>
        )}

        {data && (
          <div className="relative">
            {isRefreshing && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]"
                aria-busy="true"
                aria-label="Refreshing data"
              >
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Refreshing…</span>
                </div>
              </div>
            )}
            <SummaryCards summary={data.summary} leads={data.leads} />

            <Tabs defaultValue="table" className="space-y-4">
              <TabsList>
                <TabsTrigger value="table">All Opportunities</TabsTrigger>
                <TabsTrigger value="charts">Charts</TabsTrigger>
              </TabsList>

              <TabsContent value="table">
                <OrderTable
                  leads={data.leads}
                  filterOptions={data.filter_options}
                />
              </TabsContent>

              <TabsContent value="charts">
                <ProfitCharts
                  byReason={data.by_reason}
                  byStage={data.by_stage}
                  bySalesperson={data.by_salesperson}
                />
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground text-right">
              Generated {new Date(data.generated_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
