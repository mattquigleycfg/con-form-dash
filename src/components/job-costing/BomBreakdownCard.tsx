import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { BomCostBreakdown } from "@/hooks/useJobCostAnalysis";
import { formatCurrency } from "@/lib/utils";

interface BomBreakdownCardProps {
  bomBreakdowns: BomCostBreakdown[];
}

export function BomBreakdownCard({ bomBreakdowns }: BomBreakdownCardProps) {
  if (bomBreakdowns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bill of Materials Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No manufacturing orders found for this sale order.
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
              Bill of Materials Cost Breakdown - {bomBreakdowns.length} MO(s)
            </CardTitle>
            <ChevronDown className="h-5 w-5 transition-transform duration-200" />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {bomBreakdowns.map((bom) => (
              <div key={bom.manufacturingOrderId} className="border rounded-lg p-4">
                <div className="mb-4">
                  <h4 className="font-semibold text-lg">
                    {bom.moName} - {bom.productName}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Quantity: {bom.quantity} | Total Material Cost: ${formatCurrency(bom.materialCost)}
                  </p>
                </div>

                <div>
                  <h5 className="font-medium mb-2">Components</h5>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Component</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bom.components.map((comp) => (
                        <TableRow key={comp.productId}>
                          <TableCell>{comp.productName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {comp.productCode || "-"}
                          </TableCell>
                          <TableCell className="text-right">{comp.quantity}</TableCell>
                          <TableCell className="text-right">
                            ${formatCurrency(comp.unitCost)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${formatCurrency(comp.totalCost)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold border-t-2">
                        <TableCell colSpan={4}>Subtotal</TableCell>
                        <TableCell className="text-right">
                          ${formatCurrency(bom.materialCost)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
