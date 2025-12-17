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
import { useOdooAccounting } from "@/hooks/useOdooAccounting";
import { useAccountApplications } from "@/hooks/useAccountApplications";
import { getDateRange } from "@/utils/dateHelpers";

export default function FinanceKPIs() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const [editingMetric, setEditingMetric] = useState<{ key: string; label: string } | null>(null);
  
  const { metrics, isLoading, helpdeskTeams } = useKPIData({ department: "finance", period });
  const { data: helpdeskData, refetch } = useDepartmentHelpdeskKPIs("finance", period);
  const { start, end } = getDateRange(period);
  const { saveEntry, isSaving, getLatestEntry } = useManualKPIs("finance", start, end);
  
  // Odoo Accounting Integration
  const { data: accountingData, isLoading: accountingLoading, refetch: refetchAccounting } = useOdooAccounting(start, end);
  const { data: accountAppData, isLoading: appsLoading, refetch: refetchAccountApps } = useAccountApplications(start, end);
  
  const isLoadingAll = isLoading || accountingLoading || appsLoading;

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
          onRefresh={() => {
            refetch();
            refetchAccounting();
            refetchAccountApps();
          }}
          isRefreshing={isLoadingAll}
        />

        {/* Invoicing Section */}
        <KPISection title="Invoicing" description="Invoice data from Odoo Accounting">
          <KPIGrid columns={3}>
            <KPICard
              title="Total Invoices"
              value={accountingData?.invoicing.totalInvoices ?? 0}
              status="neutral"
              source="odoo"
              icon={FileText}
            />
            <KPICard
              title="Paid Invoices"
              value={accountingData?.invoicing.paidInvoices ?? 0}
              status="positive"
              source="odoo"
              icon={FileText}
            />
            <KPICard
              title="Outstanding Invoices"
              value={accountingData?.invoicing.outstandingInvoices ?? 0}
              status={
                (accountingData?.invoicing.outstandingInvoices ?? 0) > 10
                  ? "warning"
                  : "neutral"
              }
              source="odoo"
              icon={FileText}
              trendInverse
            />
          </KPIGrid>
          <KPIGrid columns={1} className="mt-4">
            <KPICard
              title="Total Revenue"
              value={`$${((accountingData?.invoicing.totalRevenue ?? 0) / 1000).toFixed(0)}k`}
              status="positive"
              source="odoo"
              icon={DollarSign}
            />
          </KPIGrid>
        </KPISection>

        {/* Account Applications Section */}
        <KPISection title="Account Applications" description="Credit application processing from Odoo Helpdesk">
          <KPIGrid columns={3}>
            <KPICard
              title="Total Applications"
              value={accountAppData?.totalTickets ?? 0}
              status="neutral"
              source="odoo"
              icon={FileText}
            />
            <KPICard
              title="Applications Open"
              value={(accountAppData?.totalTickets ?? 0) - (accountAppData?.completedTickets ?? 0)}
              status={
                ((accountAppData?.totalTickets ?? 0) - (accountAppData?.completedTickets ?? 0)) > 5
                  ? "warning"
                  : "neutral"
              }
              source="odoo"
              icon={FileText}
              trendInverse
            />
            <KPICard
              title="Completed"
              value={accountAppData?.completedTickets ?? 0}
              status="positive"
              source="odoo"
              icon={FileText}
            />
          </KPIGrid>
        </KPISection>

        {/* AR/AP Section */}
        <KPISection title="Accounts Receivable / Payable" description="Cash flow metrics from Odoo Accounting">
          <KPIGrid columns={3}>
            <KPICard
              title="AR Days"
              value={Math.round(accountingData?.arDays ?? 0)}
              suffix=" days"
              target={30}
              status={
                (accountingData?.arDays ?? 0) <= 30
                  ? "positive"
                  : (accountingData?.arDays ?? 0) <= 45
                  ? "warning"
                  : "negative"
              }
              source="odoo"
              icon={Clock}
              trendInverse
              footer={<p className="text-xs text-muted-foreground">Avg days to receive payment</p>}
            />
            <KPICard
              title="AP Days"
              value={Math.round(accountingData?.apDays ?? 0)}
              suffix=" days"
              target={30}
              status={
                (accountingData?.apDays ?? 0) <= 30
                  ? "positive"
                  : (accountingData?.apDays ?? 0) <= 45
                  ? "warning"
                  : "negative"
              }
              source="odoo"
              icon={Clock}
              trendInverse
              footer={<p className="text-xs text-muted-foreground">Avg days to pay suppliers</p>}
            />
            <KPICard
              title="Cash Conversion Cycle"
              value={`${Math.round((accountingData?.arDays ?? 0) - (accountingData?.apDays ?? 0))} days`}
              status={
                ((accountingData?.arDays ?? 0) - (accountingData?.apDays ?? 0)) <= 15
                  ? "positive"
                  : ((accountingData?.arDays ?? 0) - (accountingData?.apDays ?? 0)) <= 30
                  ? "warning"
                  : "negative"
              }
              source="odoo"
              icon={TrendingUp}
              trendInverse
              footer={<p className="text-xs text-muted-foreground">AR Days - AP Days</p>}
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
