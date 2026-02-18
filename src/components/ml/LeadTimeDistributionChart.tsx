import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { LeadTimeDistribution } from "@/hooks/useMLPredictions";

interface LeadTimeDistributionChartProps {
  data: LeadTimeDistribution[];
}

export function LeadTimeDistributionChart({ data }: LeadTimeDistributionChartProps) {
  const vendors = useMemo(() => data.map((d) => d.vendor_name), [data]);
  const [selectedVendor, setSelectedVendor] = useState<string>(vendors[0] ?? "");

  const activeDistribution = useMemo(
    () => data.find((d) => d.vendor_name === selectedVendor),
    [data, selectedVendor],
  );

  const chartData = useMemo(() => {
    if (!activeDistribution) return [];
    return activeDistribution.histogram.map((bin) => ({
      label: `${bin.bin_start}–${bin.bin_end}d`,
      count: bin.count,
    }));
  }, [activeDistribution]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Lead Time Distribution</CardTitle>
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
        {activeDistribution && (
          <p className="text-xs text-muted-foreground">
            Mean {activeDistribution.mean.toFixed(1)}d · Median {activeDistribution.median.toFixed(1)}d · P90 {activeDistribution.p90.toFixed(1)}d · {activeDistribution.sample_count} orders
          </p>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No distribution data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelFormatter={(label) => `Lead time: ${label}`}
                formatter={(value: number) => [value, "Orders"]}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
