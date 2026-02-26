import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { XCircle, AlertTriangle, TrendingDown, Percent } from "lucide-react";
import type { LostOppSummary, LostLead } from "@/hooks/useLostOpportunities";
import OverinflatedJobsModal from "./OverinflatedJobsModal";
import ConversionRateModal from "./ConversionRateModal";

const fmt = (v: number) =>
  "$" + v.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const FLAG_DISPLAY: Record<string, string> = {
  high_gp: "High GP",
  high_labour: "High Labour",
  high_freight: "High Freight",
};

interface Props {
  summary: LostOppSummary;
  leads?: LostLead[];
  byStage?: { stage: string; count: number; value: number }[];
}

export default function SummaryCards({ summary, leads = [], byStage = [] }: Props) {
  const [overinflatedModalOpen, setOverinflatedModalOpen] = useState(false);
  const [conversionModalOpen, setConversionModalOpen] = useState(false);
  const flagsBreakdown = (() => {
    if (summary.flags_breakdown && Object.keys(summary.flags_breakdown).length > 0) {
      return summary.flags_breakdown;
    }
    const counts: Record<string, number> = {};
    for (const l of leads) {
      for (const f of l.flags) {
        counts[f] = (counts[f] ?? 0) + 1;
      }
    }
    return counts;
  })();
  const breakdownLines = Object.entries(flagsBreakdown)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${FLAG_DISPLAY[k] || k}: ${n}`)
    .join(" | ");

  return (
    <>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Card className="cursor-default">
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
        </HoverCardTrigger>
        <HoverCardContent side="bottom" className="w-64">
          <div className="space-y-2 text-sm">
            <p className="font-medium">Total Value Lost</p>
            <p className="text-muted-foreground">
              {fmt(summary.total_value)} (avg {fmt(summary.avg_deal_size)} per deal)
            </p>
            <p className="font-medium pt-2">With Quotes</p>
            <p className="text-muted-foreground">
              {summary.with_quotes} had linked sale orders
            </p>
          </div>
        </HoverCardContent>
      </HoverCard>

      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Card
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => summary.flagged_overinflated > 0 && setOverinflatedModalOpen(true)}
          >
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
        </HoverCardTrigger>
        <HoverCardContent side="bottom" className="w-72">
          <div className="space-y-1 text-sm">
            <p className="font-medium">Breakdown by area</p>
            <p className="text-muted-foreground">
              {breakdownLines || "No breakdown available"}
            </p>
            <p className="text-xs text-muted-foreground pt-1">Click to view jobs</p>
          </div>
        </HoverCardContent>
      </HoverCard>

      <Card
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setConversionModalOpen(true)}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(summary.conversion_rate_excl_tender ?? summary.conversion_rate ?? 0).toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground">
            excl. tender · click for per-stage
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

    <ConversionRateModal
      conversionRate={summary.conversion_rate ?? 0}
      conversionRateExclTender={summary.conversion_rate_excl_tender ?? 0}
      wonCount={summary.won_count ?? 0}
      totalLost={summary.total_lost}
      byStageSuccess={
        (summary.by_stage_success?.length ?? 0) > 0
          ? (summary.by_stage_success ?? [])
          : byStage.map((s) => ({ stage: s.stage, won_count: 0, lost_count: s.count, success_rate: 0 }))
      }
      open={conversionModalOpen}
      onClose={() => setConversionModalOpen(false)}
    />

    <OverinflatedJobsModal
      leads={leads}
      open={overinflatedModalOpen}
      onClose={() => setOverinflatedModalOpen(false)}
    />
    </>
  );
}
