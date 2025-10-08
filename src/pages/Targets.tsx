import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useOdooSync } from "@/hooks/useOdooSync";
import { useEffect } from "react";
import { Target, TrendingUp, Users, Award } from "lucide-react";

export default function Targets() {
  const { syncOdooData, metrics } = useOdooSync();

  useEffect(() => {
    syncOdooData();
  }, []);

  const defaultTargets = [
    {
      name: "Quarterly Revenue",
      current: metrics?.totalRevenue || 0,
      target: 500000,
      icon: TrendingUp,
      period: "Q1 2025"
    },
    {
      name: "Deals Closed",
      current: metrics?.dealsClosed || 0,
      target: 200,
      icon: Award,
      period: "This Quarter"
    },
    {
      name: "New Customers",
      current: metrics?.activeCustomers || 0,
      target: 1500,
      icon: Users,
      period: "This Quarter"
    }
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Sales Targets</h1>
        <p className="mt-1 text-muted-foreground">
          Track progress towards your goals
        </p>
      </div>

      <div className="space-y-6">
        {defaultTargets.map((target) => {
          const percentage = Math.min((target.current / target.target) * 100, 100);
          const IconComponent = target.icon;
          
          return (
            <Card key={target.name}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{target.name}</CardTitle>
                      <CardDescription>{target.period}</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      {percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {target.current.toLocaleString()} / {target.target.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={percentage} className="h-3" />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>Current: {target.current.toLocaleString()}</span>
                  <span>Target: {target.target.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
