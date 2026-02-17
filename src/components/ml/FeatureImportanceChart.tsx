import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

export function FeatureImportanceChart({ models, modelName = "cost_predictor" }: FeatureImportanceChartProps) {
  const model = models.find((m) => m.model_name === modelName);
  const features = (model?.top_features || [])
    .slice(0, 10)
    .map((f) => ({
      name: FEATURE_LABELS[f.name] || (f.name || "unknown").replace(/_/g, " "),
      importance: Math.round(f.importance * 1000) / 10,
    }))
    .reverse();

  const title = MODEL_TITLES[modelName] || modelName.replace(/_/g, " ");

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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={features} layout="vertical" margin={{ top: 5, right: 30, left: 90, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={85} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
