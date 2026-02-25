import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LostOppSummary } from "@/hooks/useLostOpportunities";

interface Props {
  summary: LostOppSummary;
}

const fmt = (v: number) =>
  "$" + Math.abs(v).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function gpBadge(gp: number, threshold: number) {
  if (gp < 0) return <Badge variant="destructive">{(gp * 100).toFixed(1)}%</Badge>;
  if (gp > threshold) return <Badge className="bg-amber-100 text-amber-800">{(gp * 100).toFixed(1)}%</Badge>;
  return <Badge variant="secondary">{(gp * 100).toFixed(1)}%</Badge>;
}

export default function TypeStateBreakdown({ summary }: Props) {
  const typeEntries = Object.entries(summary.by_product_type);
  const stateEntries = Object.entries(summary.by_state);

  return (
    <Tabs defaultValue="type">
      <TabsList>
        <TabsTrigger value="type">By Product Type</TabsTrigger>
        <TabsTrigger value="state">By State</TabsTrigger>
      </TabsList>

      <TabsContent value="type">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Profitability by Product Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Labour</TableHead>
                  <TableHead className="text-right">Freight</TableHead>
                  <TableHead className="text-right">Product</TableHead>
                  <TableHead className="text-right">Total COGS</TableHead>
                  <TableHead className="text-center">GP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">No data</TableCell>
                  </TableRow>
                )}
                {typeEntries.map(([type, d]) => (
                  <TableRow key={type}>
                    <TableCell className="font-medium text-sm">{type}</TableCell>
                    <TableCell className="text-right text-sm">{d.count}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(d.revenue)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(d.labour)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(d.freight)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(d.product)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{fmt(d.cogs)}</TableCell>
                    <TableCell className="text-center">{gpBadge(d.gp, summary.gp_threshold)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="state">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Profitability by State</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-center">GP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stateEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">No data</TableCell>
                  </TableRow>
                )}
                {stateEntries.map(([state, d]) => (
                  <TableRow key={state}>
                    <TableCell className="font-medium text-sm">{state}</TableCell>
                    <TableCell className="text-right text-sm">{d.count}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(d.revenue)}</TableCell>
                    <TableCell className="text-right text-sm">{fmt(d.cogs)}</TableCell>
                    <TableCell className="text-center">{gpBadge(d.gp, summary.gp_threshold)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
