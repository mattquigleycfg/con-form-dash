import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, AlertTriangle, TrendingDown, DollarSign } from "lucide-react";
import type { LostLead } from "@/hooks/useLostOpportunities";

interface Props {
  lead: LostLead | null;
  open: boolean;
  onClose: () => void;
}

const STATE_RATES: Record<string, number> = {
  NSW: 1450, QLD: 1365, WA: 1550, VIC: 2180, SA: 2180, TAS: 1450,
};

const fmt = (v: number) =>
  "$" + Math.abs(v).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const REASON_INSIGHTS: Record<string, string> = {
  "contractor lost the job": "External factor — your contractor client lost the main tender. This is outside your control. Focus on diversifying the contractor base and tracking win rates per contractor.",
  "clean up day": "Administrative archival during CRM data cleanup. Review if these leads were genuinely dead or if follow-up was missed before cleanup.",
  "no con-form scope": "The project didn't require Con-Form products. Improve lead qualification screening to filter these earlier and reduce wasted quoting effort.",
  "project did not go ahead": "The entire project was cancelled or shelved. Keep the relationship warm — projects often resurface. Set a 6-month follow-up reminder.",
  "con-form scope removed from scope": "Con-Form products were originally spec'd but were value-engineered out. Review if your pricing was competitive or if cheaper alternatives were substituted.",
  "too expensive": "Your quote was above the client's budget or competitor pricing. Analyse the specific cost components (labour, freight, product) to find where you can sharpen.",
  "price": "Price was the primary objection. Compare your quoted rates against benchmarks to identify overinflated components.",
  "went with competitor": "A competitor won the work. Gather intelligence on the competitor's pricing and scope to improve future competitiveness.",
  "duplicate": "Duplicate CRM entry. No action required — ensure CRM hygiene processes prevent future duplicates.",
  "budget": "Project budget couldn't accommodate the scope. Consider offering value-engineered alternatives or staged delivery options.",
  "timing": "Timing didn't align. Set follow-up reminders to re-engage when the project timeline is confirmed.",
  "no response": "The prospect went cold. Review if your follow-up cadence was sufficient. Consider multi-channel outreach (phone, email, site visit).",
  "specification change": "The project specifications changed, removing the need for your products. Stay engaged with specifiers to be included in revised scopes.",
};

function getInsight(reason: string): string {
  const key = reason.toLowerCase().trim();
  for (const [pattern, insight] of Object.entries(REASON_INSIGHTS)) {
    if (key.includes(pattern) || pattern.includes(key)) return insight;
  }
  if (key.includes("compet")) return REASON_INSIGHTS["went with competitor"];
  if (key.includes("price") || key.includes("expensive") || key.includes("cost"))
    return REASON_INSIGHTS["too expensive"];
  if (key.includes("scope") && key.includes("remov"))
    return REASON_INSIGHTS["con-form scope removed from scope"];
  if (key.includes("did not go") || key.includes("cancel"))
    return REASON_INSIGHTS["project did not go ahead"];
  if (key.includes("no response") || key.includes("no reply"))
    return REASON_INSIGHTS["no response"];
  return "Review the specific circumstances of this opportunity. Compare your quoting approach against won jobs in the same region and product category to identify improvement areas.";
}

function getLabourAnalysis(lead: LostLead) {
  if (!lead.quote_labour || lead.labour_qty <= 0) return null;
  const quotedRate = lead.quote_labour / lead.labour_qty;
  const benchRate = lead.quote_state ? STATE_RATES[lead.quote_state] : null;
  const variance = benchRate ? ((quotedRate - benchRate) / benchRate) * 100 : null;
  return { quotedRate, benchRate, variance, qty: lead.labour_qty, state: lead.quote_state };
}

function getFreightAnalysis(lead: LostLead) {
  if (!lead.quote_freight || lead.quote_total <= 0) return null;
  const pct = (lead.quote_freight / lead.quote_total) * 100;
  return { amount: lead.quote_freight, pctOfTotal: pct, isHigh: pct > 5 };
}

function getProductAnalysis(lead: LostLead) {
  if (!lead.quote_product) return null;
  return { amount: lead.quote_product, marginPct: lead.margin_pct };
}

