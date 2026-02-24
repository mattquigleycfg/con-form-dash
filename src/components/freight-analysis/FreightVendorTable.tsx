import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FreightVendorRow } from "@/hooks/useFreightAnalysis";

interface Props {
  vendors: FreightVendorRow[];
}

export function FreightVendorTable({ vendors }: Props) {
  if (vendors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No vendor freight data available.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Freight Vendors (by total cost)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background">Vendor</TableHead>
                <TableHead className="sticky top-0 bg-background text-right">PO Count</TableHead>
                <TableHead className="sticky top-0 bg-background text-right">Lines</TableHead>
                <TableHead className="sticky top-0 bg-background text-right">Total Cost</TableHead>
                <TableHead className="sticky top-0 bg-background text-right">Avg / Line</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => (
                <TableRow key={v.vendor}>
                  <TableCell className="font-medium">{v.vendor}</TableCell>
                  <TableCell className="text-right">{v.po_count}</TableCell>
                  <TableCell className="text-right">{v.line_count}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${v.total_cost.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ${v.avg_cost.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
