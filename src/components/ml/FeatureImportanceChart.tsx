import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Lightbulb, TrendingDown, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { ModelHealthInfo } from "@/hooks/useMLPredictions";
import type { Job } from "@/hooks/useJobs";

interface FeatureImportanceChartProps {
  models: ModelHealthInfo[];
  modelName?: string;
  jobs?: Job[];
}

const FEATURE_LABELS: Record<string, string> = {
  bom_avg_unit_cost: "Avg Unit Cost",
  nmc_total: "Non-Material Cost",
  unique_products: "Unique Products",
  total_budget: "Total Budget",
  material_budget: "Material Budget",
  bom_total_quantity: "BOM Quantity",
  non_material_budget: "Non-Material Budget",
  bom_component_count: "BOM Components",
  bom_total_cost: "BOM Total Cost",
  material_line_count: "Material Lines",
  non_material_line_count: "NM Lines",
  material_budget_ratio: "Material %",
  non_material_budget_ratio: "Non-Material %",
  budget_line_count: "Budget Lines",
  po_count: "Purchase Orders",
  po_total_amount: "PO Total Value",
  po_avg_amount: "Avg PO Value",
  unique_vendors: "Unique Vendors",
  has_subcontractor: "Has Subcontractor",
  has_installation: "Has Installation",
  has_freight: "Has Freight",
  has_cranage: "Has Cranage",
  has_travel: "Has Travel",
  order_month: "Order Month",
  order_quarter: "Order Quarter",
  nmc_entry_count: "NM Entries",
  nmc_types: "NM Cost Types",
  avg_line_subtotal: "Avg Line Value",
  max_line_subtotal: "Max Line Value",
  budget_utilization: "Budget Utilisation",
  material_variance_pct: "Material Variance %",
  non_material_variance_pct: "NM Variance %",
  total_variance_pct: "Total Variance %",
  variance_imbalance: "Variance Imbalance",
  actual_margin_pct: "Actual Margin %",
  recency_days: "Days Since Last Order",
  total_jobs: "Total Jobs",
  total_revenue: "Total Revenue",
  avg_job_value: "Avg Job Value",
  max_job_value: "Max Job Value",
  tenure_days: "Customer Tenure",
  order_frequency: "Order Frequency",
  unique_pms: "Unique PMs",
  value_trend: "Value Trend",
};

const MODEL_TITLES: Record<string, string> = {
  cost_predictor: "Cost Prediction",
  overrun_classifier: "Overrun Detection",
  waste_scorer: "Waste Risk",
  anomaly_detector: "Anomaly Detection",
  customer_scorer: "Customer Scoring",
  supplier_scorer: "Supplier Scoring",
};

const MODEL_NOTES: Record<string, (topFeatures: string[]) => string[]> = {
  cost_predictor: (top) => [
    `The top drivers for cost prediction are ${top.slice(0, 3).join(", ")}. Jobs with higher values in these features tend to have larger cost deviations.`,
    "Material costs and BOM complexity are consistently the strongest predictors of final project cost.",
    "Consider monitoring jobs with unusual BOM patterns or high unit costs for early cost intervention.",
  ],
  overrun_classifier: (top) => [
    `Budget overrun risk is most influenced by ${top.slice(0, 3).join(", ")}.`,
    "Jobs with high budget utilization early in the project lifecycle are at significantly higher overrun risk.",
    "Non-material cost categories (installation, freight) often contribute to unexpected overruns.",
  ],
  waste_scorer: (top) => [
    `Material waste risk is primarily driven by ${top.slice(0, 3).join(", ")}.`,
    "Higher BOM total costs and average unit costs correlate with increased waste probability.",
    "Jobs with many unique products or complex BOM structures should be flagged for material waste monitoring.",
  ],
  anomaly_detector: (top) => [
    `Anomaly detection weighs ${top.slice(0, 3).join(", ")} most heavily when identifying unusual cost patterns.`,
    "Cost anomalies often signal data entry errors, scope changes, or procurement issues worth investigating.",
  ],
  customer_scorer: (top) => [
    `Customer re-order likelihood depends most on ${top.slice(0, 3).join(", ")}.`,
    "Customers with consistent order frequency and recent activity are most likely to place repeat orders.",
    "Value trends help identify growing vs declining customer relationships.",
  ],
  supplier_scorer: (top) => [
    `Supplier scoring is driven by ${top.slice(0, 3).join(", ")}.`,
    "Reliable delivery and consistent pricing are the strongest indicators of supplier quality.",
  ],
};

