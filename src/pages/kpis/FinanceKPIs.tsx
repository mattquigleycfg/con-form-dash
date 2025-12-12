import { useState } from "react";
import { Wallet, FileText, AlertTriangle, Clock, DollarSign, TrendingUp, Calculator, Building2 } from "lucide-react";
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

export default function FinanceKPIs() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const [editingMetric, setEditingMetric] = useState<{ key: string; label: string } | null>(null);
  
  const { metrics, isLoading, helpdeskTeams } = useKPIData({ department: "finance", period });
  const { data: helpdeskData, refetch } = useDepartmentHelpdeskKPIs("finance", period);
  const { start, end } = getDateRange(period);
  const { saveEntry, isSaving, getLatestEntry } = useManualKPIs("finance", start, end);

  const handleSaveManual = async (data: ManualEntryData) => {
    await saveEntry({
      department: "finance",
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

  // Revenue breakdown table
  const revenueColumns: KPITableColumn[] = [
    { key: "actual", label: "Actual", align: "right", format: (v) => `$${(v || 0).toLocaleString()}` },
    { key: "budget", label: "Budget", align: "right", format: (v) => `$${(v || 0).toLocaleString()}` },
    { key: "variance", label: "Variance %", align: "right", format: (v) => `${(v || 0).toFixed(1)}%` },
  ];

  const revenueRows: KPITableRow[] = [
    {
      id: "cfg_mtd",
      label: "CFG Revenue (MTD)",
      values: {
        actual: getLatestEntry("revenue_cfg_actual_mtd")?.value ?? 0,
        budget: getLatestEntry("revenue_cfg_budget_mtd")?.value ?? 0,
        variance: 0, // Calculated
      },
      editable: true,
      status: "neutral",
    },
    {
      id: "cfg_ytd",
      label: "CFG Revenue (YTD)",
      values: {
        actual: getLatestEntry("revenue_cfg_actual_ytd")?.value ?? 0,
        budget: getLatestEntry("revenue_cfg_budget_ytd")?.value ?? 0,
        variance: 0,
      },
      editable: true,
      status: "neutral",
    },
    {
      id: "dsf_mtd",
      label: "DSF Revenue (MTD)",
      values: {
        actual: getLatestEntry("revenue_dsf_actual_mtd")?.value ?? 0,
        budget: getLatestEntry("revenue_dsf_budget_mtd")?.value ?? 0,
        variance: 0,
      },
      editable: true,
      status: "neutral",
    },
    {
      id: "dsf_ytd",
      label: "DSF Revenue (YTD)",
      values: {
        actual: getLatestEntry("revenue_dsf_actual_ytd")?.value ?? 0,
        budget: getLatestEntry("revenue_dsf_budget_ytd")?.value ?? 0,
        variance: 0,
      },
      editable: true,
      status: "neutral",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DepartmentHeader
          title="Finance KPIs"
          description="Invoicing, AR/AP, and financial performance metrics"
          icon={Wallet}
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
        />

        {/* Invoicing Section */}
        <KPISection title="Invoicing" description="Invoice processing from Odoo Helpdesk">
          <KPIGrid columns={2}>
            <KPICard
              title="Invoices Open"
              value={getMetric("invoices_open")?.value ?? 0}
              status={getMetric("invoices_open")?.status ?? "neutral"}
              source={getMetric("invoices_open")?.source}
              icon={FileText}
              trendInverse
              onEdit={() => setEditingMetric({ key: "invoices_open", label: "Invoices Open" })}
            />
            <KPICard
              title="Invoices Closed YTD"
              value={getMetric("invoices_closed_ytd")?.value ?? 0}
              status="neutral"
              source={getMetric("invoices_closed_ytd")?.source}
            />
          </KPIGrid>
        </KPISection>

        {/* Account Applications Section */}
        <KPISection title="Account Applications" description="Credit application processing">
          <KPIGrid columns={2}>
            <KPICard
              title="Applications Open"
              value={getMetric("account_apps_open")?.value ?? 0}
              status={getMetric("account_apps_open")?.status ?? "neutral"}
              source={getMetric("account_apps_open")?.source}
              icon={FileText}
              trendInverse
              onEdit={() => setEditingMetric({ key: "account_apps_open", label: "Account Applications Open" })}
            />
            <KPICard
              title="Applications Urgent"
              value={getMetric("account_apps_urgent")?.value ?? 0}
              status={getMetric("account_apps_urgent")?.status ?? "neutral"}
              source={getMetric("account_apps_urgent")?.source}
              icon={AlertTriangle}
              trendInverse
              onEdit={() => setEditingMetric({ key: "account_apps_urgent", label: "Account Applications Urgent" })}
            />
          </KPIGrid>
        </KPISection>

        {/* AR/AP Section */}
        <KPISection title="Accounts Receivable / Payable" description="Cash flow metrics">
          <KPIGrid columns={2}>
            <KPICard
              title="AR Days"
              value={getMetric("ar_days")?.value ?? 0}
              suffix=" days"
              target={45}
              status={getMetric("ar_days")?.status ?? "neutral"}
              source="manual"
              icon={Clock}
              trendInverse
              footer={<p className="text-xs text-muted-foreground">Avg days to receive payment</p>}
              onEdit={() => setEditingMetric({ key: "ar_days", label: "AR Days" })}
            />
            <KPICard
              title="AP Days"
              value={getMetric("ap_days")?.value ?? 0}
              suffix=" days"
              target={30}
              status={getMetric("ap_days")?.status ?? "neutral"}
              source="manual"
              icon={Clock}
              trendInverse
              footer={<p className="text-xs text-muted-foreground">Avg days to pay suppliers</p>}
              onEdit={() => setEditingMetric({ key: "ap_days", label: "AP Days" })}
            />
          </KPIGrid>
        </KPISection>

        {/* Revenue by Division */}
        <KPISection title="Revenue by Division" description="Actual vs budget tracking">
          <KPITable
            columns={revenueColumns}
            rows={revenueRows}
            onEdit={(rowId, columnKey, value) => {
              const [division, period] = rowId.split("_");
              saveEntry({
                department: "finance",
                metricKey: `revenue_${division}_${columnKey}_${period}`,
                value,
                periodStart: start,
                periodEnd: end,
              });
            }}
          />
        </KPISection>

        {/* Profitability */}
        <KPISection title="Profitability" description="Gross profit metrics">
          <KPIGrid columns={3}>
            <KPICard
              title="CFG Revenue (MTD)"
              value={getMetric("revenue_cfg_mtd")?.value ?? 0}
              prefix="$"
              status="neutral"
              source="manual"
              icon={Building2}
              onEdit={() => setEditingMetric({ key: "revenue_cfg_mtd", label: "CFG Revenue (MTD)" })}
            />
            <KPICard
              title="DSF Revenue (MTD)"
              value={getMetric("revenue_dsf_mtd")?.value ?? 0}
              prefix="$"
              status="neutral"
              source="manual"
              icon={Building2}
              onEdit={() => setEditingMetric({ key: "revenue_dsf_mtd", label: "DSF Revenue (MTD)" })}
            />
            <KPICard
              title="Actual GP % YTD"
              value={getMetric("actual_gp_ytd")?.value ?? 0}
              suffix="%"
              target={35}
              status={getMetric("actual_gp_ytd")?.status ?? "neutral"}
              source="manual"
              icon={TrendingUp}
              onEdit={() => setEditingMetric({ key: "actual_gp_ytd", label: "Actual GP % YTD" })}
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
                        <p className="text-muted-foreground">Closed YTD</p>
                        <p className="font-semibold text-emerald-600">{team.closedYTD}</p>
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
