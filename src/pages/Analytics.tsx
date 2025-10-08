import { DashboardLayout } from "@/components/DashboardLayout";
import { RevenueChart } from "@/components/RevenueChart";
import { PipelineChart } from "@/components/PipelineChart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Analytics() {
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
                <p className="mt-2 text-2xl font-bold text-foreground">$12.5K</p>
                <p className="mt-1 text-xs text-accent">+8% vs last month</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium text-muted-foreground">Sales Cycle</p>
                <p className="mt-2 text-2xl font-bold text-foreground">28 days</p>
                <p className="mt-1 text-xs text-accent">-3 days improvement</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                <p className="mt-2 text-2xl font-bold text-foreground">42%</p>
                <p className="mt-1 text-xs text-accent">+5% vs last quarter</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