/** Compute overrun analysis from real job + budget-line data */
function useOverrunAnalysis(jobs: Job[] | undefined, modelName: string) {
  const overBudgetJobs = useMemo(() => {
    if (!jobs?.length) return [];
    return jobs.filter(j => j.total_budget > 0 && j.total_actual > j.total_budget);
  }, [jobs]);

  const overBudgetJobIds = useMemo(() => overBudgetJobs.map(j => j.id), [overBudgetJobs]);

  // Fetch budget lines for over-budget jobs to identify product/service categories causing overruns
  const { data: budgetLines } = useQuery({
    queryKey: ["overrun-budget-lines", overBudgetJobIds.length, modelName],
    queryFn: async () => {
      if (overBudgetJobIds.length === 0) return [];
      const { data, error } = await supabase
        .from("job_budget_lines")
        .select("job_id, product_name, product_type, cost_category, subtotal, quantity")
        .in("job_id", overBudgetJobIds.slice(0, 50));
      if (error) return [];
      return data || [];
    },
    enabled: overBudgetJobIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  return useMemo(() => {
    if (!jobs?.length) return null;

    const allJobs = jobs.filter(j => j.total_budget > 0);
    if (allJobs.length === 0) return null;

    // Product/service category analysis
    const categoryOverruns: Record<string, { totalCost: number; jobCount: number }> = {};
    if (budgetLines?.length) {
      const overBudgetSet = new Set(overBudgetJobIds);
      for (const line of budgetLines) {
        if (!overBudgetSet.has(line.job_id)) continue;
        const cat = (line.product_name || "Unknown").toUpperCase();
        let label = "Other Material";

        if (cat.includes("INSTALLATION")) label = "Installation";
        else if (cat.includes("FREIGHT") || cat.includes("TRANSPORT") || cat.includes("DELIVERY")) label = "Freight/Transport";
        else if (cat.includes("CRANAGE")) label = "Cranage";
        else if (cat.includes("TRAVEL") || cat.includes("ACCOMMODATION")) label = "Travel/Accomm.";
        else if (cat.includes("LABOUR") || cat.includes("MAN DAY") || cat.includes("SITE")) label = "Labour/Site Work";
        else if (cat.includes("SHOP DRAWING") || cat.includes("ENGINEERING")) label = "Engineering";
        else if (line.cost_category === "material") label = "Materials";
        else if (line.cost_category === "non_material") label = "Other Services";

        if (!categoryOverruns[label]) categoryOverruns[label] = { totalCost: 0, jobCount: 0 };
        categoryOverruns[label].totalCost += line.subtotal || 0;
        categoryOverruns[label].jobCount++;
      }
    }

    const productData = Object.entries(categoryOverruns)
      .map(([name, v]) => ({ name, value: v.totalCost, count: v.jobCount }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Timeframe analysis - which months/quarters have worst overruns
    const monthOverruns: Record<string, { count: number; totalOverrun: number }> = {};
    for (const j of overBudgetJobs) {
      const d = j.date_order ? new Date(j.date_order) : new Date(j.created_at);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = d.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
      if (!monthOverruns[monthLabel]) monthOverruns[monthLabel] = { count: 0, totalOverrun: 0 };
      monthOverruns[monthLabel].count++;
      monthOverruns[monthLabel].totalOverrun += j.total_actual - j.total_budget;
    }

    const timeData = Object.entries(monthOverruns)
      .map(([name, v]) => ({ name, value: v.totalOverrun, count: v.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Customer/location analysis (using customer_name as proxy for location/state)
    const customerOverruns: Record<string, { count: number; totalOverrun: number }> = {};
    for (const j of overBudgetJobs) {
      const cust = j.customer_name || "Unknown";
      if (!customerOverruns[cust]) customerOverruns[cust] = { count: 0, totalOverrun: 0 };
      customerOverruns[cust].count++;
      customerOverruns[cust].totalOverrun += j.total_actual - j.total_budget;
    }

    const customerData = Object.entries(customerOverruns)
      .map(([name, v]) => ({ name: name.length > 20 ? name.slice(0, 18) + "..." : name, value: v.totalOverrun, count: v.count, fullName: name }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Summary insights
    const totalOverrun = overBudgetJobs.reduce((s, j) => s + (j.total_actual - j.total_budget), 0);
    const avgOverrunPct = overBudgetJobs.length > 0
      ? overBudgetJobs.reduce((s, j) => s + ((j.total_actual - j.total_budget) / j.total_budget) * 100, 0) / overBudgetJobs.length
      : 0;

    return {
      overBudgetCount: overBudgetJobs.length,
      totalJobs: allJobs.length,
      totalOverrun,
      avgOverrunPct,
      productData,
      timeData,
      customerData,
    };
  }, [jobs, budgetLines, overBudgetJobs, overBudgetJobIds]);
}

export function FeatureImportanceChart({ models, modelName = "cost_predictor", jobs }: FeatureImportanceChartProps) {
  const model = models.find((m) => m.model_name === modelName);
  const features = (model?.top_features || [])
    .slice(0, 10)
    .map((f) => ({
      name: FEATURE_LABELS[f.name] || (f.name || "unknown").replace(/_/g, " "),
      importance: Math.round(f.importance * 1000) / 10,
      rawName: f.name,
    }))
    .reverse();

  const title = MODEL_TITLES[modelName] || modelName.replace(/_/g, " ");

  const topFeatureNames = features
    .slice()
    .reverse()
    .slice(0, 5)
    .map(f => f.name);

  const notesGenerator = MODEL_NOTES[modelName];
  const notes = notesGenerator && topFeatureNames.length > 0 ? notesGenerator(topFeatureNames) : [];

  // Compute real overrun analysis as fallback when ML features are empty
  const analysis = useOverrunAnalysis(
    features.length === 0 ? jobs : undefined,
    modelName,
  );

  const hasMLFeatures = features.length > 0;

  const fmt = (v: number) => `$${(v / 1000).toFixed(0)}k`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          {hasMLFeatures ? `Feature Importance — ${title}` : `Overrun Analysis — ${title}`}
        </CardTitle>
        <CardDescription className="text-xs">
          {hasMLFeatures
            ? `Which data points influence ${title.toLowerCase()} predictions the most`
            : analysis
              ? `${analysis.overBudgetCount} of ${analysis.totalJobs} jobs over budget — ${formatCurrency(analysis.totalOverrun)} total overrun`
              : "Analysing job data for overrun drivers..."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasMLFeatures ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={features} layout="vertical" margin={{ top: 5, right: 30, left: 90, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={85} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>

            {notes.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-muted-foreground">ML Insights</span>
                </div>
                <ul className="space-y-1.5">
                  {notes.map((note, i) => (
                    <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-muted-foreground/20">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : analysis && (analysis.productData.length > 0 || analysis.timeData.length > 0) ? (
          <div className="space-y-5">
            {/* Products/Services causing overruns */}
            {analysis.productData.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs font-semibold">Cost Categories Driving Overruns</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(160, analysis.productData.length * 28)}>
                  <BarChart data={analysis.productData} layout="vertical" margin={{ top: 0, right: 40, left: 100, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={95} />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      labelFormatter={(l: string) => l}
                      content={({ payload, label }) => {
                        if (!payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs space-y-0.5">
                            <p className="font-semibold">{label}</p>
                            <p>Total cost: {formatCurrency(d.value)}</p>
                            <p className="text-muted-foreground">Across {d.count} budget line(s)</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                      {analysis.productData.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#ef4444" : i < 3 ? "#f59e0b" : "hsl(var(--primary))"} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Timeframe analysis */}
            {analysis.timeData.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-semibold">When Were the Biggest Overruns?</span>
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={analysis.timeData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tickFormatter={fmt} tick={{ fontSize: 9 }} />
                    <Tooltip
                      content={({ payload, label }) => {
                        if (!payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs space-y-0.5">
                            <p className="font-semibold">{label}</p>
                            <p>Overrun: {formatCurrency(d.value)}</p>
                            <p className="text-muted-foreground">{d.count} job(s) over budget</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="value" fill="#f59e0b" fillOpacity={0.7} radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Customer/location analysis */}
            {analysis.customerData.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-semibold">Customers with Largest Overruns</span>
                </div>
                <div className="space-y-1.5">
                  {analysis.customerData.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{c.count}</Badge>
                        <span className="truncate" title={c.fullName}>{c.name}</span>
                      </div>
                      <span className="text-red-500 font-medium whitespace-nowrap ml-2">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary insights */}
            <div className="p-3 rounded-lg bg-muted/40 border border-muted">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-muted-foreground">Overrun Insights</span>
              </div>
              <ul className="space-y-1.5">
                {analysis.productData.length > 0 && (
                  <li className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-red-300">
                    <strong>{analysis.productData[0].name}</strong> is the largest cost driver in over-budget jobs, totalling {formatCurrency(analysis.productData[0].value)}.
                  </li>
                )}
                {analysis.avgOverrunPct > 0 && (
                  <li className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-amber-300">
                    Over-budget jobs exceed their budget by <strong>{analysis.avgOverrunPct.toFixed(0)}%</strong> on average. Focus on cost control for jobs above 80% utilization.
                  </li>
                )}
                {analysis.timeData.length > 0 && (
                  <li className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-amber-300">
                    <strong>{analysis.timeData[0].name}</strong> saw the highest overruns ({formatCurrency(analysis.timeData[0].value)} across {analysis.timeData[0].count} jobs). Review project scoping during this period.
                  </li>
                )}
                <li className="text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-blue-300">
                  Retrain the ML model from the <strong>Model Health</strong> tab to generate predictive feature importance data.
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm gap-1">
            <span>No feature data available</span>
            <span className="text-xs text-muted-foreground/70">Retrain the model from the Model Health tab to generate feature data</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
