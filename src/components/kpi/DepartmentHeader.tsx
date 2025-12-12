import { ReactNode } from "react";
import { LucideIcon, RefreshCw, Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DatePeriod = "week" | "month" | "quarter" | "ytd" | "year";

interface DepartmentHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  period?: DatePeriod;
  onPeriodChange?: (period: DatePeriod) => void;
  showExport?: boolean;
  onExport?: () => void;
  children?: ReactNode;
  className?: string;
}

const periodLabels: Record<DatePeriod, string> = {
  week: "This Week",
  month: "This Month",
  quarter: "This Quarter",
  ytd: "Year to Date",
  year: "This Year",
};

export function DepartmentHeader({
  title,
  description,
  icon: Icon,
  onRefresh,
  isRefreshing = false,
  period,
  onPeriodChange,
  showExport = false,
  onExport,
  children,
  className,
}: DepartmentHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {period !== undefined && onPeriodChange && (
            <Select value={period} onValueChange={(v) => onPeriodChange(v as DatePeriod)}>
              <SelectTrigger className="w-[140px] h-9">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(periodLabels) as DatePeriod[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {periodLabels[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {showExport && onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          )}

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-1.5", isRefreshing && "animate-spin")}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}

