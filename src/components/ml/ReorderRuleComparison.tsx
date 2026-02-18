import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { ReorderRule } from "@/hooks/useMLPredictions";

interface ReorderRuleComparisonProps {
  data: ReorderRule[];
}

function DeltaCell({ value }: { value: number }) {
  if (Math.abs(value) < 0.5) {
    return <span className="text-muted-foreground flex items-center gap-1 text-xs"><Minus className="h-3 w-3" /> --</span>;
  }
  const isPositive = value > 0;
  return (
    <span className={`flex items-center gap-1 text-xs ${isPositive ? "text-amber-600" : "text-blue-600"}`}>
      {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(value).toFixed(0)}
    </span>
  );
}

export function ReorderRuleComparison({ data }: ReorderRuleComparisonProps) {
  const discrepant = useMemo(() => data.filter((r) => r.is_discrepant), [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Reorder Rule Comparison</CardTitle>
        <CardDescription className="text-xs">
          {discrepant.length} of {data.length} products have significant discrepancies between Odoo settings and calculated optimal values
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No reorder rule data available
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs text-right">Odoo Min</TableHead>
                  <TableHead className="text-xs text-right">Calc ROP</TableHead>
                  <TableHead className="text-xs text-center">Min Delta</TableHead>
                  <TableHead className="text-xs text-right">Odoo Max</TableHead>
                  <TableHead className="text-xs text-right">Calc Max</TableHead>
                  <TableHead className="text-xs text-center">Max Delta</TableHead>
                  <TableHead className="text-xs text-right">Safety Stock</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 50).map((r) => (
                  <TableRow key={r.product_id} className={r.is_discrepant ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
                    <TableCell className="text-xs font-medium max-w-[180px] truncate">{r.product_name}</TableCell>
                    <TableCell className="text-xs text-right">{r.odoo_min_qty.toFixed(0)}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{r.reorder_point.toFixed(0)}</TableCell>
                    <TableCell className="text-center"><DeltaCell value={r.min_qty_delta} /></TableCell>
                    <TableCell className="text-xs text-right">{r.odoo_max_qty.toFixed(0)}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{r.max_quantity.toFixed(0)}</TableCell>
                    <TableCell className="text-center"><DeltaCell value={r.max_qty_delta} /></TableCell>
                    <TableCell className="text-xs text-right">{r.safety_stock.toFixed(0)}</TableCell>
                    <TableCell>
                      {r.is_discrepant ? (
                        <Badge variant="destructive" className="text-[10px]">Mismatch</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">OK</Badge>
                      )}
                    </TableCell>
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
