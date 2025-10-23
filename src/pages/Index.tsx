import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricsCard } from "@/components/MetricsCard";
import { RevenueChart } from "@/components/RevenueChart";
import { PipelineChart } from "@/components/PipelineChart";
import { PerformanceTable } from "@/components/PerformanceTable";
import { TargetProgress } from "@/components/TargetProgress";
import { AICopilot } from "@/components/AICopilot";
import { FilterBar } from "@/components/filters/FilterBar";
import { SankeyChart } from "@/components/SankeyChart";
import { AustraliaSalesMap } from "@/components/AustraliaSalesMap";
import { HuddleMetrics } from "@/components/HuddleMetrics";
import { YTDPerformanceChart } from "@/components/YTDPerformanceChart";
import { DollarSign, TrendingUp, Users, Award, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOdooSync } from "@/hooks/useOdooSync";
import { useOdooTeam } from "@/hooks/useOdooTeam";
import { useFilteredMetrics } from "@/hooks/useFilteredMetrics";
import { useEffect } from "react";

const Index = () => {
  const { syncOdooData, isLoading, metrics: syncMetrics } = useOdooSync();
  const { salesReps, isLoading: isTeamLoading } = useOdooTeam();
  const { metrics, isLoading: isMetricsLoading } = useFilteredMetrics();

  // Auto-sync on mount
  useEffect(() => {
    syncOdooData();
  }, []);

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const avgDealSize = syncMetrics?.totalRevenue && syncMetrics?.dealsClosed 
    ? Math.round(syncMetrics.totalRevenue / syncMetrics.dealsClosed / 1000)
    : 0;

  return (
    <>
      <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sales Overview</h1>
            <p className="mt-1 text-muted-foreground">
              Welcome back! Here's your complete sales performance overview.
            </p>
          </div>
          <Button 
            className="gap-2" 
            onClick={syncOdooData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Sync Odoo Data'}
          </Button>
        </div>

        {/* Filters */}
        <FilterBar />

        {/* Huddle Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Huddle Overview</h2>
          <HuddleMetrics />
        </div>

        {/* YTD Performance Chart */}
        <YTDPerformanceChart />

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricsCard
            title="Expected Revenue"
            value={isMetricsLoading ? "Loading..." : formatCurrency(metrics.totalRevenue)}
            icon={DollarSign}
            footer={
              <p className="text-xs text-muted-foreground">
                From open opportunities (10-90% probability)
              </p>
            }
          />
          <MetricsCard
            title="Deals Closed"
            value={isMetricsLoading ? "Loading..." : metrics.dealsClosed.toLocaleString('en-US')}
            icon={Award}
            footer={
              <p className="text-xs text-muted-foreground">
                High probability deals (≥90%)
              </p>
            }
          />
          <MetricsCard
            title="Conversion Rate"
            value={isMetricsLoading ? "Loading..." : `${metrics.conversionRate.toFixed(1)}%`}
            icon={TrendingUp}
            footer={
              <p className="text-xs text-muted-foreground">
                Won deals / Total opportunities
              </p>
            }
          />
          <MetricsCard
            title="Active Customers"
            value={isMetricsLoading ? "Loading..." : metrics.activeCustomers.toLocaleString('en-US')}
            icon={Users}
            footer={
              <p className="text-xs text-muted-foreground">
                Unique customers with won deals
              </p>
            }
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart />
          <PipelineChart />
        </div>

        {/* Secondary Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AustraliaSalesMap />
          <SankeyChart />
        </div>

        {/* Performance Insights */}
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
                <p className="mt-2 text-2xl font-bold text-foreground">{syncMetrics?.dealsClosed || 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">Closed this period</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {syncMetrics?.conversionRate ? `${syncMetrics.conversionRate.toFixed(1)}%` : 'N/A'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Opportunity to closed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Table and Target Progress */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceTable salesReps={salesReps} isLoading={isTeamLoading} />
          </div>
          <div>
            <TargetProgress />
          </div>
        </div>
      </div>
    </DashboardLayout>
    <AICopilot />
    </>
  );
};

export default Index;
