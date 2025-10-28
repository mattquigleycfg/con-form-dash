import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SalesOrder } from "@/hooks/useOdooSalesOrders";
import { format } from "date-fns";
import { CheckCircle2, Package } from "lucide-react";

interface SalesOrdersTableProps {
  orders: SalesOrder[];
  isLoading: boolean;
}

export function SalesOrdersTable({ orders, isLoading }: SalesOrdersTableProps) {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return dateString;
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'sale':
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Confirmed</Badge>;
      case 'done':
        return <Badge variant="secondary" className="gap-1"><Package className="h-3 w-3" />Done</Badge>;
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Confirmed Sales Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading sales orders...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirmed Sales Orders ({orders.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No confirmed sales orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">Order #</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Sales Rep</TableHead>
                  <TableHead className="font-semibold">Order Date</TableHead>
                  <TableHead className="font-semibold">Original Confirmation</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{order.name}</TableCell>
                    <TableCell>
                      {Array.isArray(order.partner_id) ? order.partner_id[1] : 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {order.user_id && Array.isArray(order.user_id) ? order.user_id[1] : 'Unassigned'}
                    </TableCell>
                    <TableCell>{formatDate(order.date_order)}</TableCell>
                    <TableCell>
                      {order.x_original_confirmation_date ? (
                        <span className="text-primary font-medium">
                          {formatDate(order.x_original_confirmation_date)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          {formatDate(order.date_order)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(order.amount_total)}
                    </TableCell>
                    <TableCell>{getStateBadge(order.state)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
