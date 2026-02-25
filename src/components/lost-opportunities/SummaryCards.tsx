import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XCircle, DollarSign, AlertTriangle, FileText, TrendingDown } from "lucide-react";
import type { LostOppSummary } from "@/hooks/useLostOpportunities";

interface Props {
  summary: LostOppSummary;
}

const fmt = (v: number) =>
  "$" + v.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function SummaryCards({ summary }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lost Opportunities</CardTitle>
          <XCircle className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.total_lost}</div>
          <p className="text-xs text-muted-foreground">
            total archived leads
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value Lost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{fmt(summary.total_value)}</div>
          <p className="text-xs text-muted-foreground">
            avg {fmt(summary.avg_deal_size)} per deal
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">With Quotes</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.with_quotes}</div>
          <p className="text-xs text-muted-foreground">
            had linked sale orders
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overinflated Flags</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{summary.flagged_overinflated}</div>
          <p className="text-xs text-muted-foreground">
            high GP, labour, or freight
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Lost Reason</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-lg font-bold leading-tight truncate">{summary.top_reason || "—"}</div>
          <p className="text-xs text-muted-foreground">
            {summary.top_reason_count} occurrences
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
