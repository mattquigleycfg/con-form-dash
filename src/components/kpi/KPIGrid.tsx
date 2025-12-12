import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KPIGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
  className?: string;
}

const columnClasses = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "md:grid-cols-2 lg:grid-cols-4",
  5: "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

export function KPIGrid({ children, columns = 4, className }: KPIGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:gap-5",
        columnClasses[columns],
        className
      )}
    >
      {children}
    </div>
  );
}

interface KPISectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function KPISection({ title, description, children, action, className }: KPISectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

