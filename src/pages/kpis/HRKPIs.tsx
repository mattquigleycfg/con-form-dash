import { useState } from "react";
import { UserCog, Users, Calendar, ShieldAlert, TrendingDown, ThumbsUp } from "lucide-react";
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
import { getDateRange } from "@/utils/dateHelpers";

export default function HRKPIs() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const [editingMetric, setEditingMetric] = useState<{ key: string; label: string } | null>(null);
  
  const { metrics, isLoading } = useKPIData({ department: "hr", period });
  const { start, end } = getDateRange(period);
  const { saveEntry, isSaving, getLatestEntry, refetch } = useManualKPIs("hr", start, end);

  const handleSaveManual = async (data: ManualEntryData) => {
    await saveEntry({
      department: "hr",
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
          title="HR KPIs"
          description="Employee engagement, safety, and workforce metrics"
          icon={UserCog}
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
        />

        {/* Employee Metrics */}
        <KPISection title="Employee Metrics" description="Workforce health indicators">
          <KPIGrid columns={2}>
            <KPICard
              title="Attrition Rate %"
              value={getMetric("employee_attrition_rate")?.value ?? 0}
              suffix="%"
              target={10}
              status={getMetric("employee_attrition_rate")?.status ?? "neutral"}
              source="manual"
              icon={TrendingDown}
              trendInverse
              footer={<p className="text-xs text-muted-foreground">(Leaves / Employees) × 100</p>}
              onEdit={() => setEditingMetric({ key: "employee_attrition_rate", label: "Attrition Rate %" })}
            />
            <KPICard
              title="Employee NPS"
              value={getMetric("employee_enps")?.value ?? 0}
              status={getMetric("employee_enps")?.status ?? "neutral"}
              source="manual"
              icon={ThumbsUp}
              footer={<p className="text-xs text-muted-foreground">Employee Net Promoter Score</p>}
              onEdit={() => setEditingMetric({ key: "employee_enps", label: "Employee NPS" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Attendance */}
        <KPISection title="Attendance" description="Leave and absenteeism tracking">
          <KPIGrid columns={2}>
            <KPICard
              title="Absenteeism Rate %"
              value={getMetric("absenteeism_rate")?.value ?? 0}
              suffix="%"
              target={3}
              status={getMetric("absenteeism_rate")?.status ?? "neutral"}
              source="manual"
              icon={Calendar}
              trendInverse
              footer={<p className="text-xs text-muted-foreground">Unplanned leave rate</p>}
              onEdit={() => setEditingMetric({ key: "absenteeism_rate", label: "Absenteeism Rate %" })}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Leave Module</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Connect Odoo HR Leave module for automated tracking. Currently using manual entry.
                </p>
              </CardContent>
            </Card>
          </KPIGrid>
        </KPISection>

        {/* Safety Section */}
        <KPISection title="Safety" description="Workplace health and safety">
          <KPIGrid columns={2}>
            <KPICard
              title="Days Since Last Injury"
              value={getMetric("days_since_injury")?.value ?? 0}
              suffix=" days"
              target={30}
              status={getMetric("days_since_injury")?.status ?? "neutral"}
              source="manual"
              icon={ShieldAlert}
              footer={<p className="text-xs text-muted-foreground">Safety counter - higher is better</p>}
              onEdit={() => setEditingMetric({ key: "days_since_injury", label: "Days Since Last Injury" })}
            />
            <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Safety First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {getLatestEntry("days_since_injury")?.value ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">consecutive safe days</p>
              </CardContent>
            </Card>
          </KPIGrid>
        </KPISection>

        {/* Headcount */}
        <KPISection title="Headcount" description="Workforce numbers">
          <KPIGrid columns={3}>
            <KPICard
              title="Total Employees"
              value={getLatestEntry("total_employees")?.value ?? 0}
              status="neutral"
              source="manual"
              icon={Users}
              onEdit={() => setEditingMetric({ key: "total_employees", label: "Total Employees" })}
            />
            <KPICard
              title="New Hires (YTD)"
              value={getLatestEntry("new_hires_ytd")?.value ?? 0}
              status="neutral"
              source="manual"
              icon={Users}
              onEdit={() => setEditingMetric({ key: "new_hires_ytd", label: "New Hires (YTD)" })}
            />
            <KPICard
              title="Departures (YTD)"
              value={getLatestEntry("departures_ytd")?.value ?? 0}
              status="neutral"
              source="manual"
              icon={Users}
              trendInverse
              onEdit={() => setEditingMetric({ key: "departures_ytd", label: "Departures (YTD)" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              HR KPIs are currently entered manually. If Odoo HR module is installed, these metrics can be 
              automated through integration with <code className="text-xs bg-muted px-1 py-0.5 rounded">hr.employee</code> and{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">hr.leave</code> models.
            </p>
          </CardContent>
        </Card>
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
