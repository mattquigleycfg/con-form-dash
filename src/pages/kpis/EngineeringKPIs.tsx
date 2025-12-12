import { useState } from "react";
import { Compass, FileText, AlertTriangle, CheckCircle, Clock, Target, Building2 } from "lucide-react";
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

export default function EngineeringKPIs() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const [editingMetric, setEditingMetric] = useState<{ key: string; label: string } | null>(null);
  
  const { metrics, isLoading, helpdeskTeams } = useKPIData({ department: "engineering", period });
  const { data: helpdeskData, refetch } = useDepartmentHelpdeskKPIs("engineering", period);
  const { start, end } = getDateRange(period);
  const { saveEntry, isSaving, getLatestEntry } = useManualKPIs("engineering", start, end);

  const handleSaveManual = async (data: ManualEntryData) => {
    await saveEntry({
      department: "engineering",
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

  // Quote breakdown table
  const quoteColumns: KPITableColumn[] = [
    { key: "install", label: "Install $", align: "right", format: (v) => `$${(v || 0).toLocaleString()}` },
    { key: "kits", label: "Kits $", align: "right", format: (v) => `$${(v || 0).toLocaleString()}` },
    { key: "dsf", label: "DSF $", align: "right", format: (v) => `$${(v || 0).toLocaleString()}` },
  ];

  const quoteRows: KPITableRow[] = [
    {
      id: "week",
      label: "This Week",
      values: {
        install: getLatestEntry("quote_install_week")?.value ?? 0,
        kits: getLatestEntry("quote_kits_week")?.value ?? 0,
        dsf: getLatestEntry("quote_dsf_week")?.value ?? 0,
      },
      editable: true,
      status: "neutral",
    },
    {
      id: "mtd",
      label: "Month to Date",
      values: {
        install: getLatestEntry("quote_install_mtd")?.value ?? 0,
        kits: getLatestEntry("quote_kits_mtd")?.value ?? 0,
        dsf: getLatestEntry("quote_dsf_mtd")?.value ?? 0,
      },
      editable: true,
      status: "neutral",
    },
    {
      id: "ytd",
      label: "Year to Date",
      values: {
        install: getLatestEntry("quote_install_ytd")?.value ?? 0,
        kits: getLatestEntry("quote_kits_ytd")?.value ?? 0,
        dsf: getLatestEntry("quote_dsf_ytd")?.value ?? 0,
      },
      editable: true,
      status: "neutral",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DepartmentHeader
          title="Engineering KPIs"
          description="Quoting, estimation, and BOM metrics"
          icon={Compass}
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
        />

        {/* CFG Division Section */}
        <KPISection title="CFG Division - Design Estimators" description="Con-form Group quoting metrics">
          <KPIGrid columns={4}>
            <KPICard
              title="Quotes Open"
              value={getMetric("cfg_quotes_open")?.value ?? 0}
              status={getMetric("cfg_quotes_open")?.status ?? "neutral"}
              source={getMetric("cfg_quotes_open")?.source}
              icon={FileText}
              trendInverse
              onEdit={() => setEditingMetric({ key: "cfg_quotes_open", label: "CFG Quotes Open" })}
            />
            <KPICard
              title="Quotes Overdue"
              value={getMetric("cfg_quotes_overdue")?.value ?? 0}
              status={getMetric("cfg_quotes_overdue")?.status ?? "neutral"}
              source={getMetric("cfg_quotes_overdue")?.source}
              icon={AlertTriangle}
              trendInverse
              onEdit={() => setEditingMetric({ key: "cfg_quotes_overdue", label: "CFG Quotes Overdue" })}
            />
            <KPICard
              title="Success Rate"
              value={getMetric("cfg_quote_success_rate")?.value ?? 0}
              suffix="%"
              target={30}
              status={getMetric("cfg_quote_success_rate")?.status ?? "neutral"}
              source={getMetric("cfg_quote_success_rate")?.source}
              icon={Target}
              onEdit={() => setEditingMetric({ key: "cfg_quote_success_rate", label: "CFG Success Rate %" })}
            />
            <KPICard
              title="Quote DIFOT %"
              value={getMetric("quote_difot")?.value ?? 0}
              suffix="%"
              target={95}
              status={getMetric("quote_difot")?.status ?? "neutral"}
              source={getMetric("quote_difot")?.source}
              icon={CheckCircle}
              onEdit={() => setEditingMetric({ key: "quote_difot", label: "Quote DIFOT %" })}
            />
          </KPIGrid>

          <KPIGrid columns={3}>
            <KPICard
              title="Closed (Week)"
              value={getMetric("cfg_quotes_closed_week")?.value ?? 0}
              status="neutral"
              source={getMetric("cfg_quotes_closed_week")?.source}
            />
            <KPICard
              title="Closed (MTD)"
              value={getMetric("cfg_quotes_closed_mtd")?.value ?? 0}
              status="neutral"
              source={getMetric("cfg_quotes_closed_mtd")?.source}
            />
            <KPICard
              title="Closed (YTD)"
              value={getMetric("cfg_quotes_closed_ytd")?.value ?? 0}
              status="neutral"
              source={getMetric("cfg_quotes_closed_ytd")?.source}
            />
          </KPIGrid>
        </KPISection>

        {/* DSF Division Section */}
        <KPISection title="DSF Division - Estimating" description="DSF quoting metrics">
          <KPIGrid columns={3}>
            <KPICard
              title="Quotes Open"
              value={getMetric("dsf_quotes_open")?.value ?? 0}
              status={getMetric("dsf_quotes_open")?.status ?? "neutral"}
              source={getMetric("dsf_quotes_open")?.source}
              icon={FileText}
              trendInverse
              onEdit={() => setEditingMetric({ key: "dsf_quotes_open", label: "DSF Quotes Open" })}
            />
            <KPICard
              title="Quotes Urgent"
              value={getMetric("dsf_quotes_urgent")?.value ?? 0}
              status={getMetric("dsf_quotes_urgent")?.status ?? "neutral"}
              source={getMetric("dsf_quotes_urgent")?.source}
              icon={AlertTriangle}
              trendInverse
              onEdit={() => setEditingMetric({ key: "dsf_quotes_urgent", label: "DSF Quotes Urgent" })}
            />
            <KPICard
              title="Closed (MTD)"
              value={getMetric("dsf_quotes_closed_mtd")?.value ?? 0}
              status="neutral"
              source={getMetric("dsf_quotes_closed_mtd")?.source}
            />
          </KPIGrid>
        </KPISection>

        {/* Quote Analysis Section */}
        <KPISection title="Quote Analysis by Type" description="Manual entry for quote value breakdown">
          <KPITable
            columns={quoteColumns}
            rows={quoteRows}
            onEdit={(rowId, columnKey, value) => {
              saveEntry({
                department: "engineering",
                metricKey: `quote_${columnKey}_${rowId}`,
                value,
                periodStart: start,
                periodEnd: end,
              });
            }}
          />
        </KPISection>

        {/* BOM Section */}
        <KPISection title="BOM Pipeline" description="Bill of Materials processing metrics">
          <KPIGrid columns={2}>
            <KPICard
              title="BOM Pipeline Open"
              value={getMetric("bom_pipeline_open")?.value ?? 0}
              status={getMetric("bom_pipeline_open")?.status ?? "neutral"}
              source="manual"
              icon={Building2}
              trendInverse
              onEdit={() => setEditingMetric({ key: "bom_pipeline_open", label: "BOM Pipeline Open" })}
            />
            <KPICard
              title="BOM DIFOT %"
              value={getMetric("bom_difot")?.value ?? 0}
              suffix="%"
              target={95}
              status={getMetric("bom_difot")?.status ?? "neutral"}
              source="manual"
              icon={CheckCircle}
              onEdit={() => setEditingMetric({ key: "bom_difot", label: "BOM DIFOT %" })}
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
                        <p className="text-muted-foreground">Urgent</p>
                        <p className="font-semibold text-red-600">{team.urgent}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Overdue</p>
                        <p className="font-semibold text-amber-600">{team.overdue}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Closed MTD</p>
                        <p className="font-semibold text-emerald-600">{team.closedMTD}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Closed YTD</p>
                        <p className="font-semibold">{team.closedYTD}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Close (hrs)</p>
                        <p className="font-semibold">{team.avgCloseHours?.toFixed(1) ?? "-"}</p>
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
