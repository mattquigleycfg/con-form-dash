import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "@/components/filters/FilterBar";

export default function Invoicing() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Invoicing</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track your invoices
          </p>
        </div>

        <FilterBar />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Invoice management functionality will be integrated with Odoo accounting module.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
