import { Card, CardContent } from "@/components/ui/card";
import type { FreightSummary } from "@/hooks/useFreightAnalysis";

interface Props {
  summary: FreightSummary;
}

export function FreightSummaryCards({ summary }: Props) {
  const gapPositive = summary.total_gap > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Matched Pairs</p>
          <p className="text-2xl font-bold">{summary.total_matched_pairs}</p>
          <p className="text-xs text-muted-foreground">
            of {summary.total_so_freight_orders} SO orders
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total SO Freight</p>
          <p className="text-2xl font-bold">
            ${summary.total_so_freight_value.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total PO Freight</p>
          <p className="text-2xl font-bold">
            ${summary.total_po_freight_value.toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total Gap (SO - PO)</p>
          <p className={`text-2xl font-bold ${gapPositive ? "text-green-600" : "text-destructive"}`}>
            {gapPositive ? "+" : ""}${summary.total_gap.toLocaleString()}
          </p>
          {summary.avg_gap_pct !== null && (
            <p className="text-xs text-muted-foreground">
              avg {(summary.avg_gap_pct * 100).toFixed(0)}% margin
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">% Overquoted</p>
          <p className={`text-2xl font-bold ${
            (summary.pct_overquoted ?? 0) > 0.5 ? "text-green-600" : "text-destructive"
          }`}>
            {summary.pct_overquoted !== null
              ? `${(summary.pct_overquoted * 100).toFixed(0)}%`
              : "N/A"}
          </p>
          <p className="text-xs text-muted-foreground">SO freight &gt; PO freight</p>
        </CardContent>
      </Card>
    </div>
  );
}
