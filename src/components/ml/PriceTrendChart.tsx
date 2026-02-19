import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { PriceTrend } from "@/hooks/useMLPredictions";

interface PriceTrendChartProps {
  data: PriceTrend[];
}

export function PriceTrendChart({ data }: PriceTrendChartProps) {
  const vendors = useMemo(() => data.map((d) => d.vendor_name), [data]);
  const [selectedVendor, setSelectedVendor] = useState<string>(vendors[0] ?? "");

  const activeTrend = useMemo(
    () => data.find((d) => d.vendor_name === selectedVendor),
    [data, selectedVendor],
  );

  const chartData = useMemo(() => {
    if (!activeTrend) return [];
    return activeTrend.data_points.map((dp) => ({
      date: new Date(dp.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      avg_price: dp.avg_price,
    }));
  }, [activeTrend]);

  const trendPct = activeTrend?.trend_pct ?? 0;
  const trendIsDown = trendPct < 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Price Trends</CardTitle>
            {activeTrend && (
              <Badge
                variant="outline"
                className={
                  trendIsDown
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]"
                    : "bg-red-500/10 text-red-600 border-red-200 text-[10px]"
                }
              >
                {trendIsDown ? (
                  <TrendingDown className="mr-0.5 h-3 w-3" />
                ) : (
                  <TrendingUp className="mr-0.5 h-3 w-3" />
                )}
                {trendPct >= 0 ? "+" : ""}
                {trendPct.toFixed(1)}%
              </Badge>
            )}
          </div>
          {vendors.length > 1 && (
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger className="h-7 w-[180px] text-xs">
                <SelectValue placeholder="Select vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((v) => (
                  <SelectItem key={v} value={v} className="text-xs">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {activeTrend && (
          <p className="text-xs text-muted-foreground">
            Avg ${(activeTrend.overall_avg ?? 0).toFixed(2)} · {activeTrend.months_of_data ?? 0} months of data
          </p>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No price trend data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Avg Price"]}
              />
              <Line
                type="monotone"
                dataKey="avg_price"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
