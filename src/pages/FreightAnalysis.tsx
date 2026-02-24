import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertTriangle, Truck, BarChart3 } from "lucide-react";
import { useFreightAnalysis } from "@/hooks/useFreightAnalysis";
import { FreightSummaryCards } from "@/components/freight-analysis/FreightSummaryCards";
import { FreightGapTable } from "@/components/freight-analysis/FreightGapTable";
import { FreightCharts } from "@/components/freight-analysis/FreightCharts";
import { FreightVendorTable } from "@/components/freight-analysis/FreightVendorTable";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[300px] rounded-lg" />
      <Skeleton className="h-[200px] rounded-lg" />
    </div>
  );
}

export default function FreightAnalysis() {
  const { data, isLoading, error, refresh, isRefreshing } = useFreightAnalysis();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Freight Analysis</h1>
            <p className="text-muted-foreground mt-1">
              SO vs PO freight gap analysis &mdash; comparing quoted freight to actual costs
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <div className="text-right text-xs text-muted-foreground space-y-0.5">
                <p>
                  {data.summary.total_so_freight_lines} SO lines &middot;{" "}
                  {data.summary.total_po_freight_lines} PO lines
                </p>
                <p>
                  {data.summary.total_matched_pairs} matched (
                  {data.matched_by_analytic || 0} analytic,{" "}
                  {data.matched_by_project_name || 0} project)
                </p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refresh()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh from Odoo"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Failed to load freight analysis</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Unknown error"}.
                Check that the ML service is running and Odoo credentials are configured.
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="gap-analysis">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gap-analysis">
              <Truck className="h-4 w-4 mr-1.5" />
              Gap Analysis
              {data?.summary?.total_matched_pairs ? (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {data.summary.total_matched_pairs}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="charts">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
          </TabsList>

          <TabsContent value="gap-analysis" className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : data ? (
              <div className="space-y-6">
                <FreightSummaryCards summary={data.summary} />
                <FreightGapTable rows={data.so_po_comparison} />
              </div>
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          <TabsContent value="charts" className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : data ? (
              <div className="space-y-6">
                <FreightSummaryCards summary={data.summary} />
                <FreightCharts summary={data.summary} rows={data.so_po_comparison} />
              </div>
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          <TabsContent value="vendors" className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : data ? (
              <FreightVendorTable vendors={data.vendor_analysis} />
            ) : (
              <EmptyState />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Truck className="h-12 w-12 mx-auto mb-3 opacity-40" />
      <p>No freight analysis data available.</p>
      <p className="text-sm mt-1">Click "Refresh from Odoo" to fetch freight data.</p>
    </div>
  );
}
