import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricsCard } from "@/components/MetricsCard";
import { RevenueChart } from "@/components/RevenueChart";
import { PipelineChart } from "@/components/PipelineChart";
import { PerformanceTable } from "@/components/PerformanceTable";
import { TargetProgress } from "@/components/TargetProgress";
import { AICopilot } from "@/components/AICopilot";
import { FilterBar } from "@/components/filters/FilterBar";
import { SankeyChart } from "@/components/SankeyChart";
import { WidgetCreatorDrawer } from "@/components/WidgetCreatorDrawer";
import { DraggableWidget } from "@/components/DraggableWidget";
import { DollarSign, TrendingUp, Users, Award, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOdooSync } from "@/hooks/useOdooSync";
import { useOdooTeam } from "@/hooks/useOdooTeam";
import { useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

const Index = () => {
  const { syncOdooData, isLoading, metrics } = useOdooSync();
  const { salesReps, isLoading: isTeamLoading } = useOdooTeam();
  const [customWidgets, setCustomWidgets] = useState<any[]>([]);

  // Auto-sync on mount
  useEffect(() => {
    syncOdooData();
  }, []);

  // Default layout configuration
  const defaultLayout = {
    lg: [
      { i: "revenue-chart", x: 0, y: 0, w: 6, h: 4 },
      { i: "pipeline-chart", x: 6, y: 0, w: 6, h: 4 },
      { i: "sankey-chart", x: 0, y: 4, w: 12, h: 5 },
      { i: "performance-table", x: 0, y: 9, w: 8, h: 5 },
      { i: "target-progress", x: 8, y: 9, w: 4, h: 5 },
    ],
  };

  const [layout, setLayout] = useState(defaultLayout);

  const handleLayoutChange = (newLayout: any) => {
    setLayout({ lg: newLayout });
    localStorage.setItem("dashboardLayout", JSON.stringify({ lg: newLayout }));
  };

  const handleCreateWidget = (widget: any) => {
    setCustomWidgets((prev) => [...prev, widget]);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <>
      <DashboardLayout>
      {/* Filters */}
      <div className="mb-6">
        <FilterBar />
      </div>

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back! Here's your sales performance overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            className="gap-2" 
            onClick={syncOdooData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Sync Odoo Data'}
          </Button>
          <WidgetCreatorDrawer onCreateWidget={handleCreateWidget} />
        </div>
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

      {/* Draggable Widgets */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layout}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={60}
        isDraggable={true}
        isResizable={true}
        draggableHandle=".cursor-move"
        margin={[16, 24]}
        containerPadding={[0, 0]}
        compactType="vertical"
        preventCollision={false}
      >
        <div key="revenue-chart">
          <DraggableWidget>
            <RevenueChart />
          </DraggableWidget>
        </div>
        <div key="pipeline-chart">
          <DraggableWidget>
            <PipelineChart />
          </DraggableWidget>
        </div>
        <div key="sankey-chart">
          <DraggableWidget>
            <SankeyChart />
          </DraggableWidget>
        </div>
        <div key="performance-table">
          <DraggableWidget>
            <PerformanceTable salesReps={salesReps} isLoading={isTeamLoading} />
          </DraggableWidget>
        </div>
        <div key="target-progress">
          <DraggableWidget>
            <TargetProgress />
          </DraggableWidget>
        </div>
      </ResponsiveGridLayout>
    </DashboardLayout>
    <AICopilot />
    </>
  );
};

export default Index;
