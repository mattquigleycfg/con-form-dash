import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Calendar, DollarSign } from "lucide-react";
import { useOdooSync } from "@/hooks/useOdooSync";
import { useTargetsContext } from "@/hooks/useTargetsContext";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function TargetProgress() {
  const { syncOdooData, metrics, isLoading: metricsLoading } = useOdooSync();
  const { currentMonthTeamTarget, isLoading: isTargetsLoading } = useTargetsContext();

  useEffect(() => {
    syncOdooData();
  }, []);

  const isLoading = metricsLoading || isTargetsLoading;
  
  const targets = [
    {
      id: 1,
      name: "CFG Monthly Sales Target",
      current: metrics?.totalRevenue || 0,
      target: currentMonthTeamTarget || 0,
      period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      icon: DollarSign,
    },
    {
      id: 2,
      name: "Monthly Deals",
      current: metrics?.dealsClosed || 0,
      target: 180,
      period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      icon: Target,
    },
    {
      id: 3,
      name: "New Customers",
      current: metrics?.activeCustomers || 0,
      target: 50,
      period: "This Month",
      icon: Calendar,
    },
  ];

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Active Targets</CardTitle>
          <p className="text-sm text-muted-foreground">Progress towards goals</p>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Active Targets</CardTitle>
        <p className="text-sm text-muted-foreground">Progress towards goals</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {targets.map((target) => {
          const percentage = Math.round((target.current / target.target) * 100);
          const Icon = target.icon;

          return (
            <div key={target.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{target.name}</h4>
                    <p className="text-sm text-muted-foreground">{target.period}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground">{percentage}%</div>
                  <p className="text-xs text-muted-foreground">complete</p>
                </div>
              </div>

              <Progress value={percentage} className="h-2" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {typeof target.current === "number" && target.current > 1000
                    ? `$${target.current.toLocaleString()}`
                    : target.current}
                </span>
                <span className="font-medium text-foreground">
                  {typeof target.target === "number" && target.target > 1000
                    ? `$${target.target.toLocaleString()}`
                    : target.target}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
