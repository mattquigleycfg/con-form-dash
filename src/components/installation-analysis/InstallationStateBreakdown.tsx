import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProductTypeStats } from "@/hooks/useInstallationAnalysis";

interface Props {
  byProductType: Record<string, ProductTypeStats>;
  variantPrices?: Record<string, number>;
}

export function InstallationStateBreakdown({ byProductType, variantPrices }: Props) {
  const safe = byProductType || {};
  const allStates = new Set<string>();
  Object.values(safe).forEach((pt) => {
    Object.keys(pt.by_state || {}).forEach((s) => allStates.add(s));
  });
  const states = Array.from(allStates).sort();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">State Breakdown by Product Type</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead className="text-right">Total Qty</TableHead>
              <TableHead className="text-right">Avg Qty/Order</TableHead>
              <TableHead className="text-right">Avg $/Unit</TableHead>
              {variantPrices && Object.keys(variantPrices).length > 0 && (
                <TableHead className="text-right">List Price</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(safe).flatMap(([type, stats]) =>
              states
                .filter((s) => stats.by_state[s])
                .map((state) => {
                  const bs = stats.by_state[state];
                  const listPrice = variantPrices?.[state];
                  const priceDiff = listPrice && bs.avg_price
                    ? ((bs.avg_price - listPrice) / listPrice) * 100
                    : null;
                  return (
                    <TableRow key={`${type}-${state}`}>
                      <TableCell><Badge variant="outline">{type}</Badge></TableCell>
                      <TableCell>{state}</TableCell>
                      <TableCell className="text-right">{bs.order_count}</TableCell>
                      <TableCell className="text-right">{bs.total_qty}</TableCell>
                      <TableCell className="text-right">{bs.avg_qty}</TableCell>
                      <TableCell className="text-right">
                        ${bs.avg_price.toLocaleString()}
                      </TableCell>
                      {variantPrices && Object.keys(variantPrices).length > 0 && (
                        <TableCell className="text-right">
                          {listPrice ? (
                            <span className="flex items-center justify-end gap-1">
                              ${listPrice.toLocaleString()}
                              {priceDiff !== null && (
                                <span className={`text-xs ${priceDiff > 5 ? "text-green-600" : priceDiff < -5 ? "text-destructive" : "text-muted-foreground"}`}>
                                  ({priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(0)}%)
                                </span>
                              )}
                            </span>
                          ) : "\u2014"}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
            )}
            {states.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No state data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
