import { useState } from "react";
import { Palette, FileText, AlertTriangle, CheckCircle, Clock, TrendingDown, Activity } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KPICard,
  KPIGrid,
  KPISection,
  DepartmentHeader,
  ManualEntryDialog,
  type DatePeriod,
  type ManualEntryData,
} from "@/components/kpi";
import { useKPIData } from "@/hooks/useKPIData";
import { useManualKPIs } from "@/hooks/useManualKPIs";
import { useDepartmentHelpdeskKPIs } from "@/hooks/useHelpdeskKPIs";
import { useShopDrawingCycleTime } from "@/hooks/useShopDrawingCycleTime";
import { getDateRange } from "@/utils/dateHelpers";

export default function DesignKPIs() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const [editingMetric, setEditingMetric] = useState<{ key: string; label: string } | null>(null);
  
  const { metrics, isLoading, helpdeskTeams } = useKPIData({ department: "design", period });
  const { data: helpdeskData, refetch } = useDepartmentHelpdeskKPIs("design", period);
  const { data: cycleTimeData, isLoading: isCycleTimeLoading, refetch: refetchCycleTime } = useShopDrawingCycleTime(period);
  const { start, end } = getDateRange(period);
  const { saveEntry, isSaving, getLatestEntry } = useManualKPIs("design", start, end);

  const handleSaveManual = async (data: ManualEntryData) => {
    await saveEntry({
      department: "design",
      metricKey: data.metricKey,
      value: data.value,
      target: data.target,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      notes: data.notes,
    });
    setEditingMetric(null);
  };

  const getMetric = (key: string) => metrics.find((m) => m.key === key);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DepartmentHeader
          title="Design KPIs"
          description="Shop drawing and design documentation metrics"
          icon={Palette}
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => {
            refetch();
            refetchCycleTime();
          }}
          isRefreshing={isLoading || isCycleTimeLoading}
        />

        {/* Shop Drawings Section */}
        <KPISection title="Shop Drawings" description="Drawing production metrics from Odoo Helpdesk">
          <KPIGrid columns={4}>
            <KPICard
              title="Drawings Open"
              value={getMetric("shop_drawings_open")?.value ?? 0}
              status={getMetric("shop_drawings_open")?.status ?? "neutral"}
              source={getMetric("shop_drawings_open")?.source}
              icon={FileText}
              trendInverse
              onEdit={() => setEditingMetric({ key: "shop_drawings_open", label: "Shop Drawings Open" })}
            />
            <KPICard
              title="Overdue"
              value={getMetric("shop_drawings_overdue")?.value ?? 0}
              status={getMetric("shop_drawings_overdue")?.status ?? "neutral"}
              source={getMetric("shop_drawings_overdue")?.source}
              icon={AlertTriangle}
              trendInverse
              onEdit={() => setEditingMetric({ key: "shop_drawings_overdue", label: "Shop Drawings Overdue" })}
            />
            <KPICard
              title="DIFOT %"
              value={isCycleTimeLoading ? 0 : Math.round((cycleTimeData?.qualityMetrics.difotRate ?? 0) * 10) / 10}
              suffix="%"
              target={95}
              status={
                !isCycleTimeLoading && cycleTimeData?.qualityMetrics.difotRate 
                  ? cycleTimeData.qualityMetrics.difotRate >= 95 ? "green" : cycleTimeData.qualityMetrics.difotRate >= 85 ? "amber" : "red"
                  : "neutral"
              }
              source="odoo"
              icon={CheckCircle}
              footer={
                <p className="text-xs text-muted-foreground">
                  {cycleTimeData?.qualityMetrics.onTimeDeliveries ?? 0} on-time / {cycleTimeData?.qualityMetrics.totalCompleted ?? 0} total
                </p>
              }
            />
            <KPICard
              title="Avg Turnaround"
              value={isCycleTimeLoading ? 0 : Math.round(cycleTimeData?.overallAvgHours ?? 0)}
              suffix=" hrs"
              status="neutral"
              source="odoo"
              icon={Clock}
              trendInverse
              footer={
                <p className="text-xs text-muted-foreground">
                  {cycleTimeData?.completedTicketsCount ?? 0} completed tickets
                </p>
              }
            />
          </KPIGrid>
        </KPISection>

        {/* Closed Metrics */}
        <KPISection title="Completed Work" description="Drawings closed by period">
          <KPIGrid columns={3}>
            <KPICard
              title="Closed (Week)"
              value={getMetric("shop_drawings_closed_week")?.value ?? 0}
              status="neutral"
              source={getMetric("shop_drawings_closed_week")?.source}
            />
            <KPICard
              title="Closed (MTD)"
              value={getMetric("shop_drawings_closed_mtd")?.value ?? 0}
              status="neutral"
              source={getMetric("shop_drawings_closed_mtd")?.source}
            />
            <KPICard
              title="Closed (YTD)"
              value={getMetric("shop_drawings_closed_ytd")?.value ?? 0}
              status="neutral"
              source={getMetric("shop_drawings_closed_ytd")?.source}
            />
          </KPIGrid>
        </KPISection>

        {/* Cycle Time Analysis */}
        <KPISection 
          title="Cycle Time Analysis" 
          description="Shop drawing lifecycle from creation to completion"
        >
          {isCycleTimeLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading cycle time data...
            </div>
          ) : !cycleTimeData?.hasStageHistory ? (
            <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Limited Stage History Available</h4>
                    <p className="text-sm text-muted-foreground">
                      Detailed stage tracking data is not available. Showing overall cycle time only.
                      Stage history will be tracked going forward.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <KPIGrid columns={5}>
              {cycleTimeData?.stages.map((stage) => {
                // Map stage names to icons
                const getStageIcon = (stageName: string) => {
                  if (stageName.includes("New")) return FileText;
                  if (stageName.includes("Revision")) return TrendingDown;
                  if (stageName.includes("Progress")) return Activity;
                  if (stageName.includes("Review")) return CheckCircle;
                  if (stageName.includes("Complete")) return CheckCircle;
                  return Clock;
                };

                return (
                  <KPICard
                    key={stage.stageName}
                    title={stage.stageName}
                    value={Math.round(stage.avgHours)}
                    suffix=" hrs"
                    status="neutral"
                    source="odoo"
                    icon={getStageIcon(stage.stageName)}
                    trendInverse
                    footer={
                      <p className="text-xs text-muted-foreground">
                        {stage.ticketCount} ticket{stage.ticketCount !== 1 ? 's' : ''}
                        {stage.minHours > 0 && stage.maxHours > 0 && (
                          <> • {Math.round(stage.minHours)}-{Math.round(stage.maxHours)}h</>
                        )}
                      </p>
                    }
                  />
                );
              })}
            </KPIGrid>
          )}
        </KPISection>

        {/* Team Performance Summary */}
        <KPISection title="Performance Summary">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {helpdeskData?.[0]?.open ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Open Tickets</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                    {helpdeskData?.[0]?.closedMTD ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Closed MTD</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {helpdeskData?.[0]?.overdue ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Overdue</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {helpdeskData?.[0]?.avgCloseHours?.toFixed(1) ?? "-"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Avg Close (hrs)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </KPISection>

        {/* Quality Metrics */}
        <KPISection title="Quality" description="Design quality and revision metrics">
          <KPIGrid columns={2}>
            <KPICard
              title="Revision Rate %"
              value={isCycleTimeLoading ? 0 : Math.round((cycleTimeData?.qualityMetrics.revisionRate ?? 0) * 10) / 10}
              suffix="%"
              status="neutral"
              source="odoo"
              trendInverse
              footer={
                <p className="text-xs text-muted-foreground">
                  {cycleTimeData?.qualityMetrics.revisionsRequired ?? 0} of {cycleTimeData?.qualityMetrics.totalCompleted ?? 0} tickets • Lower is better
                </p>
              }
            />
            <KPICard
              title="First-Time Pass Rate %"
              value={isCycleTimeLoading ? 0 : Math.round((cycleTimeData?.qualityMetrics.firstTimePassRate ?? 0) * 10) / 10}
              suffix="%"
              status="neutral"
              source="odoo"
              footer={
                <p className="text-xs text-muted-foreground">
                  {(cycleTimeData?.qualityMetrics.totalCompleted ?? 0) - (cycleTimeData?.qualityMetrics.revisionsRequired ?? 0)} of {cycleTimeData?.qualityMetrics.totalCompleted ?? 0} tickets • Higher is better
                </p>
              }
            />
          </KPIGrid>
        </KPISection>
      </div>

      <ManualEntryDialog
        open={!!editingMetric}
        onOpenChange={(open) => !open && setEditingMetric(null)}
        metricKey={editingMetric?.key}
        metricLabel={editingMetric?.label}
        currentValue={editingMetric ? getMetric(editingMetric.key)?.value : undefined}
        onSave={handleSaveManual}
        isSaving={isSaving}
      />

      <AICopilot />
    </DashboardLayout>
  );
}
