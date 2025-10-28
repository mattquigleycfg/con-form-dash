import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { AnalyticLine } from "@/hooks/useOdooAnalyticLines";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface AnalyticLinesTableProps {
  analyticLines: AnalyticLine[];
}

export function AnalyticLinesTable({ analyticLines }: AnalyticLinesTableProps) {
  if (analyticLines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Actual Cost Details (Analytic Lines)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No analytic lines found. Costs will appear here once posted to the analytic account in Odoo.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible>
        <CardHeader>
          <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80">
            <CardTitle>
              Actual Cost Details (Analytic Lines) - {analyticLines.length} entries
            </CardTitle>
            <ChevronDown className="h-5 w-5 transition-transform duration-200" />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticLines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(line.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{line.name}</TableCell>
                    <TableCell>
                      {line.product_id ? line.product_id[1] : "-"}
                    </TableCell>
                    <TableCell>
                      {line.employee_id ? line.employee_id[1] : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">
                        {line.category || "material"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${formatCurrency(Math.abs(line.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
