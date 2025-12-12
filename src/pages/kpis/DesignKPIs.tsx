import { useState } from "react";
import { Palette, FileText, AlertTriangle, CheckCircle, Clock } from "lucide-react";
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
import { getDateRange } from "@/utils/dateHelpers";

export default function DesignKPIs() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const [editingMetric, setEditingMetric] = useState<{ key: string; label: string } | null>(null);
  
  const { metrics, isLoading, helpdeskTeams } = useKPIData({ department: "design", period });
  const { data: helpdeskData, refetch } = useDepartmentHelpdeskKPIs("design", period);
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
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
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
              value={getMetric("shop_drawing_difot")?.value ?? 0}
              suffix="%"
              target={95}
              status={getMetric("shop_drawing_difot")?.status ?? "neutral"}
              source="manual"
              icon={CheckCircle}
              onEdit={() => setEditingMetric({ key: "shop_drawing_difot", label: "Shop Drawing DIFOT %" })}
            />
            <KPICard
              title="Avg Turnaround"
              value={getLatestEntry("shop_drawing_avg_hours")?.value ?? 0}
              suffix=" hrs"
              status="neutral"
              source="manual"
              icon={Clock}
              trendInverse
              onEdit={() => setEditingMetric({ key: "shop_drawing_avg_hours", label: "Avg Turnaround (hrs)" })}
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
              value={getLatestEntry("revision_rate")?.value ?? 0}
              suffix="%"
              status="neutral"
              source="manual"
              trendInverse
              footer={<p className="text-xs text-muted-foreground">Lower is better</p>}
              onEdit={() => setEditingMetric({ key: "revision_rate", label: "Revision Rate %" })}
            />
            <KPICard
              title="First-Time Pass Rate %"
              value={getLatestEntry("first_time_pass_rate")?.value ?? 0}
              suffix="%"
              status="neutral"
              source="manual"
              footer={<p className="text-xs text-muted-foreground">Higher is better</p>}
              onEdit={() => setEditingMetric({ key: "first_time_pass_rate", label: "First-Time Pass Rate %" })}
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
