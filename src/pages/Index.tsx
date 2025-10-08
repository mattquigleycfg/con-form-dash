import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricsCard } from "@/components/MetricsCard";
import { RevenueChart } from "@/components/RevenueChart";
import { PipelineChart } from "@/components/PipelineChart";
import { PerformanceTable } from "@/components/PerformanceTable";
import { TargetProgress } from "@/components/TargetProgress";
import { AICopilot } from "@/components/AICopilot";
import { DollarSign, TrendingUp, Users, Award, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOdooSync } from "@/hooks/useOdooSync";
import { useOdooTeam } from "@/hooks/useOdooTeam";
import { useEffect } from "react";

const Index = () => {
  const { syncOdooData, isLoading, metrics } = useOdooSync();
  const { salesReps, isLoading: isTeamLoading } = useOdooTeam();

  // Auto-sync on mount
  useEffect(() => {
    syncOdooData();
  }, []);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <>
      <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back! Here's your sales performance overview.
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

      {/* Key Metrics */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricsCard
          title="Total Revenue"
          value={metrics ? formatCurrency(metrics.totalRevenue) : "Loading..."}
          icon={DollarSign}
          footer={
            <p className="text-xs text-muted-foreground">
              {metrics ? "From Odoo sales orders" : "Syncing with Odoo..."}
            </p>
          }
        />
        <MetricsCard
          title="Deals Closed"
          value={metrics ? metrics.dealsClosed.toString() : "Loading..."}
          icon={Award}
          footer={
            <p className="text-xs text-muted-foreground">
              {metrics ? "Confirmed orders" : "Syncing with Odoo..."}
            </p>
          }
        />
        <MetricsCard
          title="Conversion Rate"
          value={metrics ? `${metrics.conversionRate.toFixed(1)}%` : "Loading..."}
          icon={TrendingUp}
          footer={
            <p className="text-xs text-muted-foreground">
              {metrics ? "Won opportunities / Total" : "Syncing with Odoo..."}
            </p>
          }
        />
        <MetricsCard
          title="Active Customers"
          value={metrics ? metrics.activeCustomers.toString() : "Loading..."}
          icon={Users}
          footer={
            <p className="text-xs text-muted-foreground">
              {metrics ? "Unique customers" : "Syncing with Odoo..."}
            </p>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <RevenueChart />
        <PipelineChart />
      </div>

      {/* Performance & Targets */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PerformanceTable salesReps={salesReps} isLoading={isTeamLoading} />
        </div>
        <div>
          <TargetProgress />
        </div>
      </div>
    </DashboardLayout>
    <AICopilot />
    </>
  );
};

export default Index;
