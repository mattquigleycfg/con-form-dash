import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "@/components/filters/FilterBar";
import { useOdooPurchase } from "@/hooks/useOdooPurchase";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function Purchase() {
  const { data: purchaseOrders, isLoading } = useOdooPurchase();

  const getStateBadge = (state: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "outline",
      sent: "secondary",
      "to approve": "secondary",
      purchase: "default",
    };
    return <Badge variant={variants[state] || "default"}>{state}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground mt-2">
            Manage purchase orders and vendor relationships
          </p>
        </div>

        <FilterBar />

        <Card>
          <CardHeader>
            <CardTitle>Active Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders?.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.name}</TableCell>
                      <TableCell>{order.partner_id[1]}</TableCell>
                      <TableCell>{new Date(order.date_order).toLocaleDateString()}</TableCell>
                      <TableCell>{formatCurrency(order.amount_total)}</TableCell>
                      <TableCell>{getStateBadge(order.state)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
