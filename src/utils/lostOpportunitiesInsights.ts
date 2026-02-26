import type { LostLead } from "@/hooks/useLostOpportunities";

export interface LostOppAIInsight {
  type: "warning" | "info" | "opportunity";
  metric: string;
  value: string;
  insight: string;
  suggestions: string[];
  priority: "high" | "medium" | "low";
}

const STATE_RATES: Record<string, number> = {
  NSW: 1450, QLD: 1365, WA: 1550, VIC: 2180, SA: 2180, TAS: 1450,
};

const LABOUR_VARIANCE_HIGH = 25;
const LABOUR_VARIANCE_AMBER = 10;
const FREIGHT_PCT_HIGH = 5;
const MARGIN_PCT_HIGH = 40;

const LATEST_JOBS_LIMIT = 300;

function isExcludedStage(stage: string): boolean {
  const s = (stage || "").toLowerCase();
  return s.includes("tender") || s.includes("paperwork");
}

function filterRelevantLeads(leads: LostLead[]): LostLead[] {
  return leads
    .filter((l) => !isExcludedStage(l.stage))
    .sort((a, b) => (b.date_lost || "").localeCompare(a.date_lost || ""))
    .slice(0, LATEST_JOBS_LIMIT);
}

function hasHighLabour(lead: LostLead): boolean {
  if (lead.flags?.includes("high_labour")) return true;
  if (!lead.quote_labour || !lead.labour_qty || lead.labour_qty <= 0) return false;
  const bench = lead.quote_state ? STATE_RATES[lead.quote_state] : null;
  if (!bench) return false;
  const rate = lead.quote_labour / lead.labour_qty;
  const variance = ((rate - bench) / bench) * 100;
  return variance >= LABOUR_VARIANCE_AMBER;
}

function hasHighFreight(lead: LostLead): boolean {
  if (lead.flags?.includes("high_freight")) return true;
  if (!lead.quote_freight || !lead.quote_total || lead.quote_total <= 0) return false;
  const pct = (lead.quote_freight / lead.quote_total) * 100;
  return pct > FREIGHT_PCT_HIGH;
}

function hasHighMargin(lead: LostLead): boolean {
  if (lead.flags?.includes("high_gp")) return true;
  return (lead.margin_pct ?? 0) > MARGIN_PCT_HIGH;
}

const fmt = (v: number) =>
  "$" + Math.abs(v).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function generateLostOpportunitiesInsights(leads: LostLead[]): LostOppAIInsight[] {
  const relevant = filterRelevantLeads(leads);
  if (relevant.length === 0) return [];

  const insights: LostOppAIInsight[] = [];
  const labourLeads = relevant.filter(hasHighLabour);
  const freightLeads = relevant.filter(hasHighFreight);
  const marginLeads = relevant.filter(hasHighMargin);
  const multiFlagLeads = relevant.filter((l) => (l.flags?.length ?? 0) >= 2);

  const labourValue = labourLeads.reduce((s, l) => s + l.revenue, 0);
  const freightValue = freightLeads.reduce((s, l) => s + l.revenue, 0);
  const marginValue = marginLeads.reduce((s, l) => s + l.revenue, 0);

  if (labourLeads.length > 0) {
    insights.push({
      type: "warning",
      metric: "Labour cost concerns",
      value: `${labourLeads.length} jobs (${fmt(labourValue)} value)`,
      insight: `In the latest ${relevant.length} non-tender lost jobs, ${labourLeads.length} had labour rates above benchmark (${LABOUR_VARIANCE_AMBER}%+ variance) or were flagged high labour. This may have impacted competitiveness.`,
      suggestions: [
        "Review quoted labour rates against state benchmarks (NSW/QLD/WA/VIC/SA/TAS)",
        "Compare labour component of won vs lost quotes in the same region",
        "Consider value-engineering labour scope or phased delivery",
      ],
      priority: labourLeads.length >= 10 ? "high" : "medium",
    });
  }

  if (freightLeads.length > 0) {
    insights.push({
      type: "warning",
      metric: "Freight cost concerns",
      value: `${freightLeads.length} jobs (${fmt(freightValue)} value)`,
      insight: `Freight exceeded 5% of quote total in ${freightLeads.length} of the latest lost jobs. High freight can signal logistics inefficiency or regional pricing challenges.`,
      suggestions: [
        "Audit freight quotes — bundle deliveries or negotiate carrier rates",
        "Consider local/regional stock to reduce shipping distance",
        "Present freight options (standard vs express) to give clients choice",
      ],
      priority: freightLeads.length >= 10 ? "high" : "medium",
    });
  }

  if (marginLeads.length > 0) {
    insights.push({
      type: "info",
      metric: "High product margin flagged",
      value: `${marginLeads.length} jobs (${fmt(marginValue)} value)`,
      insight: `Product margin exceeded ${MARGIN_PCT_HIGH}% in ${marginLeads.length} lost jobs. While margins protect profitability, they may have priced you out on competitive tenders.`,
      suggestions: [
        "Compare margin structure of won vs lost jobs in similar deal sizes",
        "Review if high-margin components can be value-engineered",
        "Ensure margin is justified by value-add (engineering, service, warranty)",
      ],
      priority: marginLeads.length >= 10 ? "high" : "medium",
    });
  }

  if (multiFlagLeads.length > 0) {
    insights.push({
      type: "warning",
      metric: "Multiple overinflation flags",
      value: `${multiFlagLeads.length} jobs`,
      insight: `${multiFlagLeads.length} lost jobs had 2+ flags (labour, freight, or GP). Combined overinflation likely hurt competitiveness — focus here first.`,
      suggestions: [
        "Prioritise these jobs for post-mortem review",
        "Identify common patterns: customer type, region, product mix",
        "Create a checklist for future quotes to avoid stacking multiple risk areas",
      ],
      priority: "high",
    });
  }

  const reasonCounts: Record<string, number> = {};
  for (const l of relevant) {
    const r = l.lost_reason || "Other";
    reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;
  }
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topReasons.length > 0) {
    const [topName, topCount] = topReasons[0];
    insights.push({
      type: "info",
      metric: "Top lost reason (non-tender)",
      value: `${topName} (${topCount})`,
      insight: `Excluding tender/paperwork stages: "${topName}" is the most common reason.`,
      suggestions:
        topName.toLowerCase().includes("price") || topName.toLowerCase().includes("expensive")
          ? ["Review pricing competitiveness and cost component breakdown"]
          : topName.toLowerCase().includes("competitor")
            ? ["Gather competitor intelligence; consider value-add differentiators"]
            : [],
      priority: "low",
    });
  }

  return insights;
}
