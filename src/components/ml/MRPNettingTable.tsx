import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import type { MRPNettingResult } from "@/hooks/useMLPredictions";

interface MRPNettingTableProps {
  data: MRPNettingResult[];
}

function ohClass(value: number): string {
  if (value < 0) return "text-red-600 font-semibold";
  if (value <= 5) return "text-amber-600 font-semibold";
  return "";
}

function ohBadge(value: number) {
  if (value < 0)
    return (
      <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-200">
        {value.toLocaleString()}
      </Badge>
    );
  if (value <= 5)
    return (
      <Badge
        variant="outline"
        className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200"
      >
        {value.toLocaleString()}
      </Badge>
    );
  return <span>{value.toLocaleString()}</span>;
}

function formatWeek(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function ProductRow({ product }: { product: MRPNettingResult }) {
  const [expanded, setExpanded] = useState(false);

  const minOH = Math.min(...product.weeks.map((w) => w.projected_on_hand));
  const totalNetReq = product.weeks.reduce((s, w) => s + Math.max(0, w.net_requirement), 0);
  const totalPlanned = product.weeks.reduce((s, w) => s + w.planned_order_release, 0);

  return (
    <>
      <TableRow
        className="hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="text-xs">
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 mr-1">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        </TableCell>
        <TableCell className="text-xs font-medium max-w-[200px] truncate">
          {product.product_name}
        </TableCell>
        <TableCell className="text-xs">{product.on_hand.toLocaleString()}</TableCell>
        <TableCell className="text-xs">{product.safety_stock.toLocaleString()}</TableCell>
        <TableCell className="text-xs">{ohBadge(minOH)}</TableCell>
        <TableCell className="text-xs">
          {totalNetReq > 0 ? totalNetReq.toLocaleString() : "—"}
        </TableCell>
        <TableCell className="text-xs font-medium">
          {totalPlanned > 0 ? totalPlanned.toLocaleString() : "—"}
        </TableCell>
        <TableCell className="text-xs">{product.weeks.length}w</TableCell>
      </TableRow>
      {expanded &&
        product.weeks.map((w, i) => (
          <TableRow key={`${product.product_id}-w${i}`} className="bg-muted/30">
            <TableCell />
            <TableCell className="text-[11px] text-muted-foreground pl-8">
              Wk {formatWeek(w.week_start)}
            </TableCell>
            <TableCell className="text-[11px]">{w.gross_requirement.toLocaleString()}</TableCell>
            <TableCell className="text-[11px]">{w.scheduled_receipts.toLocaleString()}</TableCell>
            <TableCell className={`text-[11px] ${ohClass(w.projected_on_hand)}`}>
              {ohBadge(w.projected_on_hand)}
            </TableCell>
            <TableCell className="text-[11px]">
              {w.net_requirement > 0 ? w.net_requirement.toLocaleString() : "—"}
            </TableCell>
            <TableCell className="text-[11px] font-medium">
              {w.planned_order_release > 0 ? w.planned_order_release.toLocaleString() : "—"}
            </TableCell>
            <TableCell />
          </TableRow>
        ))}
    </>
  );
}

export function MRPNettingTable({ data }: MRPNettingTableProps) {
  const shortageCount = data.filter((p) =>
    p.weeks.some((w) => w.projected_on_hand < 0)
  ).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="h-4 w-4" />
              MRP Netting View
            </CardTitle>
            <CardDescription className="text-xs">
              {data.length} products — click a row to expand weekly buckets
              {shortageCount > 0 && (
                <>
                  {" · "}
                  <span className="text-red-500">{shortageCount} with projected shortages</span>
                </>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No MRP netting data available
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8" />
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs">On Hand</TableHead>
                  <TableHead className="text-xs">Safety Stock</TableHead>
                  <TableHead className="text-xs">Min Projected OH</TableHead>
                  <TableHead className="text-xs">Total Net Req</TableHead>
                  <TableHead className="text-xs">Total Planned</TableHead>
                  <TableHead className="text-xs">Horizon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => (
                  <ProductRow key={p.product_id} product={p} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
