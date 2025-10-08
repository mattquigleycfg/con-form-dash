import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricsCardProps {
  title: string;
  value: string;
  change?: number;
  icon: LucideIcon;
  trend?: "up" | "down";
  className?: string;
  footer?: ReactNode;
}

export function MetricsCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
  className,
  footer,
}: MetricsCardProps) {
  const isPositive = trend === "up";

  return (
    <Card className={cn("shadow-card transition-shadow hover:shadow-hover", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-foreground">{value}</h3>
              {change !== undefined && (
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isPositive ? "text-accent" : "text-destructive"
                  )}
                >
                  {isPositive ? "+" : ""}
                  {change}%
                </span>
              )}
            </div>
            {footer && <div className="mt-3">{footer}</div>}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              isPositive ? "bg-accent/10" : change !== undefined ? "bg-destructive/10" : "bg-primary/10"
            )}
          >
            <Icon
              className={cn(
                "h-6 w-6",
                isPositive ? "text-accent" : change !== undefined ? "text-destructive" : "text-primary"
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
