import { useState } from "react";
import { TrendingUp, DollarSign, Target, Users, Percent, Calendar, Phone, FileText } from "lucide-react";
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
import { getDateRange } from "@/utils/dateHelpers";

// Configurable sales reps - could be moved to settings
const SALES_REPS = ["Adam", "Joel", "Mitch"];

export default function SalesKPIs() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const [editingMetric, setEditingMetric] = useState<{ key: string; label: string } | null>(null);
  
  const { metrics, isLoading } = useKPIData({ department: "sales", period });
  const { start, end } = getDateRange(period);
  const { saveEntry, isSaving, getLatestEntry, refetch } = useManualKPIs("sales", start, end);

  const handleSaveManual = async (data: ManualEntryData) => {
    await saveEntry({
      department: "sales",
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

  // Per-Rep metrics table
  const repColumns: KPITableColumn[] = [
    { key: "msi", label: "MSI", align: "right" },
    { key: "msi_target", label: "MSI Target", align: "right" },
    { key: "f2f", label: "F2F Calls", align: "right" },
    { key: "f2f_target", label: "F2F Target", align: "right" },
    { key: "overdue", label: "Overdue Activities", align: "right" },
  ];

  const repRows: KPITableRow[] = SALES_REPS.map((rep) => {
    const repKey = rep.toLowerCase();
    const msi = getLatestEntry(`msi_${repKey}`)?.value ?? 0;
    const msiTarget = getLatestEntry(`msi_target_${repKey}`)?.value ?? 400;
    const f2f = getLatestEntry(`f2f_${repKey}`)?.value ?? 0;
    const f2fTarget = getLatestEntry(`f2f_target_${repKey}`)?.value ?? 5;
    
    return {
      id: repKey,
      label: rep,
      values: {
        msi,
        msi_target: msiTarget,
        f2f,
        f2f_target: f2fTarget,
        overdue: getLatestEntry(`overdue_${repKey}`)?.value ?? 0,
      },
      editable: true,
      status: msi >= msiTarget ? "green" : msi >= msiTarget * 0.75 ? "amber" : "red",
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DepartmentHeader
          title="Sales KPIs"
          description="Revenue, conversion, and pipeline metrics"
          icon={TrendingUp}
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
        />

        {/* Revenue Section */}
        <KPISection title="Revenue" description="Sales revenue metrics">
          <KPIGrid columns={4}>
            <KPICard
              title="Monthly Revenue"
              value={getMetric("revenue_mtd")?.value ?? 0}
              prefix="$"
              target={1850000}
              status={getMetric("revenue_mtd")?.status ?? "neutral"}
              source={getMetric("revenue_mtd")?.source}
              icon={DollarSign}
              onEdit={() => setEditingMetric({ key: "revenue_mtd", label: "Monthly Revenue" })}
            />
            <KPICard
              title="Revenue vs Target"
              value={getMetric("revenue_vs_target")?.value ?? 0}
              suffix="%"
              status={getMetric("revenue_vs_target")?.status ?? "neutral"}
              source={getMetric("revenue_vs_target")?.source}
              icon={Target}
              onEdit={() => setEditingMetric({ key: "revenue_vs_target", label: "Revenue vs Target %" })}
            />
            <KPICard
              title="YTD Revenue"
              value={getMetric("revenue_ytd")?.value ?? 0}
              prefix="$"
              status={getMetric("revenue_ytd")?.status ?? "neutral"}
              source={getMetric("revenue_ytd")?.source}
              icon={Calendar}
              onEdit={() => setEditingMetric({ key: "revenue_ytd", label: "YTD Revenue" })}
            />
            <KPICard
              title="Avg Deal Size"
              value={getMetric("avg_deal_size")?.value ?? 0}
              prefix="$"
              status={getMetric("avg_deal_size")?.status ?? "neutral"}
              source={getMetric("avg_deal_size")?.source}
              icon={FileText}
              onEdit={() => setEditingMetric({ key: "avg_deal_size", label: "Avg Deal Size" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Performance Section */}
        <KPISection title="Performance" description="Conversion and efficiency metrics">
          <KPIGrid columns={3}>
            <KPICard
              title="Conversion Rate"
              value={getMetric("conversion_rate")?.value ?? 0}
              suffix="%"
              target={25}
              status={getMetric("conversion_rate")?.status ?? "neutral"}
              source={getMetric("conversion_rate")?.source}
              icon={Percent}
              onEdit={() => setEditingMetric({ key: "conversion_rate", label: "Conversion Rate %" })}
            />
            <KPICard
              title="Gross Profit %"
              value={getMetric("gross_profit_percent")?.value ?? 0}
              suffix="%"
              target={35}
              status={getMetric("gross_profit_percent")?.status ?? "neutral"}
              source={getMetric("gross_profit_percent")?.source}
              icon={TrendingUp}
              onEdit={() => setEditingMetric({ key: "gross_profit_percent", label: "Gross Profit %" })}
            />
            <KPICard
              title="Sales Cycle Days"
              value={getMetric("sales_cycle_days")?.value ?? 0}
              suffix=" days"
              status={getMetric("sales_cycle_days")?.status ?? "neutral"}
              source={getMetric("sales_cycle_days")?.source}
              icon={Calendar}
              trendInverse
              onEdit={() => setEditingMetric({ key: "sales_cycle_days", label: "Sales Cycle Days" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Pipeline Section */}
        <KPISection title="Pipeline" description="Opportunity and quote metrics">
          <KPIGrid columns={2}>
            <KPICard
              title="Pipeline Value"
              value={getMetric("pipeline_value")?.value ?? 0}
              prefix="$"
              status={getMetric("pipeline_value")?.status ?? "neutral"}
              source={getMetric("pipeline_value")?.source}
              icon={TrendingUp}
              onEdit={() => setEditingMetric({ key: "pipeline_value", label: "Pipeline Value" })}
            />
            <KPICard
              title="Quotes This Week"
              value={getMetric("quotes_this_week")?.value ?? 0}
              status={getMetric("quotes_this_week")?.status ?? "neutral"}
              source={getMetric("quotes_this_week")?.source}
              icon={FileText}
              onEdit={() => setEditingMetric({ key: "quotes_this_week", label: "Quotes This Week" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Per-Rep Metrics */}
        <KPISection title="Sales Rep Performance" description="Individual rep activity metrics (MSI = Must See Interactions)">
          <KPITable
            columns={repColumns}
            rows={repRows}
            onEdit={(rowId, columnKey, value) => {
              saveEntry({
                department: "sales",
                metricKey: `${columnKey}_${rowId}`,
                value,
                periodStart: start,
                periodEnd: end,
              });
            }}
          />
        </KPISection>

        {/* Targets Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Revenue Target</p>
                <p className="text-lg font-semibold">
                  ${(getLatestEntry("revenue_target_monthly")?.value ?? 1850000).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">GP% Target</p>
                <p className="text-lg font-semibold">{getLatestEntry("gp_target")?.value ?? 35}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Conversion Target</p>
                <p className="text-lg font-semibold">{getLatestEntry("conversion_target")?.value ?? 25}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">MSI Target (per rep)</p>
                <p className="text-lg font-semibold">{getLatestEntry("msi_target_default")?.value ?? 400}</p>
              </div>
            </div>
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
