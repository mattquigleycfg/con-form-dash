import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AnalyticLine } from "@/hooks/useOdooAnalyticLines";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface AnalyticLinesMaterialTableProps {
  materialLines: AnalyticLine[];
}

export function AnalyticLinesMaterialTable({ materialLines }: AnalyticLinesMaterialTableProps) {
  const totalAmount = materialLines.reduce((sum, line) => sum + Math.abs(line.amount), 0);

  if (materialLines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actual Costs (Actuals & POs)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No material costs from analytic lines yet. Costs will appear here once posted in Odoo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actual Costs (Actuals & POs)</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {materialLines.length} material {materialLines.length === 1 ? 'entry' : 'entries'} from analytic accounts
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materialLines.map((line) => {
              const productName = line.product_id ? line.product_id[1] : '';
              return (
                <TableRow key={line.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{line.name}</div>
                      {productName && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {productName}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-2 text-xs">Odoo</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {line.date ? format(new Date(line.date), 'MMM dd, yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {line.unit_amount ? line.unit_amount.toFixed(2) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Math.abs(line.amount))}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell colSpan={3}>Total Material Costs from Analytic</TableCell>
              <TableCell className="text-right">
                {formatCurrency(totalAmount)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

