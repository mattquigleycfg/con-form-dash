import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "@/components/filters/FilterBar";

export default function HelpdeskDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Helpdesk Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage support tickets and customer inquiries
          </p>
        </div>

        <FilterBar />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Helpdesk Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Helpdesk functionality will be integrated with Odoo helpdesk module.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
