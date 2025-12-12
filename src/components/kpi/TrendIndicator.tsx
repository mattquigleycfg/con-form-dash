import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrendDirection = "up" | "down" | "stable";

interface TrendIndicatorProps {
  direction: TrendDirection;
  value?: number;
  suffix?: string;
  inverse?: boolean; // For metrics where "down" is good (e.g., open tickets)
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TrendIndicator({
  direction,
  value,
  suffix = "%",
  inverse = false,
  showValue = true,
  size = "md",
  className,
}: TrendIndicatorProps) {
  // Determine if the trend is positive (good) or negative (bad)
  const isPositive = inverse ? direction === "down" : direction === "up";
  const isNegative = inverse ? direction === "up" : direction === "down";

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const Icon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium",
        isPositive && "text-emerald-600 dark:text-emerald-400",
        isNegative && "text-red-600 dark:text-red-400",
        direction === "stable" && "text-muted-foreground",
        textSizes[size],
        className
      )}
    >
      <Icon className={iconSizes[size]} />
      {showValue && value !== undefined && (
        <span>
          {direction === "up" && "+"}
          {value.toFixed(1)}
          {suffix}
        </span>
      )}
    </span>
  );
}

export function calculateTrend(
  current: number,
  previous: number | undefined
): { direction: TrendDirection; percentChange: number } {
  if (previous === undefined || previous === 0) {
    return { direction: "stable", percentChange: 0 };
  }

  const percentChange = ((current - previous) / previous) * 100;

  if (Math.abs(percentChange) < 0.5) {
    return { direction: "stable", percentChange };
  }

  return {
    direction: percentChange > 0 ? "up" : "down",
    percentChange: Math.abs(percentChange),
  };
}

