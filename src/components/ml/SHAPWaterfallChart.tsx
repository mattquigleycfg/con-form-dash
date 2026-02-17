import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface FeatureContribution {
  feature: string;
  value: number;
  direction?: string;
  shap_value?: number;
  importance?: number;
  z_score?: number;
}

interface SHAPWaterfallChartProps {
  features: FeatureContribution[];
  title?: string;
}

const FEATURE_LABELS: Record<string, string> = {
  bom_avg_unit_cost: "Avg Unit Cost",
  material_budget_ratio: "Material Ratio",
  budget_utilization: "Budget Used",
  total_variance_pct: "Total Variance",
  material_variance_pct: "Material Variance",
  non_material_variance_pct: "Non-Mat Variance",
  variance_imbalance: "Variance Imbalance",
  total_budget: "Total Budget",
  material_budget: "Material Budget",
  po_count: "PO Count",
  unique_vendors: "Vendors",
  nmc_entry_count: "NMC Entries",
};

export function SHAPWaterfallChart({ features, title = "Feature Contributions" }: SHAPWaterfallChartProps) {
  const chartData = features
    .slice(0, 8)
    .map((f) => ({
      name: FEATURE_LABELS[f.feature] || (f.feature || "unknown").replace(/_/g, " "),
      value: f.shap_value ?? f.z_score ?? f.importance ?? 0,
      direction: f.direction || (f.shap_value && f.shap_value > 0 ? "increases_risk" : "decreases_risk"),
    }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">No feature data</div>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={75} />
              <Tooltip formatter={(v: number) => v.toFixed(3)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.direction === "increases_risk" || entry.direction === "above" ? "#ef4444" : "#22c55e"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
