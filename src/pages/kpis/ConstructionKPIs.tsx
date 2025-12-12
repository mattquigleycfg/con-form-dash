import { useState } from "react";
import { HardHat, FileText, Clock, AlertTriangle, MapPin, DollarSign, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
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

export default function ConstructionKPIs() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const [editingMetric, setEditingMetric] = useState<{ key: string; label: string } | null>(null);
  
  const { metrics, isLoading, helpdeskTeams } = useKPIData({ department: "construction", period });
  const { data: helpdeskData, refetch } = useDepartmentHelpdeskKPIs("construction", period);
  const { start, end } = getDateRange(period);
  const { saveEntry, isSaving, getLatestEntry } = useManualKPIs("construction", start, end);

  const handleSaveManual = async (data: ManualEntryData) => {
    await saveEntry({
      department: "construction",
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
          title="Construction KPIs"
          description="Project delivery, contracts, and site metrics"
          icon={HardHat}
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
        />

        {/* Contracts Section */}
        <KPISection title="Contracts" description="Contract processing from Odoo Helpdesk">
          <KPIGrid columns={3}>
            <KPICard
              title="Contracts Open"
              value={getMetric("contracts_open")?.value ?? 0}
              status={getMetric("contracts_open")?.status ?? "neutral"}
              source={getMetric("contracts_open")?.source}
              icon={FileText}
              trendInverse
              onEdit={() => setEditingMetric({ key: "contracts_open", label: "Contracts Open" })}
            />
            <KPICard
              title="Contracts Unassigned"
              value={getMetric("contracts_unassigned")?.value ?? 0}
              status={getMetric("contracts_unassigned")?.status ?? "neutral"}
              source={getMetric("contracts_unassigned")?.source}
              icon={Clock}
              trendInverse
              onEdit={() => setEditingMetric({ key: "contracts_unassigned", label: "Contracts Unassigned" })}
            />
            <KPICard
              title="Contracts Overdue"
              value={getMetric("contracts_overdue")?.value ?? 0}
              status={getMetric("contracts_overdue")?.status ?? "neutral"}
              source={getMetric("contracts_overdue")?.source}
              icon={AlertTriangle}
              trendInverse
              onEdit={() => setEditingMetric({ key: "contracts_overdue", label: "Contracts Overdue" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Live Projects by State */}
        <KPISection title="Live Projects by State" description="Active project count and value by region">
          <KPIGrid columns={4}>
            <KPICard
              title="NSW Projects"
              value={getMetric("live_projects_nsw")?.value ?? 0}
              status="neutral"
              source="manual"
              icon={MapPin}
              onEdit={() => setEditingMetric({ key: "live_projects_nsw", label: "Live Projects NSW" })}
            />
            <KPICard
              title="VIC Projects"
              value={getMetric("live_projects_vic")?.value ?? 0}
              status="neutral"
              source="manual"
              icon={MapPin}
              onEdit={() => setEditingMetric({ key: "live_projects_vic", label: "Live Projects VIC" })}
            />
            <KPICard
              title="QLD Projects"
              value={getMetric("live_projects_qld")?.value ?? 0}
              status="neutral"
              source="manual"
              icon={MapPin}
              onEdit={() => setEditingMetric({ key: "live_projects_qld", label: "Live Projects QLD" })}
            />
            <KPICard
              title="Total $ Value"
              value={getMetric("live_projects_value")?.value ?? 0}
              prefix="$"
              status="neutral"
              source="manual"
              icon={DollarSign}
              onEdit={() => setEditingMetric({ key: "live_projects_value", label: "Live Projects $ Value" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Performance Section */}
        <KPISection title="Project Performance" description="Delivery and budget metrics">
          <KPIGrid columns={3}>
            <KPICard
              title="Project DIFOT %"
              value={getMetric("project_difot")?.value ?? 0}
              suffix="%"
              target={95}
              status={getMetric("project_difot")?.status ?? "neutral"}
              source="manual"
              icon={CheckCircle}
              onEdit={() => setEditingMetric({ key: "project_difot", label: "Project DIFOT %" })}
            />
            <KPICard
              title="Closed Within Budget"
              value={getMetric("closed_within_budget")?.value ?? 0}
              prefix="$"
              status="neutral"
              source="manual"
              icon={TrendingUp}
              footer={<p className="text-xs text-muted-foreground">MTD/YTD value</p>}
              onEdit={() => setEditingMetric({ key: "closed_within_budget", label: "Closed Within Budget" })}
            />
            <KPICard
              title="Closed Over Budget"
              value={getMetric("closed_over_budget")?.value ?? 0}
              prefix="$"
              status="neutral"
              source="manual"
              icon={TrendingDown}
              footer={<p className="text-xs text-muted-foreground">MTD/YTD value</p>}
              onEdit={() => setEditingMetric({ key: "closed_over_budget", label: "Closed Over Budget" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Helpdesk Teams Detail */}
        {helpdeskData && helpdeskData.length > 0 && (
          <KPISection title="Team Details" description="Detailed breakdown by helpdesk team">
            <div className="grid gap-4 md:grid-cols-2">
              {helpdeskData.map((team) => (
                <Card key={team.teamName}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{team.teamName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Open</p>
                        <p className="font-semibold">{team.open}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Unassigned</p>
                        <p className="font-semibold text-amber-600">{team.unassigned}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Overdue</p>
                        <p className="font-semibold text-red-600">{team.overdue}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </KPISection>
        )}
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
