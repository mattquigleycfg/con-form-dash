import { cn } from "@/lib/utils";

export type KPIStatus = "green" | "amber" | "red" | "neutral";

interface StatusChipProps {
  status: KPIStatus;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<KPIStatus, { bg: string; text: string; dot: string; label: string }> = {
  green: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
    label: "On Target",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
    label: "Warning",
  },
  red: {
    bg: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
    label: "Critical",
  },
  neutral: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
    label: "No Data",
  },
};

export function StatusChip({ status, label, size = "md", className }: StatusChipProps) {
  const config = statusConfig[status];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.bg,
        config.text,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span className={cn("rounded-full", config.dot, size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2")} />
      {displayLabel}
    </span>
  );
}

export function StatusDot({ status, className }: { status: KPIStatus; className?: string }) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background",
        config.dot,
        className
      )}
    />
  );
}

