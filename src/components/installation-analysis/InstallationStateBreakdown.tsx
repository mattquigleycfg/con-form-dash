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
}

export function InstallationStateBreakdown({ byProductType }: Props) {
  const allStates = new Set<string>();
  Object.values(byProductType).forEach((pt) => {
    Object.keys(pt.by_state).forEach((s) => allStates.add(s));
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(byProductType).flatMap(([type, stats]) =>
              states
                .filter((s) => stats.by_state[s])
                .map((state) => {
                  const bs = stats.by_state[state];
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
                    </TableRow>
                  );
                })
            )}
            {states.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