export default function LeadDetailCard({ lead, open, onClose }: Props) {
  if (!lead) return null;

  const insight = getInsight(lead.lost_reason);
  const labour = getLabourAnalysis(lead);
  const freight = getFreightAnalysis(lead);
  const product = getProductAnalysis(lead);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{lead.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Lost opportunity details: customer, salesperson, stage, quote breakdown and margin analysis
          </DialogDescription>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{lead.customer}</span>
            <span>·</span>
            <span>{lead.salesperson}</span>
            <span>·</span>
            <Badge variant="outline" className="text-xs">{lead.stage}</Badge>
            {lead.date_lost && <span className="ml-auto text-xs">{lead.date_lost}</span>}
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Lost Reason + AI Insight */}
          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Lost Reason: {lead.lost_reason}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
            </CardContent>
          </Card>

          {/* Value summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Opportunity Value</p>
              <p className="text-lg font-bold">{lead.revenue > 0 ? fmt(lead.revenue) : "—"}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Quote Total</p>
              <p className="text-lg font-bold">{lead.has_quote ? fmt(lead.quote_total) : "No quote"}</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-xs text-muted-foreground">Est. Margin</p>
              <p className={`text-lg font-bold ${lead.margin_pct > 40 ? "text-amber-600" : ""}`}>
                {lead.margin_pct > 0 ? `${lead.margin_pct.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>

          {/* Quote Breakdown Table */}
          {lead.has_quote && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Quote Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead className="text-right">Quoted</TableHead>
                      <TableHead className="text-right">Benchmark</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Assessment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Labour */}
                    <TableRow>
                      <TableCell className="font-medium text-sm">
                        Labour
                        {labour && <span className="text-muted-foreground text-xs ml-1">({labour.qty} days)</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {lead.quote_labour > 0 ? fmt(lead.quote_labour) : "—"}
                        {labour && <div className="text-[10px] text-muted-foreground">{fmt(labour.quotedRate)}/day</div>}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {labour?.benchRate ? (
                          <>
                            {fmt(labour.benchRate)}/day
                            <div className="text-[10px] text-muted-foreground">{labour.state}</div>
                          </>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {labour?.variance != null ? (
                          <span className={labour.variance > 15 ? "text-red-600 font-medium" : labour.variance > 0 ? "text-amber-600" : "text-green-600"}>
                            {labour.variance > 0 ? "+" : ""}{labour.variance.toFixed(1)}%
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {labour?.variance != null && labour.variance > 25 ? (
                          <Badge className="bg-red-100 text-red-800 text-[10px]">Overinflated</Badge>
                        ) : labour?.variance != null && labour.variance > 10 ? (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">Above Avg</Badge>
                        ) : labour ? (
                          <Badge variant="secondary" className="text-[10px]">OK</Badge>
                        ) : <span className="text-xs text-muted-foreground">N/A</span>}
                      </TableCell>
                    </TableRow>

                    {/* Freight */}
                    <TableRow>
                      <TableCell className="font-medium text-sm">Freight</TableCell>
                      <TableCell className="text-right text-sm">
                        {lead.quote_freight > 0 ? fmt(lead.quote_freight) : "—"}
                        {freight && <div className="text-[10px] text-muted-foreground">{freight.pctOfTotal.toFixed(1)}% of quote</div>}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        &lt;5% typical
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {freight ? (
                          <span className={freight.isHigh ? "text-amber-600" : "text-green-600"}>
                            {freight.pctOfTotal.toFixed(1)}%
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {freight?.isHigh ? (
                          <Badge className="bg-orange-100 text-orange-800 text-[10px]">High</Badge>
                        ) : freight ? (
                          <Badge variant="secondary" className="text-[10px]">OK</Badge>
                        ) : <span className="text-xs text-muted-foreground">N/A</span>}
                      </TableCell>
                    </TableRow>

                    {/* Product */}
                    <TableRow>
                      <TableCell className="font-medium text-sm">Product / Materials</TableCell>
                      <TableCell className="text-right text-sm">
                        {lead.quote_product > 0 ? fmt(lead.quote_product) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">—</TableCell>
                      <TableCell className="text-right text-sm">
                        {product?.marginPct ? `${product.marginPct.toFixed(1)}% GP` : "—"}
                      </TableCell>
                      <TableCell>
                        {product?.marginPct && product.marginPct > 40 ? (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">High Margin</Badge>
                        ) : product ? (
                          <Badge variant="secondary" className="text-[10px]">OK</Badge>
                        ) : <span className="text-xs text-muted-foreground">N/A</span>}
                      </TableCell>
                    </TableRow>

                    {/* Total */}
                    <TableRow className="border-t-2">
                      <TableCell className="font-bold text-sm">Total Quote</TableCell>
                      <TableCell className="text-right font-bold text-sm">{fmt(lead.quote_total)}</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell>
                        {lead.flags.length > 0 && (
                          <div className="flex gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] text-amber-600">{lead.flags.length} flag(s)</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {!lead.has_quote && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                <TrendingDown className="h-6 w-6 mx-auto mb-2 opacity-40" />
                No linked Sale Order found — this opportunity was lost before a formal quote was generated.
                Consider whether earlier engagement or faster quoting turnaround could retain these.
              </CardContent>
            </Card>
          )}

          {/* Flags summary */}
          {lead.flags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {lead.flags.includes("high_gp") && (
                <Badge className="bg-amber-100 text-amber-800">
                  High GP — overall margin above 40%, suggesting the quote may have been uncompetitive
                </Badge>
              )}
              {lead.flags.includes("high_labour") && (
                <Badge className="bg-red-100 text-red-800">
                  High Labour — quoted installation rate significantly above the {lead.quote_state || "state"} benchmark
                </Badge>
              )}
              {lead.flags.includes("high_freight") && (
                <Badge className="bg-orange-100 text-orange-800">
                  High Freight — freight cost above $2,500, may have inflated the total quote
                </Badge>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
