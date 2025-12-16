import { useState } from "react";
import { DepartmentHeader, KPISection, KPIGrid, KPICard } from "@/components/kpi";
import { AdvancedFilterBar } from "@/components/filters/AdvancedFilterBar";
import { useAccountApplications } from "@/hooks/useAccountApplications";
import { useOdooAccounting } from "@/hooks/useOdooAccounting";
import { getDateRange } from "@/utils/dateHelpers";
import type { AdvancedFilters } from "@/types/filters";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Target,
  Calendar,
  AlertCircle,
  ArrowRightLeft,
} from "lucide-react";

type Period = "week" | "month" | "ytd";

export default function AccountingKPIs() {
  const [activePeriod, setActivePeriod] = useState<Period>("month");
  const [filters, setFilters] = useState<AdvancedFilters>({
    dateRange: getDateRange(activePeriod),
    assignedTo: [],
    team: [],
    priority: [],
    status: [],
  });

  const { start, end } = filters.dateRange;

  const {
    data: accountAppData,
    isLoading: isLoadingApps,
    refetch: refetchApps,
  } = useAccountApplications(start, end, filters);

  const {
    data: accountingData,
    isLoading: isLoadingAccounting,
    refetch: refetchAccounting,
  } = useOdooAccounting(start, end);

  const handleRefresh = () => {
    refetchApps();
    refetchAccounting();
  };

  const handlePeriodChange = (period: Period) => {
    setActivePeriod(period);
    setFilters((prev) => ({
      ...prev,
      dateRange: getDateRange(period),
    }));
  };

  const isLoading = isLoadingApps || isLoadingAccounting;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <DepartmentHeader
        title="Accounting & Finance"
        subtitle="Accounts receivable, payable, invoicing, and account applications"
        activePeriod={activePeriod}
        onPeriodChange={handlePeriodChange}
        onRefresh={handleRefresh}
        isLoading={isLoading}
      />

      <AdvancedFilterBar
        filters={filters}
        onFiltersChange={setFilters}
        showTeamFilter
        showPriorityFilter
        showStatusFilter
      />

      {/* Account Applications Section */}
      <KPISection
        title="Account Applications"
        description="Helpdesk tickets for new account setup and approvals"
      >
        <KPIGrid columns={4}>
          <KPICard
            title="Total Applications"
            value={accountAppData?.totalTickets ?? 0}
            status="neutral"
            source="odoo"
            icon={FileText}
          />
          <KPICard
            title="Completed"
            value={accountAppData?.completedTickets ?? 0}
            status="positive"
            source="odoo"
            icon={CheckCircle}
          />
          <KPICard
            title="Avg Turnaround (hrs)"
            value={accountAppData?.metrics.overallAvgHours.toFixed(1) ?? "0.0"}
            status="neutral"
            source="odoo"
            icon={Clock}
          />
          <KPICard
            title="DIFOT %"
            value={`${accountAppData?.metrics.qualityMetrics.difot.toFixed(1) ?? "0.0"}%`}
            status={
              (accountAppData?.metrics.qualityMetrics.difot ?? 0) >= 90
                ? "positive"
                : (accountAppData?.metrics.qualityMetrics.difot ?? 0) >= 75
                ? "warning"
                : "negative"
            }
            source="odoo"
            icon={Target}
          />
        </KPIGrid>
      </KPISection>

      {/* Stage Cycle Time Analysis */}
      {accountAppData?.metrics.stageMetrics && 
        Object.keys(accountAppData.metrics.stageMetrics).length > 0 && (
        <KPISection
          title="Application Processing Stages"
          description="Average time spent in each stage (working hours)"
        >
          <KPIGrid columns={4}>
            {Object.entries(accountAppData.metrics.stageMetrics).map(([stageName, metrics]) => {
              const stageIcons: Record<string, any> = {
                New: FileText,
                "In Progress": Clock,
                Review: CheckCircle,
                Approved: CheckCircle,
                Rejected: XCircle,
                Complete: CheckCircle,
              };
              const icon = stageIcons[stageName] || AlertCircle;

              return (
                <KPICard
                  key={stageName}
                  title={stageName}
                  value={`${metrics.avgHours.toFixed(1)} hrs`}
                  status="neutral"
                  source="odoo"
                  icon={icon}
                  subtitle={`${metrics.count} tickets`}
                />
              );
            })}
          </KPIGrid>
        </KPISection>
      )}

      {/* Invoicing Section */}
      <KPISection
        title="Invoicing"
        description="Invoice metrics and revenue tracking"
      >
        <KPIGrid columns={4}>
          <KPICard
            title="Total Invoices"
            value={accountingData?.invoicing.totalInvoices ?? 0}
            status="neutral"
            source="odoo"
            icon={FileText}
          />
          <KPICard
            title="Total Revenue"
            value={`$${((accountingData?.invoicing.totalRevenue ?? 0) / 1000).toFixed(0)}k`}
            status="positive"
            source="odoo"
            icon={DollarSign}
          />
          <KPICard
            title="Paid Invoices"
            value={accountingData?.invoicing.paidInvoices ?? 0}
            status="positive"
            source="odoo"
            icon={CheckCircle}
          />
          <KPICard
            title="Outstanding"
            value={accountingData?.invoicing.outstandingInvoices ?? 0}
            status="warning"
            source="odoo"
            icon={Clock}
          />
        </KPIGrid>
      </KPISection>

      {/* Accounts Receivable / Payable Section */}
      <KPISection
        title="Accounts Receivable & Payable"
        description="AR/AP aging and payment metrics"
      >
        <KPIGrid columns={3}>
          <KPICard
            title="AR Days"
            value={accountingData?.arDays.toFixed(0) ?? "0"}
            status={
              (accountingData?.arDays ?? 0) <= 30
                ? "positive"
                : (accountingData?.arDays ?? 0) <= 45
                ? "warning"
                : "negative"
            }
            source="odoo"
            icon={TrendingDown}
            subtitle="Average days to collect"
          />
          <KPICard
            title="AP Days"
            value={accountingData?.apDays.toFixed(0) ?? "0"}
            status={
              (accountingData?.apDays ?? 0) <= 30
                ? "positive"
                : (accountingData?.apDays ?? 0) <= 45
                ? "warning"
                : "negative"
            }
            source="odoo"
            icon={TrendingUp}
            subtitle="Average days to pay"
          />
          <KPICard
            title="Cash Conversion Cycle"
            value={`${((accountingData?.arDays ?? 0) - (accountingData?.apDays ?? 0)).toFixed(0)} days`}
            status={
              ((accountingData?.arDays ?? 0) - (accountingData?.apDays ?? 0)) <= 15
                ? "positive"
                : ((accountingData?.arDays ?? 0) - (accountingData?.apDays ?? 0)) <= 30
                ? "warning"
                : "negative"
            }
            source="odoo"
            icon={ArrowRightLeft}
            subtitle="AR Days - AP Days"
          />
        </KPIGrid>
      </KPISection>

      {/* Quality Metrics */}
      <KPISection
        title="Application Quality Metrics"
        description="Quality and compliance metrics for account applications"
      >
        <KPIGrid columns={3}>
          <KPICard
            title="Revision Rate %"
            value={`${accountAppData?.metrics.qualityMetrics.revisionRate.toFixed(1) ?? "0.0"}%`}
            status={
              (accountAppData?.metrics.qualityMetrics.revisionRate ?? 0) <= 10
                ? "positive"
                : (accountAppData?.metrics.qualityMetrics.revisionRate ?? 0) <= 20
                ? "warning"
                : "negative"
            }
            source="odoo"
            icon={AlertCircle}
            trendInverse
          />
          <KPICard
            title="First-Time Pass Rate %"
            value={`${accountAppData?.metrics.qualityMetrics.firstTimePassRate.toFixed(1) ?? "0.0"}%`}
            status={
              (accountAppData?.metrics.qualityMetrics.firstTimePassRate ?? 0) >= 90
                ? "positive"
                : (accountAppData?.metrics.qualityMetrics.firstTimePassRate ?? 0) >= 75
                ? "warning"
                : "negative"
            }
            source="odoo"
            icon={CheckCircle}
          />
          <KPICard
            title="Median Turnaround (hrs)"
            value={accountAppData?.metrics.overallMedianHours.toFixed(1) ?? "0.0"}
            status="neutral"
            source="odoo"
            icon={Calendar}
          />
        </KPIGrid>
      </KPISection>
    </div>
  );
}

