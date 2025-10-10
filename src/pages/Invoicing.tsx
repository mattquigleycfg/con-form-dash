import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterBar } from "@/components/filters/FilterBar";
import { useOdooInvoicing } from "@/hooks/useOdooInvoicing";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function Invoicing() {
  const { data: invoices, isLoading } = useOdooInvoicing();

  const getStateBadge = (state: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "outline",
      posted: "default",
    };
    return <Badge variant={variants[state] || "default"}>{state}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Customer Invoices</h1>
          <p className="text-muted-foreground mt-2">
            Manage and track your customer invoices
          </p>
        </div>

        <FilterBar />

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
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
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices?.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.name}</TableCell>
                      <TableCell>{invoice.partner_id[1]}</TableCell>
                      <TableCell>
                        {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        {invoice.invoice_date_due ? new Date(invoice.invoice_date_due).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(invoice.amount_total)}</TableCell>
                      <TableCell>{formatCurrency(invoice.amount_residual)}</TableCell>
                      <TableCell>{getStateBadge(invoice.state)}</TableCell>
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
