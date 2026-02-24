import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, AlertTriangle, BarChart3 } from "lucide-react";
import { useInstallationAnalysis } from "@/hooks/useInstallationAnalysis";
import { PerM2RateTable } from "@/components/installation-analysis/PerM2RateTable";
import { QuotedVsActualSummary } from "@/components/installation-analysis/QuotedVsActualSummary";
import { OverquoteChart } from "@/components/installation-analysis/OverquoteChart";
import { SoPoComparisonTable } from "@/components/installation-analysis/SoPoComparisonTable";
import { VendorBreakdown } from "@/components/installation-analysis/VendorBreakdown";
import { DayTrackingTable } from "@/components/installation-analysis/DayTrackingTable";
import { InstallationStateBreakdown } from "@/components/installation-analysis/InstallationStateBreakdown";

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[300px] rounded-lg" />
      <Skeleton className="h-[200px] rounded-lg" />
    </div>
  );
}

export default function InstallationAnalysis() {
  const { data, isLoading, error, refresh, isRefreshing } = useInstallationAnalysis();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Installation Analysis</h1>
            <p className="text-muted-foreground mt-1">
              Man-day quoting rates, SO vs PO comparison, and vendor cost analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <div className="text-right text-xs text-muted-foreground space-y-0.5">
                <p>{data.total_so_install_lines} SO lines &middot; {data.total_po_install_lines} PO lines</p>
                <p>{data.total_matched_pairs} matched ({data.matched_by_analytic || 0} analytic, {data.matched_by_project_name || 0} project)</p>
                {(data.lump_sum_so_lines > 0 || data.lump_sum_po_lines > 0) && (
                  <p>Lump-sum inferred: {data.lump_sum_so_lines} SO &middot; {data.lump_sum_po_lines} PO</p>
                )}
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

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Failed to load installation analysis</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Unknown error"}. 
                Check that the ML service is running and Odoo credentials are configured.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="per-m2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="per-m2">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Per-m&sup2; Rates
            </TabsTrigger>
            <TabsTrigger value="quoted-vs-actual">
              Quoted vs Actual
              {data?.overquote_summary?.total_matched_orders ? (
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {data.overquote_summary.total_matched_orders}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="tracking">Day Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="per-m2" className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : data ? (
              <div className="space-y-6">
                <PerM2RateTable
                  perM2Rates={data.per_m2_rates}
                  byProductType={data.by_product_type}
                />
                <InstallationStateBreakdown
                  byProductType={data.by_product_type}
                  variantPrices={data.variant_prices_by_state}
                />
              </div>
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          <TabsContent value="quoted-vs-actual" className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : data ? (
              <div className="space-y-6">
                <QuotedVsActualSummary
                  summary={data.overquote_summary}
                  byProductType={data.by_product_type}
                  lumpSumSoLines={data.lump_sum_so_lines}
                  lumpSumPoLines={data.lump_sum_po_lines}
                />
                <OverquoteChart rows={data.so_po_comparison} />
                <SoPoComparisonTable rows={data.so_po_comparison} />
              </div>
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          <TabsContent value="vendors" className="mt-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : data ? (
              <VendorBreakdown vendors={data.vendor_analysis} />
            ) : (
              <EmptyState />
            )}
          </TabsContent>

          <TabsContent value="tracking" className="mt-6">
            <DayTrackingTable />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
      <p>No analysis data available.</p>
      <p className="text-sm mt-1">Click "Refresh from Odoo" to fetch installation data.</p>
    </div>
  );
}
