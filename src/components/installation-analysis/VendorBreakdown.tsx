import { useMemo } from "react";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { VendorRow } from "@/hooks/useInstallationAnalysis";

interface Props {
  vendors: VendorRow[];
}

export function VendorBreakdown({ vendors }: Props) {
  const chartData = useMemo(
    () =>
      vendors
        .filter((v) => v.avg_rate > 0)
        .slice(0, 12)
        .map((v) => ({
          name: v.vendor.length > 20 ? v.vendor.slice(0, 18) + "\u2026" : v.vendor,
          rate: v.avg_rate,
          fullName: v.vendor,
        })),
    [vendors]
  );

  const totalSpend = vendors.reduce((s, v) => s + v.total_cost, 0);
  const totalUnits = vendors.reduce((s, v) => s + v.total_units, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Vendors</p>
            <p className="text-2xl font-bold">{vendors.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Install Spend</p>
            <p className="text-2xl font-bold">${(totalSpend / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Units Purchased</p>
            <p className="text-2xl font-bold">{totalUnits.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Rate (all vendors)</p>
            <p className="text-2xl font-bold">
              ${totalUnits > 0 ? Math.round(totalSpend / totalUnits).toLocaleString() : 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rate comparison chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Rate per Unit by Vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 36)}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                <YAxis dataKey="name" type="category" width={160} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Avg Rate/Unit"]}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.fullName || label
                  }
                />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Full vendor table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background">Vendor</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">PO Count</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Total Units</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Total Cost</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">Avg Rate/Unit</TableHead>
                  <TableHead className="sticky top-0 bg-background">States</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.vendor}>
                    <TableCell className="font-medium max-w-[240px] truncate">
                      {v.vendor}
                    </TableCell>
                    <TableCell className="text-right">{v.po_count}</TableCell>
                    <TableCell className="text-right">{v.total_units.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      ${v.total_cost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${v.avg_rate.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {v.states_worked.map((s) => (
                        <Badge key={s} variant="outline" className="mr-1 text-xs">
                          {s}
                        </Badge>
                      ))}
                      {v.states_worked.length === 0 && (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
