import { useState } from "react";
import { Factory, Package, Scissors, AlertTriangle, CheckCircle, Clock, Wrench, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KPICard,
  KPIGrid,
  KPISection,
  KPITable,
  DepartmentHeader,
  ManualEntryDialog,
  type KPITableColumn,
  type KPITableRow,
  type DatePeriod,
  type ManualEntryData,
} from "@/components/kpi";
import { useKPIData } from "@/hooks/useKPIData";
import { useManualKPIs } from "@/hooks/useManualKPIs";
import { useDepartmentHelpdeskKPIs } from "@/hooks/useHelpdeskKPIs";
import { getDateRange } from "@/utils/dateHelpers";

export default function ProductionKPIs() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const [editingMetric, setEditingMetric] = useState<{ key: string; label: string } | null>(null);
  
  const { metrics, isLoading, helpdeskTeams } = useKPIData({ department: "production", period });
  const { data: helpdeskData, refetch } = useDepartmentHelpdeskKPIs("production", period);
  const { start, end } = getDateRange(period);
  const { saveEntry, isSaving, getLatestEntry } = useManualKPIs("production", start, end);

  const handleSaveManual = async (data: ManualEntryData) => {
    await saveEntry({
      department: "production",
      metricKey: data.metricKey,
      value: data.value,
      target: data.target,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      notes: data.notes,
    });
    setEditingMetric(null);
  };

  // Get metrics by key for easy access
  const getMetric = (key: string) => metrics.find((m) => m.key === key);

  // Metres rolled table data
  const metresRolledColumns: KPITableColumn[] = [
    { key: "week", label: "Week", align: "right" },
    { key: "month", label: "Month", align: "right" },
    { key: "ytd", label: "YTD", align: "right" },
  ];

  const machineMetrics = [
    "Span+",
    "Acoustic Cassettes",
    "Top Hat",
    "Louvre",
    "Acoustic Louvre",
    "Galaxy",
  ];

  const metresRolledRows: KPITableRow[] = machineMetrics.map((machine) => ({
    id: machine.toLowerCase().replace(/\s+/g, "_"),
    label: machine,
    values: {
      week: getLatestEntry(`metres_${machine.toLowerCase().replace(/\s+/g, "_")}_week`)?.value ?? 0,
      month: getLatestEntry(`metres_${machine.toLowerCase().replace(/\s+/g, "_")}_month`)?.value ?? 0,
      ytd: getLatestEntry(`metres_${machine.toLowerCase().replace(/\s+/g, "_")}_ytd`)?.value ?? 0,
    },
    editable: true,
    status: "neutral",
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DepartmentHeader
          title="Production KPIs"
          description="Manufacturing, packouts, and fulfillment metrics"
          icon={Factory}
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
        />

        {/* Packouts Section */}
        <KPISection title="Pack out Requests" description="Packout ticket metrics from Odoo Helpdesk">
          <KPIGrid columns={4}>
            <KPICard
              title="Packouts Open"
              value={getMetric("packouts_open")?.value ?? 0}
              status={getMetric("packouts_open")?.status ?? "neutral"}
              source={getMetric("packouts_open")?.source}
              icon={Package}
              trendInverse
              onEdit={() => setEditingMetric({ key: "packouts_open", label: "Packouts Open" })}
            />
            <KPICard
              title="Packouts Urgent"
              value={getMetric("packouts_urgent")?.value ?? 0}
              status={getMetric("packouts_urgent")?.status ?? "neutral"}
              source={getMetric("packouts_urgent")?.source}
              icon={AlertTriangle}
              trendInverse
              onEdit={() => setEditingMetric({ key: "packouts_urgent", label: "Packouts Urgent" })}
            />
            <KPICard
              title="Unassigned"
              value={getMetric("packouts_unassigned")?.value ?? 0}
              status={getMetric("packouts_unassigned")?.status ?? "neutral"}
              source={getMetric("packouts_unassigned")?.source}
              icon={Clock}
              trendInverse
              onEdit={() => setEditingMetric({ key: "packouts_unassigned", label: "Packouts Unassigned" })}
            />
            <KPICard
              title="DIFOT %"
              value={getMetric("packout_difot")?.value ?? 0}
              suffix="%"
              target={95}
              status={getMetric("packout_difot")?.status ?? "neutral"}
              source={getMetric("packout_difot")?.source}
              icon={CheckCircle}
              onEdit={() => setEditingMetric({ key: "packout_difot", label: "Packout DIFOT %" })}
            />
          </KPIGrid>

          <KPIGrid columns={3}>
            <KPICard
              title="Closed (Week)"
              value={getMetric("packouts_closed_week")?.value ?? 0}
              status="neutral"
              source={getMetric("packouts_closed_week")?.source}
            />
            <KPICard
              title="Closed (MTD)"
              value={getMetric("packouts_closed_mtd")?.value ?? 0}
              status="neutral"
              source={getMetric("packouts_closed_mtd")?.source}
            />
            <KPICard
              title="Closed (YTD)"
              value={getMetric("packouts_closed_ytd")?.value ?? 0}
              status="neutral"
              source={getMetric("packouts_closed_ytd")?.source}
            />
          </KPIGrid>
        </KPISection>

        {/* Kit Orders Section */}
        <KPISection title="Kit Orders" description="Kit order ticket metrics">
          <KPIGrid columns={3}>
            <KPICard
              title="Kit Orders Open"
              value={getMetric("kit_orders_open")?.value ?? 0}
              status={getMetric("kit_orders_open")?.status ?? "neutral"}
              source={getMetric("kit_orders_open")?.source}
              icon={Scissors}
              trendInverse
              onEdit={() => setEditingMetric({ key: "kit_orders_open", label: "Kit Orders Open" })}
            />
            <KPICard
              title="Kit Orders Urgent"
              value={getMetric("kit_orders_urgent")?.value ?? 0}
              status={getMetric("kit_orders_urgent")?.status ?? "neutral"}
              source={getMetric("kit_orders_urgent")?.source}
              icon={AlertTriangle}
              trendInverse
              onEdit={() => setEditingMetric({ key: "kit_orders_urgent", label: "Kit Orders Urgent" })}
            />
            <KPICard
              title="Unassigned"
              value={getMetric("kit_orders_unassigned")?.value ?? 0}
              status={getMetric("kit_orders_unassigned")?.status ?? "neutral"}
              source={getMetric("kit_orders_unassigned")?.source}
              icon={Clock}
              trendInverse
              onEdit={() => setEditingMetric({ key: "kit_orders_unassigned", label: "Kit Orders Unassigned" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Span+ Section */}
        <KPISection title="Span+" description="Span+ production line metrics">
          <KPIGrid columns={2}>
            <KPICard
              title="Span+ Open"
              value={getMetric("span_open")?.value ?? 0}
              status={getMetric("span_open")?.status ?? "neutral"}
              source={getMetric("span_open")?.source}
              icon={Wrench}
              trendInverse
              onEdit={() => setEditingMetric({ key: "span_open", label: "Span+ Open" })}
            />
            <KPICard
              title="Span+ Urgent"
              value={getMetric("span_urgent")?.value ?? 0}
              status={getMetric("span_urgent")?.status ?? "neutral"}
              source={getMetric("span_urgent")?.source}
              icon={AlertTriangle}
              trendInverse
              onEdit={() => setEditingMetric({ key: "span_urgent", label: "Span+ Urgent" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Metres Rolled Section */}
        <KPISection title="Metres Rolled by Machine" description="Manual entry for production output tracking">
          <KPITable
            columns={metresRolledColumns}
            rows={metresRolledRows}
            onEdit={(rowId, columnKey, value) => {
              const machine = rowId.replace(/_/g, " ");
              saveEntry({
                department: "production",
                metricKey: `metres_${rowId}_${columnKey}`,
                value,
                periodStart: start,
                periodEnd: end,
              });
            }}
          />
        </KPISection>

        {/* Safety Section */}
        <KPISection title="Safety" description="Workplace health and safety metrics">
          <KPIGrid columns={2}>
            <KPICard
              title="Safety Incidents YTD"
              value={getMetric("safety_incidents_ytd")?.value ?? 0}
              status={getMetric("safety_incidents_ytd")?.status ?? "neutral"}
              source="manual"
              icon={ShieldAlert}
              trendInverse
              onEdit={() => setEditingMetric({ key: "safety_incidents_ytd", label: "Safety Incidents YTD" })}
            />
            <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Days Without Incident
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {getLatestEntry("days_without_incident")?.value ?? 0}
                </p>
              </CardContent>
            </Card>
          </KPIGrid>
        </KPISection>

        {/* Helpdesk Teams Detail */}
        {helpdeskData && helpdeskData.length > 0 && (
          <KPISection title="Team Details" description="Detailed breakdown by helpdesk team">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {helpdeskData.map((team) => (
                <Card key={team.teamName}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{team.teamName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Open</p>
                        <p className="font-semibold">{team.open}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Urgent</p>
                        <p className="font-semibold text-red-600">{team.urgent}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Unassigned</p>
                        <p className="font-semibold text-amber-600">{team.unassigned}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Closed MTD</p>
                        <p className="font-semibold text-emerald-600">{team.closedMTD}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </KPISection>
        )}
      </div>

      {/* Manual Entry Dialog */}
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
