import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { OverquoteSummary, ProductTypeStats } from "@/hooks/useInstallationAnalysis";

interface Props {
  summary: OverquoteSummary;
  byProductType: Record<string, ProductTypeStats>;
  lumpSumSoLines?: number;
  lumpSumPoLines?: number;
}

function ratioColor(ratio: number | null): string {
  if (ratio === null) return "text-muted-foreground";
  if (ratio > 1.5) return "text-destructive";
  if (ratio > 1.1) return "text-amber-500";
  return "text-green-600";
}

function ratioLabel(ratio: number | null): string {
  if (ratio === null) return "N/A";
  if (ratio > 1.5) return "Significant overquote";
  if (ratio > 1.1) return "Moderate overquote";
  if (ratio > 0.9) return "On target";
  return "Underquoted";
}

export function QuotedVsActualSummary({ summary, byProductType, lumpSumSoLines, lumpSumPoLines }: Props) {
  const byTypeChart = Object.entries(summary.avg_overquote_by_type || {}).map(
    ([type, ratio]) => ({ type, ratio: ratio ?? 0 })
  );
  const byStateChart = Object.entries(summary.avg_overquote_by_state || {}).map(
    ([state, ratio]) => ({ state, ratio: ratio ?? 0 })
  );

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Matched SO-PO Pairs</p>
            <p className="text-2xl font-bold">{summary.total_matched_orders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Overquote Ratio</p>
            <p className={`text-2xl font-bold ${ratioColor(summary.avg_overquote_ratio)}`}>
              {summary.avg_overquote_ratio !== null
                ? `${summary.avg_overquote_ratio.toFixed(2)}x`
                : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground">
              {ratioLabel(summary.avg_overquote_ratio)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">% Jobs Overquoted</p>
            <p className={`text-2xl font-bold ${
              (summary.pct_overquoted ?? 0) > 0.5 ? "text-destructive" : "text-green-600"
            }`}>
              {summary.pct_overquoted !== null
                ? `${(summary.pct_overquoted * 100).toFixed(0)}%`
                : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Excess Days</p>
            <p className="text-2xl font-bold text-destructive">
              {summary.total_overquoted_days > 0
                ? `+${summary.total_overquoted_days.toLocaleString()}`
                : summary.total_overquoted_days}
            </p>
            <p className="text-xs text-muted-foreground">days quoted above actual</p>
          </CardContent>
        </Card>
        {(lumpSumSoLines || lumpSumPoLines) ? (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Lump-Sum Inferred</p>
              <p className="text-2xl font-bold text-amber-500">
                {(lumpSumSoLines || 0) + (lumpSumPoLines || 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                {lumpSumSoLines || 0} SO &middot; {lumpSumPoLines || 0} PO lines
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {byTypeChart.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overquote Ratio by Product Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byTypeChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, "auto"]} />
                  <YAxis dataKey="type" type="category" width={60} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}x`, "Ratio"]} />
                  <Bar dataKey="ratio" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <div className="w-3 h-px bg-green-500" />
                <span>1.0x = perfectly quoted</span>
              </div>
            </CardContent>
          </Card>
        )}
        {byStateChart.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overquote Ratio by State</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byStateChart} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, "auto"]} />
                  <YAxis dataKey="state" type="category" width={40} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(2)}x`, "Ratio"]} />
                  <Bar dataKey="ratio" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
