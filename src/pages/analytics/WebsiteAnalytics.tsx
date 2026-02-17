import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { DepartmentHeader } from "@/components/kpi";
import { 
  useWebsiteTraffic, 
  useTopPages, 
  useTrafficSources, 
  useTrafficTimeSeries 
} from "@/hooks/useWebsiteAnalytics";
import { TrafficTrendChart } from "@/components/analytics/TrafficTrendChart";
import { TopPagesChart } from "@/components/analytics/TopPagesChart";
import { TrafficSourceChart } from "@/components/analytics/TrafficSourceChart";
import { AcquisitionTable } from "@/components/analytics/AcquisitionTable";
import { AIInsightBanner } from "@/components/analytics/AIInsightBanner";
import { type DatePeriod } from "@/utils/dateHelpers";
import { 
  Users, 
  Eye, 
  Clock, 
  Activity, 
  TrendingUp,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WebsiteAnalytics() {
  const [period, setPeriod] = useState<DatePeriod>("month");

  // Fetch all analytics data
  const { data: trafficData, isLoading: isTrafficLoading } = useWebsiteTraffic(period);
  const { data: topPages, isLoading: isPagesLoading } = useTopPages(period, 10);
  const { data: trafficSources, isLoading: isSourcesLoading } = useTrafficSources(period, 10);
  const { data: timeSeries, isLoading: isTimeSeriesLoading } = useTrafficTimeSeries(period);

  // Format metrics for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const isAnyLoading = isTrafficLoading || isPagesLoading || isSourcesLoading || isTimeSeriesLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DepartmentHeader
          title="Website Analytics"
          description="Comprehensive traffic insights from Google Analytics 4"
          icon={Globe}
          period={period}
          onPeriodChange={(p) => setPeriod(p as DatePeriod)}
          isRefreshing={isAnyLoading}
        />

      {/* AI Insights Banner */}
      <AIInsightBanner metrics={trafficData} sources={trafficSources} />

      {/* Hero Metrics Section - F-Pattern Layout */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* North Star Metric - Sessions (Top Left, Larger) */}
        <Card className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isTrafficLoading ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <>
                <div className="text-3xl font-bold">{trafficData?.sessions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  North Star Metric - Total website visits
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Supporting Metrics */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isTrafficLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{trafficData?.totalUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-600">{trafficData?.newUsers.toLocaleString()}</span> new visitors
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pageviews</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isTrafficLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{trafficData?.pageviews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {trafficData?.pagesPerSession.toFixed(1)} pages/session
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isTrafficLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatDuration(trafficData?.avgSessionDuration || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Time spent per visit
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            {(trafficData?.bounceRate || 0) > 0.7 ? (
              <ArrowUpRight className="h-4 w-4 text-destructive" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            {isTrafficLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${
                  (trafficData?.bounceRate || 0) > 0.7 
                    ? 'text-destructive' 
                    : (trafficData?.bounceRate || 0) < 0.3 
                      ? 'text-green-600' 
                      : ''
                }`}>
                  {formatPercentage(trafficData?.bounceRate || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Single-page sessions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isTrafficLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${
                  (trafficData?.engagementRate || 0) > 0.7 
                    ? 'text-green-600' 
                    : (trafficData?.engagementRate || 0) < 0.3 
                      ? 'text-destructive' 
                      : ''
                }`}>
                  {formatPercentage(trafficData?.engagementRate || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Engaged sessions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isTrafficLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {trafficData?.activeUsers.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Users with engagement
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Traffic Trend Chart */}
      <TrafficTrendChart 
        data={timeSeries || []}
        isLoading={isTimeSeriesLoading}
        title="Traffic Trends Over Time"
        description={`Daily traffic metrics for the selected ${period}`}
        showComparison={true}
      />

      {/* Two Column Layout for Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <TopPagesChart 
          data={topPages || []}
          isLoading={isPagesLoading}
          title="Top Performing Pages"
          description="Most viewed pages by traffic volume"
        />

        <TrafficSourceChart 
          data={trafficSources || []}
          isLoading={isSourcesLoading}
          title="Traffic Source Distribution"
          description="Where your visitors come from"
        />
      </div>

      {/* Acquisition Table - Full Width */}
      <AcquisitionTable 
        data={trafficSources || []}
        isLoading={isSourcesLoading}
        title="Detailed Traffic Acquisition"
        description="Complete breakdown of all traffic sources with engagement metrics"
      />

      {/* Footer Note */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground text-center">
            Data sourced from Google Analytics 4 (Property ID: 355745027) • 
            Metrics update every 30 minutes • 
            All times in {period === 'week' ? 'last 7 days' : period === 'month' ? 'last 30 days' : period === 'quarter' ? 'last 90 days' : 'last 365 days'}
          </p>
        </CardContent>
      </Card>
      </div>

      <AICopilot />
    </DashboardLayout>
  );
}
