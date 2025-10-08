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

const Index = () => {
  const { syncOdooData, isLoading, metrics } = useOdooSync();

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
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
          value={metrics ? formatCurrency(metrics.totalRevenue) : "$458K"}
          change={12.5}
          trend="up"
          icon={DollarSign}
          footer={
            <p className="text-xs text-muted-foreground">
              {metrics ? "From Odoo" : "$142K above target"}
            </p>
          }
        />
        <MetricsCard
          title="Deals Closed"
          value={metrics ? metrics.dealsClosed.toString() : "142"}
          change={8.2}
          trend="up"
          icon={Award}
          footer={
            <p className="text-xs text-muted-foreground">
              {metrics ? "Confirmed orders" : "38 deals this month"}
            </p>
          }
        />
        <MetricsCard
          title="Conversion Rate"
          value={metrics ? `${metrics.conversionRate.toFixed(1)}%` : "24.8%"}
          change={3.1}
          trend="up"
          icon={TrendingUp}
          footer={
            <p className="text-xs text-muted-foreground">
              {metrics ? "Won opportunities" : "+2.1% from last month"}
            </p>
          }
        />
        <MetricsCard
          title="Active Customers"
          value={metrics ? metrics.activeCustomers.toString() : "1,248"}
          change={15.3}
          trend="up"
          icon={Users}
          footer={
            <p className="text-xs text-muted-foreground">
              {metrics ? "Unique customers" : "156 new this quarter"}
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
          <PerformanceTable />
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
