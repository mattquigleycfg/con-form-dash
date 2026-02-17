import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Lightbulb } from "lucide-react";
import type { ModelHealthInfo } from "@/hooks/useMLPredictions";

interface FeatureImportanceChartProps {
  models: ModelHealthInfo[];
  modelName?: string;
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

export function FeatureImportanceChart({ models, modelName = "cost_predictor" }: FeatureImportanceChartProps) {
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Feature Importance — {title}</CardTitle>
        <CardDescription className="text-xs">
          Which data points influence {title.toLowerCase()} predictions the most
        </CardDescription>
      </CardHeader>
      <CardContent>
        {features.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-sm gap-1">
            <span>No feature data available</span>
            <span className="text-xs text-muted-foreground/70">Retrain the model from the Model Health tab to generate feature data</span>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
