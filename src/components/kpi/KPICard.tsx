import { ReactNode } from "react";
import { LucideIcon, Edit2, Database, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StatusChip, StatusDot, type KPIStatus } from "./StatusChip";
import { TrendIndicator, type TrendDirection, calculateTrend } from "./TrendIndicator";

export interface KPICardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  target?: number;
  status?: KPIStatus;
  source?: "odoo" | "manual";
  icon?: LucideIcon;
  footer?: ReactNode;
  trend?: TrendDirection;
  trendInverse?: boolean; // For metrics where lower is better
  suffix?: string;
  prefix?: string;
  onEdit?: () => void;
  onClick?: () => void;
  lastUpdated?: string;
  className?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  previousValue,
  target,
  status = "neutral",
  source,
  icon: Icon,
  footer,
  trend,
  trendInverse = false,
  suffix = "",
  prefix = "",
  onEdit,
  onClick,
  lastUpdated,
  className,
  loading = false,
}: KPICardProps) {
  // Calculate trend if previousValue is provided but trend is not
  const calculatedTrend = trend ?? (
    previousValue !== undefined && typeof value === "number"
      ? calculateTrend(value, previousValue).direction
      : undefined
  );
  
  const percentChange = previousValue !== undefined && typeof value === "number"
    ? calculateTrend(value, previousValue).percentChange
    : undefined;

  const displayValue = loading ? "..." : `${prefix}${value}${suffix}`;

  return (
    <Card
      className={cn(
        "relative overflow-hidden shadow-card transition-all hover:shadow-hover",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {/* Status indicator bar at top */}
      <div
        className={cn(
          "absolute left-0 top-0 h-1 w-full",
          status === "green" && "bg-emerald-500",
          status === "amber" && "bg-amber-500",
          status === "red" && "bg-red-500",
          status === "neutral" && "bg-muted-foreground/30"
        )}
      />

      <CardContent className="p-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header row with title and source badge */}
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
              {source && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-shrink-0">
                      {source === "odoo" ? (
                        <Database className="h-3 w-3 text-primary/60" />
                      ) : (
                        <User className="h-3 w-3 text-amber-500/60" />
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {source === "odoo" ? "Data from Odoo" : "Manual entry"}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className="text-2xl font-bold text-foreground tracking-tight">
                {displayValue}
              </h3>
              {calculatedTrend && percentChange !== undefined && (
                <TrendIndicator
                  direction={calculatedTrend}
                  value={percentChange}
                  inverse={trendInverse}
                  size="sm"
                />
              )}
            </div>

            {/* Target comparison */}
            {target !== undefined && typeof value === "number" && (
              <p className="mt-1 text-xs text-muted-foreground">
                Target: {prefix}{target.toLocaleString()}{suffix}
                <span className={cn(
                  "ml-1.5",
                  value >= target ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )}>
                  ({value >= target ? "+" : ""}{((value - target) / target * 100).toFixed(1)}%)
                </span>
              </p>
            )}

            {/* Footer */}
            {footer && <div className="mt-2">{footer}</div>}

            {/* Last updated */}
            {lastUpdated && (
              <p className="mt-2 text-xs text-muted-foreground/60">
                Updated {lastUpdated}
              </p>
            )}
          </div>

          {/* Right side: Icon and edit button */}
          <div className="flex flex-col items-end gap-2">
            {Icon && (
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  status === "green" && "bg-emerald-500/10",
                  status === "amber" && "bg-amber-500/10",
                  status === "red" && "bg-red-500/10",
                  status === "neutral" && "bg-primary/10"
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
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICardSkeleton() {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-muted rounded mb-3" />
          <div className="h-8 w-32 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

