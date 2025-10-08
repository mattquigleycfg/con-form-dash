import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

const salesReps = [
  { id: 1, name: "Sarah Johnson", avatar: "SJ", deals: 28, revenue: 184000, target: 150000, trend: "up" },
  { id: 2, name: "Michael Chen", avatar: "MC", deals: 24, revenue: 156000, target: 140000, trend: "up" },
  { id: 3, name: "Emily Davis", avatar: "ED", deals: 22, revenue: 148000, target: 150000, trend: "down" },
  { id: 4, name: "David Wilson", avatar: "DW", deals: 19, revenue: 132000, target: 130000, trend: "up" },
  { id: 5, name: "Lisa Anderson", avatar: "LA", deals: 17, revenue: 128000, target: 140000, trend: "down" },
];

export function PerformanceTable() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Team Performance</CardTitle>
        <p className="text-sm text-muted-foreground">Top performers this month</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {salesReps.map((rep, index) => {
            const performance = ((rep.revenue / rep.target) * 100).toFixed(0);
            const isAboveTarget = rep.revenue >= rep.target;

            return (
              <div
                key={rep.id}
                className="flex items-center gap-4 rounded-lg border border-border p-4 transition-all hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {rep.avatar}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground">{rep.name}</h4>
                    {index === 0 && (
                      <Badge className="bg-gradient-primary">🏆 Top Performer</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{rep.deals} deals</span>
                    <span>•</span>
                    <span>${rep.revenue.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg font-bold ${
                        isAboveTarget ? "text-accent" : "text-warning"
                      }`}
                    >
                      {performance}%
                    </span>
                    {rep.trend === "up" ? (
                      <TrendingUp className="h-5 w-5 text-accent" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">of target</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
