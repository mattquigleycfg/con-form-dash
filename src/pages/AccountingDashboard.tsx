import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricsCard } from "@/components/MetricsCard";
import { InvoicedChart } from "@/components/InvoicedChart";
import { TopInvoicesTable } from "@/components/TopInvoicesTable";
import { AICopilot } from "@/components/AICopilot";
import { useOdooAccounting } from "@/hooks/useOdooAccounting";
import { useOdooInvoicing } from "@/hooks/useOdooInvoicing";
import { useOdooPurchase } from "@/hooks/useOdooPurchase";
import { FilterBar } from "@/components/filters/FilterBar";
import { DollarSign, TrendingDown, TrendingUp, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function Accounting() {
  const { metrics, invoiceData, topInvoices, isLoading } = useOdooAccounting();
  const { data: invoices, isLoading: isInvoicesLoading } = useOdooInvoicing();
  const { data: purchaseOrders, isLoading: isPurchaseLoading } = useOdooPurchase();

  const formatMetricCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  const getInvoiceStateBadge = (state: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      draft: "outline",
      posted: "default",
    };
    return <Badge variant={variants[state] || "default"}>{state}</Badge>;
  };

  const getPurchaseStateBadge = (state: string) => {
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
          <h1 className="text-3xl font-bold tracking-tight">Accounting Overview</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive financial management and tracking
          </p>
        </div>

        <FilterBar />

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricsCard
              title="Current income"
              value={formatMetricCurrency(metrics.currentIncome)}
              change={parseFloat(metrics.currentIncomeChange.toFixed(1))}
              icon={DollarSign}
              trend={metrics.currentIncomeChange >= 0 ? "up" : "down"}
              footer={<p className="text-xs text-muted-foreground">last period</p>}
            />
            <MetricsCard
              title="Receivables"
              value={formatMetricCurrency(metrics.receivables)}
              icon={TrendingUp}
              footer={<p className="text-xs text-muted-foreground">to receive</p>}
            />
            <MetricsCard
              title="Current expense"
              value={formatMetricCurrency(metrics.currentExpense)}
              change={parseFloat(metrics.currentExpenseChange.toFixed(1))}
              icon={TrendingDown}
              trend={metrics.currentExpenseChange >= 0 ? "up" : "down"}
              footer={<p className="text-xs text-muted-foreground">last period</p>}
            />
            <MetricsCard
              title="Payables"
              value={formatMetricCurrency(metrics.payables)}
              icon={CreditCard}
              footer={<p className="text-xs text-muted-foreground">to pay</p>}
            />
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">Customer Invoices</TabsTrigger>
            <TabsTrigger value="purchases">Purchase Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6">
              {isLoading ? (
                <Skeleton className="h-96" />
              ) : (
                <InvoicedChart data={invoiceData} />
              )}
              
              {isLoading ? (
                <Skeleton className="h-96" />
              ) : (
                <TopInvoicesTable invoices={topInvoices} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <CardTitle>Customer Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                {isInvoicesLoading ? (
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
                          <TableCell>{getInvoiceStateBadge(invoice.state)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {isPurchaseLoading ? (
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
                          <TableCell>{getPurchaseStateBadge(order.state)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AICopilot />
      </div>
    </DashboardLayout>
  );
}
