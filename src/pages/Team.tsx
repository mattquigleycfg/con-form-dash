import { DashboardLayout } from "@/components/DashboardLayout";
import { PerformanceTable } from "@/components/PerformanceTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Team() {
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Team Performance</h1>
        <p className="mt-1 text-muted-foreground">
          Track individual and team metrics
        </p>
      </div>

      <div className="space-y-6">
        <PerformanceTable />

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>This month's leaders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Sarah Johnson", metric: "$145K", label: "Revenue" },
                  { name: "Michael Chen", metric: "24", label: "Deals Closed" },
                  { name: "Emily Rodriguez", metric: "94%", label: "Win Rate" }
                ].map((performer) => (
                  <div
                    key={performer.name}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                  >
                    <div>
                      <p className="font-medium text-sm">{performer.name}</p>
                      <p className="text-xs text-muted-foreground">{performer.label}</p>
                    </div>
                    <p className="text-lg font-bold text-primary">{performer.metric}</p>
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
                {[
                  { action: "Closed major deal", person: "Sarah J.", time: "2 hours ago" },
                  { action: "New customer onboarded", person: "Michael C.", time: "5 hours ago" },
                  { action: "Exceeded monthly target", person: "Emily R.", time: "1 day ago" }
                ].map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {activity.person.split(' ')[0][0]}{activity.person.split(' ')[1][0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.person} • {activity.time}
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
