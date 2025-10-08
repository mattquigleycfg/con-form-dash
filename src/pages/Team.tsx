import { DashboardLayout } from "@/components/DashboardLayout";
import { PerformanceTable } from "@/components/PerformanceTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOdooTeam } from "@/hooks/useOdooTeam";

export default function Team() {
  const { salesReps, isLoading } = useOdooTeam();
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Team Performance</h1>
        <p className="mt-1 text-muted-foreground">
          Track individual and team metrics
        </p>
      </div>

      <div className="space-y-6">
        <PerformanceTable salesReps={salesReps} isLoading={isLoading} />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>This month's leaders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {salesReps.slice(0, 3).map((rep, idx) => (
                  <div
                    key={rep.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{rep.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {idx === 0 ? "Revenue" : idx === 1 ? "Deals Closed" : "Performance"}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {idx === 0 ? `$${Math.round(rep.revenue / 1000)}K` : idx === 1 ? rep.deals : `${Math.round((rep.revenue / rep.target) * 100)}%`}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
              <CardDescription>Recent achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {salesReps.slice(0, 3).map((rep, i) => (
                  <div
                    key={rep.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {rep.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {rep.deals} deals closed • ${Math.round(rep.revenue / 1000)}K revenue
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rep.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
