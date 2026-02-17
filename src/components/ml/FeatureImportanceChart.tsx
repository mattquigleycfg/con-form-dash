import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ModelHealthInfo } from "@/hooks/useMLPredictions";

interface FeatureImportanceChartProps {
  models: ModelHealthInfo[];
  modelName?: string;
}

const FEATURE_LABELS: Record<string, string> = {
  bom_avg_unit_cost: "Avg Unit Cost",
  nmc_total: "Non-Material Total",
  unique_products: "Unique Products",
  total_budget: "Total Budget",
  material_budget: "Material Budget",
  bom_total_quantity: "BOM Quantity",
  non_material_budget: "Non-Material Budget",
  bom_component_count: "BOM Components",
  bom_total_cost: "BOM Total Cost",
  material_line_count: "Material Lines",
  material_budget_ratio: "Material Ratio",
  budget_line_count: "Budget Lines",
  po_count: "PO Count",
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Feature Importance</CardTitle>
      </CardHeader>
      <CardContent>
        {features.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No feature data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={features} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
