import { useMemo } from "react";
import { useHelpdeskKPIs, type TeamKPIMetrics } from "./useHelpdeskKPIs";
import { useManualKPIs, useKPITargets, type KPIEntry, type KPITarget } from "./useManualKPIs";
import { getKPIStatus, type ThresholdConfig } from "@/utils/kpiThresholds";
import { getDateRange, type DatePeriod } from "@/utils/dateHelpers";
import type { Department } from "@/utils/helpdeskTeamMapping";
import type { KPIStatus } from "@/components/kpi/StatusChip";

export interface KPIMetric {
  key: string;
  label: string;
  value: number;
  previousValue?: number;
  target?: number;
  status: KPIStatus;
  source: "odoo" | "manual" | "calculated";
  trend?: "up" | "down" | "stable";
  trendInverse?: boolean;
  lastUpdated?: string;
}

export interface DepartmentKPIData {
  department: Department;
  metrics: KPIMetric[];
  status: KPIStatus; // Overall status (worst of all metrics)
  helpdeskTeams?: TeamKPIMetrics[];
  isLoading: boolean;
  error: Error | null;
}

interface UseKPIDataOptions {
  department: Department;
  period?: DatePeriod;
}

export function useKPIData({ department, period = "month" }: UseKPIDataOptions): DepartmentKPIData {
  const {
    data: helpdeskData,
    isLoading: helpdeskLoading,
    error: helpdeskError,
  } = useHelpdeskKPIs(period);

  const { start, end } = getDateRange(period);
  const {
    entries: manualEntries,
    isLoading: manualLoading,
    error: manualError,
  } = useManualKPIs(department, start, end);

  const { data: targets = [] } = useKPITargets(department);

  const data = useMemo((): DepartmentKPIData => {
    const metrics: KPIMetric[] = [];
    const departmentTeams = helpdeskData?.byDepartment[department] ?? [];

    // Get target for a metric
    const getTarget = (metricKey: string): KPITarget | undefined =>
      targets.find((t) => t.metric_key === metricKey);

    // Get manual entry for a metric
    const getManualEntry = (metricKey: string): KPIEntry | undefined =>
      manualEntries.find((e) => e.metric_key === metricKey);

    // Helper to add a metric (manual overrides Odoo)
    const addMetric = (
      key: string,
      label: string,
      odooValue: number | null,
      options: {
        trendInverse?: boolean;
        customThreshold?: ThresholdConfig;
      } = {}
    ) => {
      const manualEntry = getManualEntry(key);
      const target = getTarget(key);

      // Manual entry takes priority
      const value = manualEntry?.value ?? odooValue ?? 0;
      const source: "odoo" | "manual" | "calculated" = manualEntry
        ? "manual"
        : odooValue !== null
        ? "odoo"
        : "calculated";

      // Get status from thresholds
      const status = getKPIStatus(
        key,
        value,
        options.customThreshold ?? {
          green: target?.green_threshold ? { min: target.green_threshold } : undefined,
          amber: target?.amber_threshold ? { min: target.amber_threshold } : undefined,
          higherIsBetter: target?.comparison_type !== "lower_better",
        }
      );

      metrics.push({
        key,
        label,
        value,
        target: manualEntry?.target ?? target?.target_value,
        status,
        source,
        trendInverse: options.trendInverse,
        lastUpdated: manualEntry?.updated_at,
      });
    };

    // Build metrics based on department
    switch (department) {
      case "production":
        // Aggregate helpdesk metrics for production teams
        const packoutTeam = departmentTeams.find((t) => t.teamName.includes("Pack out"));
        const kitTeam = departmentTeams.find((t) => t.teamName.includes("Kit Orders"));
        const spanTeam = departmentTeams.find((t) => t.teamName.includes("Span+"));

        if (packoutTeam) {
          addMetric("packouts_open", "Packouts Open", packoutTeam.open, { trendInverse: true });
          addMetric("packouts_urgent", "Packouts Urgent", packoutTeam.urgent, { trendInverse: true });
          addMetric("packouts_unassigned", "Packouts Unassigned", packoutTeam.unassigned, { trendInverse: true });
          addMetric("packouts_closed_week", "Packouts Closed (Week)", packoutTeam.closedWeek);
          addMetric("packouts_closed_mtd", "Packouts Closed (MTD)", packoutTeam.closedMTD);
          addMetric("packouts_closed_ytd", "Packouts Closed (YTD)", packoutTeam.closedYTD);
        }

        if (kitTeam) {
          addMetric("kit_orders_open", "Kit Orders Open", kitTeam.open, { trendInverse: true });
          addMetric("kit_orders_urgent", "Kit Orders Urgent", kitTeam.urgent, { trendInverse: true });
          addMetric("kit_orders_unassigned", "Kit Orders Unassigned", kitTeam.unassigned, { trendInverse: true });
        }

        if (spanTeam) {
          addMetric("span_open", "Span+ Open", spanTeam.open, { trendInverse: true });
          addMetric("span_urgent", "Span+ Urgent", spanTeam.urgent, { trendInverse: true });
        }

        // Manual-only metrics
        addMetric("packout_difot", "Packout DIFOT %", null);
        addMetric("metres_rolled_week", "Metres Rolled (Week)", null);
        addMetric("safety_incidents_ytd", "Safety Incidents YTD", null);
        break;

      case "engineering":
        const cfgTeam = departmentTeams.find((t) => t.teamName.includes("CFG"));
        const dsfTeam = departmentTeams.find((t) => t.teamName.includes("DSF"));

        if (cfgTeam) {
          addMetric("cfg_quotes_open", "CFG Quotes Open", cfgTeam.open, { trendInverse: true });
          addMetric("cfg_quotes_closed_week", "CFG Quotes Closed (Week)", cfgTeam.closedWeek);
          addMetric("cfg_quotes_closed_mtd", "CFG Quotes Closed (MTD)", cfgTeam.closedMTD);
          addMetric("cfg_quotes_closed_ytd", "CFG Quotes Closed (YTD)", cfgTeam.closedYTD);
          addMetric("cfg_quotes_overdue", "CFG Quotes Overdue", cfgTeam.overdue, { trendInverse: true });
          addMetric("cfg_quote_success_rate", "CFG Success Rate %", cfgTeam.successRate);
        }

        if (dsfTeam) {
          addMetric("dsf_quotes_open", "DSF Quotes Open", dsfTeam.open, { trendInverse: true });
          addMetric("dsf_quotes_urgent", "DSF Quotes Urgent", dsfTeam.urgent, { trendInverse: true });
          addMetric("dsf_quotes_closed_mtd", "DSF Quotes Closed (MTD)", dsfTeam.closedMTD);
        }

        addMetric("quote_difot", "Quote DIFOT %", null);
        addMetric("bom_pipeline_open", "BOM Pipeline Open", null);
        addMetric("bom_difot", "BOM DIFOT %", null);
        break;

      case "design":
        const shopDrawingTeam = departmentTeams.find((t) => t.teamName.includes("Shop Drawings"));

        if (shopDrawingTeam) {
          addMetric("shop_drawings_open", "Shop Drawings Open", shopDrawingTeam.open, { trendInverse: true });
          addMetric("shop_drawings_closed_week", "Closed (Week)", shopDrawingTeam.closedWeek);
          addMetric("shop_drawings_closed_mtd", "Closed (MTD)", shopDrawingTeam.closedMTD);
          addMetric("shop_drawings_closed_ytd", "Closed (YTD)", shopDrawingTeam.closedYTD);
          addMetric("shop_drawings_overdue", "Overdue", shopDrawingTeam.overdue, { trendInverse: true });
        }

        addMetric("shop_drawing_difot", "Shop Drawing DIFOT %", null);
        break;

      case "finance":
        const invoicingTeam = departmentTeams.find((t) => t.teamName.includes("Invoicing"));
        const accountAppTeam = departmentTeams.find((t) => t.teamName.includes("Account applications"));

        if (invoicingTeam) {
          addMetric("invoices_open", "Invoices Open", invoicingTeam.open, { trendInverse: true });
          addMetric("invoices_closed_ytd", "Invoices Closed YTD", invoicingTeam.closedYTD);
        }

        if (accountAppTeam) {
          addMetric("account_apps_open", "Account Applications Open", accountAppTeam.open, { trendInverse: true });
          addMetric("account_apps_urgent", "Account Applications Urgent", accountAppTeam.urgent, { trendInverse: true });
        }

        // Manual/calculated metrics
        addMetric("ar_days", "AR Days", null);
        addMetric("ap_days", "AP Days", null);
        addMetric("revenue_cfg_mtd", "CFG Revenue (MTD)", null);
        addMetric("revenue_dsf_mtd", "DSF Revenue (MTD)", null);
        addMetric("actual_gp_ytd", "Actual GP % YTD", null);
        break;

      case "construction":
        const contractsTeam = departmentTeams.find((t) => t.teamName.includes("Contracts"));

        if (contractsTeam) {
          addMetric("contracts_open", "Contracts Open", contractsTeam.open, { trendInverse: true });
          addMetric("contracts_unassigned", "Contracts Unassigned", contractsTeam.unassigned, { trendInverse: true });
          addMetric("contracts_overdue", "Contracts Overdue", contractsTeam.overdue, { trendInverse: true });
        }

        // Manual metrics
        addMetric("live_projects_nsw", "Live Projects NSW", null);
        addMetric("live_projects_vic", "Live Projects VIC", null);
        addMetric("live_projects_qld", "Live Projects QLD", null);
        addMetric("live_projects_value", "Live Projects $ Value", null);
        addMetric("project_difot", "Project DIFOT %", null);
        addMetric("closed_within_budget", "Closed Within Budget", null);
        addMetric("closed_over_budget", "Closed Over Budget", null);
        break;

      case "sales":
        // Sales metrics are primarily from sale.order and crm.lead, handled separately
        addMetric("revenue_mtd", "Revenue (MTD)", null);
        addMetric("revenue_vs_target", "Revenue vs Target %", null);
        addMetric("revenue_ytd", "Revenue (YTD)", null);
        addMetric("conversion_rate", "Conversion Rate %", null);
        addMetric("gross_profit_percent", "Gross Profit %", null);
        addMetric("pipeline_value", "Pipeline Value", null);
        addMetric("quotes_this_week", "Quotes This Week", null);
        addMetric("avg_deal_size", "Avg Deal Size", null);
        addMetric("sales_cycle_days", "Sales Cycle Days", null);
        break;

      case "marketing":
        // Mostly manual metrics
        addMetric("nps_score", "NPS Score", null);
        addMetric("linkedin_followers", "LinkedIn Followers", null);
        addMetric("facebook_followers", "Facebook Followers", null);
        addMetric("instagram_followers", "Instagram Followers", null);
        addMetric("website_sessions_week", "Website Sessions (Week)", null);
        addMetric("leads_this_week", "Leads This Week", null);
        addMetric("leads_this_month", "Leads This Month", null);
        addMetric("total_pipeline_value", "Total Pipeline Value", null);
        addMetric("cost_per_lead", "Cost Per Lead", null);
        break;

      case "hr":
        // All manual metrics
        addMetric("employee_attrition_rate", "Attrition Rate %", null);
        addMetric("employee_enps", "Employee NPS", null);
        addMetric("absenteeism_rate", "Absenteeism Rate %", null);
        addMetric("days_since_injury", "Days Since Last Injury", null);
        break;
    }

    // Calculate overall status (worst of all metrics)
    const statuses = metrics.map((m) => m.status);
    let overallStatus: KPIStatus = "green";
    if (statuses.includes("red")) overallStatus = "red";
    else if (statuses.includes("amber")) overallStatus = "amber";
    else if (statuses.includes("neutral")) overallStatus = "neutral";

    return {
      department,
      metrics,
      status: overallStatus,
      helpdeskTeams: departmentTeams,
      isLoading: helpdeskLoading || manualLoading,
      error: (helpdeskError || manualError) as Error | null,
    };
  }, [department, helpdeskData, manualEntries, targets, helpdeskLoading, manualLoading, helpdeskError, manualError]);

  return data;
}

// Hook to get overview data for all departments
export function useAllDepartmentsKPIData(period: DatePeriod = "month") {
  const departments: Department[] = [
    "sales",
    "marketing",
    "engineering",
    "construction",
    "production",
    "design",
    "finance",
    "hr",
  ];

  // This would ideally be optimized to fetch all data in one go
  // For now, we'll just return the department list and let each use its own hook
  return { departments, period };
}

