import { DashboardLayout } from "@/components/DashboardLayout";
import { RevenueChart } from "@/components/RevenueChart";
import { PipelineChart } from "@/components/PipelineChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOdooSync } from "@/hooks/useOdooSync";
import { useEffect } from "react";

export default function Analytics() {
  const { syncOdooData, metrics } = useOdooSync();

  useEffect(() => {
    syncOdooData();
  }, []);

  const avgDealSize = metrics?.totalRevenue && metrics?.dealsClosed 
    ? Math.round(metrics.totalRevenue / metrics.dealsClosed / 1000)
    : 0;
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Deep dive into your sales data and trends
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart />
          <PipelineChart />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>
              Key metrics and trends from your Odoo data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Deal Size</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  ${avgDealSize > 0 ? `${avgDealSize}K` : 'N/A'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Based on closed deals</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium text-muted-foreground">Total Deals</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{metrics?.dealsClosed || 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">Closed this period</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {metrics?.conversionRate ? `${metrics.conversionRate.toFixed(1)}%` : 'N/A'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Opportunity to closed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
