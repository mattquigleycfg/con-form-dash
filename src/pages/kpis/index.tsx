import { useState } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Megaphone,
  Compass,
  HardHat,
  Factory,
  Palette,
  Wallet,
  UserCog,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusChip, StatusDot, type KPIStatus } from "@/components/kpi/StatusChip";
import { useKPIData } from "@/hooks/useKPIData";
import { useHelpdeskKPIs } from "@/hooks/useHelpdeskKPIs";
import type { Department } from "@/utils/helpdeskTeamMapping";
import type { DatePeriod } from "@/utils/dateHelpers";
import { cn } from "@/lib/utils";

interface DepartmentSummary {
  key: Department;
  name: string;
  description: string;
  icon: typeof TrendingUp;
  href: string;
  primaryMetrics: string[];
}

const DEPARTMENTS: DepartmentSummary[] = [
  {
    key: "sales",
    name: "Sales",
    description: "Revenue, conversion, and pipeline metrics",
    icon: TrendingUp,
    href: "/kpis/sales",
    primaryMetrics: ["revenue_mtd", "conversion_rate", "pipeline_value"],
  },
  {
    key: "marketing",
    name: "Marketing",
    description: "Lead generation and brand awareness",
    icon: Megaphone,
    href: "/kpis/marketing",
    primaryMetrics: ["leads_this_month", "nps_score", "website_sessions_week"],
  },
  {
    key: "engineering",
    name: "Engineering",
    description: "Quoting and estimation metrics",
    icon: Compass,
    href: "/kpis/engineering",
    primaryMetrics: ["cfg_quotes_open", "dsf_quotes_open", "quote_difot"],
  },
  {
    key: "construction",
    name: "Construction",
    description: "Project delivery and contracts",
    icon: HardHat,
    href: "/kpis/construction",
    primaryMetrics: ["contracts_open", "live_projects_value", "project_difot"],
  },
  {
    key: "production",
    name: "Production",
    description: "Manufacturing and fulfillment",
    icon: Factory,
    href: "/kpis/production",
    primaryMetrics: ["packouts_open", "kit_orders_open", "packout_difot"],
  },
  {
    key: "design",
    name: "Design",
    description: "Shop drawing metrics",
    icon: Palette,
    href: "/kpis/design",
    primaryMetrics: ["shop_drawings_open", "shop_drawing_difot", "shop_drawings_closed_mtd"],
  },
  {
    key: "finance",
    name: "Finance",
    description: "Invoicing and accounting",
    icon: Wallet,
    href: "/kpis/finance",
    primaryMetrics: ["invoices_open", "ar_days", "actual_gp_ytd"],
  },
  {
    key: "hr",
    name: "HR",
    description: "Employee and safety metrics",
    icon: UserCog,
    href: "/kpis/hr",
    primaryMetrics: ["employee_attrition_rate", "days_since_injury", "absenteeism_rate"],
  },
];

function DepartmentCard({ department, period }: { department: DepartmentSummary; period: DatePeriod }) {
  const { metrics, status, isLoading } = useKPIData({
    department: department.key,
    period,
  });

  // Get the primary metrics for display
  const displayMetrics = department.primaryMetrics
    .map((key) => metrics.find((m) => m.key === key))
    .filter(Boolean)
    .slice(0, 3);

  const Icon = department.icon;

  return (
    <Link to={department.href}>
      <Card className="h-full transition-all hover:shadow-hover hover:border-primary/20 cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                  status === "green" && "bg-emerald-500/10 group-hover:bg-emerald-500/20",
                  status === "amber" && "bg-amber-500/10 group-hover:bg-amber-500/20",
                  status === "red" && "bg-red-500/10 group-hover:bg-red-500/20",
                  status === "neutral" && "bg-primary/10 group-hover:bg-primary/20"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    status === "green" && "text-emerald-600 dark:text-emerald-400",
                    status === "amber" && "text-amber-600 dark:text-amber-400",
                    status === "red" && "text-red-600 dark:text-red-400",
                    status === "neutral" && "text-primary"
                  )}
                />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">{department.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{department.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusDot status={status} />
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-5 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {displayMetrics.map((metric) => (
                <div key={metric!.key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{metric!.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">
                      {typeof metric!.value === "number"
                        ? metric!.value.toLocaleString()
                        : metric!.value || "-"}
                    </span>
                    <StatusDot status={metric!.status} className="h-1.5 w-1.5" />
                  </div>
                </div>
              ))}
              {displayMetrics.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No metrics configured</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function HelpdeskSummary({ period }: { period: DatePeriod }) {
  const { data, isLoading } = useHelpdeskKPIs(period);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="h-24 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Helpdesk Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{data.totals.open.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.totals.urgent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Urgent</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.totals.unassigned.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Unassigned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{data.totals.overdue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.totals.closed.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Closed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KPIOverview() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const { refetch, isLoading: isRefreshing } = useHelpdeskKPIs(period);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">KPI Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Department performance at a glance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as DatePeriod)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="ytd">Year to Date</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1.5", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Helpdesk Summary */}
        <HelpdeskSummary period={period} />

        {/* Department Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {DEPARTMENTS.map((dept) => (
            <DepartmentCard key={dept.key} department={dept} period={period} />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <StatusDot status="green" />
            <span>On Target</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusDot status="amber" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusDot status="red" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusDot status="neutral" />
            <span>No Data</span>
          </div>
        </div>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
