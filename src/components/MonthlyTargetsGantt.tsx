import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyTarget } from "@/hooks/useMonthlyTargets";

interface MonthlyTargetsGanttProps {
  targets: MonthlyTarget[];
}

export function MonthlyTargetsGantt({ targets }: MonthlyTargetsGanttProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "$0K";
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const getPercentage = (actual: number | null, target: number) => {
    if (!actual || !target) return 0;
    return Math.min((actual / target) * 100, 100);
  };

  const maxTarget = Math.max(
    ...targets.map(t => Math.max(t.total_sales_target, t.total_invoice_target))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Targets Gantt View</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Sales Progress */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Sales Progress</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2">
              <div className="col-span-2">Month</div>
              <div className="col-span-8">Progress</div>
              <div className="col-span-2 text-right">Target</div>
            </div>
            {targets.map((target) => {
              const percentage = getPercentage(target.total_sales_actual, target.total_sales_target);
              const barWidth = (target.total_sales_target / maxTarget) * 100;
              
              return (
                <div key={target.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-sm font-medium">{target.month}</div>
                  <div className="col-span-8 relative h-10 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/20 to-primary/10 border-r-2 border-primary/30"
                      style={{ width: `${barWidth}%` }}
                    >
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
                      {formatCurrency(target.total_sales_actual)} / {formatCurrency(target.total_sales_target)}
                    </div>
                  </div>
                  <div className="col-span-2 text-right text-sm font-semibold text-primary">
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Invoice Progress */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Invoice Progress</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-2">
              <div className="col-span-2">Month</div>
              <div className="col-span-8">Progress</div>
              <div className="col-span-2 text-right">Target</div>
            </div>
            {targets.map((target) => {
              const percentage = getPercentage(target.total_invoice_actual, target.total_invoice_target);
              const barWidth = (target.total_invoice_target / maxTarget) * 100;
              
              return (
                <div key={target.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 text-sm font-medium">{target.month}</div>
                  <div className="col-span-8 relative h-10 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent/20 to-accent/10 border-r-2 border-accent/30"
                      style={{ width: `${barWidth}%` }}
                    >
                      <div 
                        className="h-full bg-gradient-to-r from-accent to-accent/80 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-foreground">
                      {formatCurrency(target.total_invoice_actual)} / {formatCurrency(target.total_invoice_target)}
                    </div>
                  </div>
                  <div className="col-span-2 text-right text-sm font-semibold text-accent">
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Division Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">Con-form Division (CFG)</h3>
            {targets.slice(0, 6).map((target) => {
              const salesPercentage = getPercentage(target.cfg_sales_actual, target.cfg_sales_target);
              
              return (
                <div key={target.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{target.month}</span>
                    <span className="font-semibold text-primary">{salesPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                      style={{ width: `${salesPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-semibold text-foreground">DiamondSteel Division (DSF)</h3>
            {targets.slice(0, 6).map((target) => {
              const salesPercentage = getPercentage(target.dsf_sales_actual, target.dsf_sales_target);
              
              return (
                <div key={target.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{target.month}</span>
                    <span className="font-semibold text-accent">{salesPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-500"
                      style={{ width: `${salesPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
