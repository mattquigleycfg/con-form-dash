import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import type { DemandAnalytics } from "@/hooks/useMLPredictions";

interface DemandForecastChartProps {
  data: DemandAnalytics;
}

const METHOD_COLORS: Record<string, string> = {
  holt_winters: "bg-purple-500/10 text-purple-600 border-purple-200",
  moving_average: "bg-blue-500/10 text-blue-600 border-blue-200",
  exponential_smoothing: "bg-teal-500/10 text-teal-600 border-teal-200",
  naive: "bg-slate-500/10 text-slate-600 border-slate-200",
  linear_regression: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
};

const METHOD_LABELS: Record<string, string> = {
  holt_winters: "Holt-Winters",
  moving_average: "Moving Avg",
  exponential_smoothing: "Exp. Smoothing",
  naive: "Naive",
  linear_regression: "Linear Regression",
};

export function DemandForecastChart({ data }: DemandForecastChartProps) {
  const chartData = useMemo(() => {
    const historyPoints = (data.history || []).map((h) => ({
      date: h.date,
      history: h.quantity,
      predicted: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
    }));

    const forecastPoints = (data.forecast || []).map((f) => ({
      date: f.date,
      history: null as number | null,
      predicted: f.predicted_quantity,
      lower: f.lower_bound,
      upper: f.upper_bound,
    }));

    return [...historyPoints, ...forecastPoints];
  }, [data.history, data.forecast]);

  const trendIcon = () => {
    if (data.trend_direction === "up") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (data.trend_direction === "down") return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const formatDate = (val: string) => {
    if (!val) return "";
    const d = new Date(val);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">{data.product_name}</CardTitle>
              <Badge
                variant="outline"
                className={`text-[10px] ${METHOD_COLORS[data.method] || ""}`}
              >
                {METHOD_LABELS[data.method] || data.method}
              </Badge>
            </div>
            <CardDescription className="text-xs flex items-center gap-2">
              <span>CV: {data.cv.toFixed(2)}</span>
              {data.high_variability && (
                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200">
                  High Variability
                </Badge>
              )}
              {data.seasonality?.is_seasonal && (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                  Seasonal
                </Badge>
              )}
              <span className="flex items-center gap-1">
                {trendIcon()}
                <span className="capitalize">{data.trend_direction}</span>
              </span>
            </CardDescription>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
            No forecast data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 9 }}
                angle={-35}
                textAnchor="end"
                height={40}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                content={({ payload, label }) => {
                  if (!payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm space-y-1">
                      <p className="font-semibold text-foreground">{label}</p>
                      <div className="space-y-0.5 pt-1 border-t">
                        {d.history != null && (
                          <p className="text-xs">
                            <span className="text-blue-500">Historical: </span>
                            {d.history.toLocaleString()}
                          </p>
                        )}
                        {d.predicted != null && (
                          <>
                            <p className="text-xs">
                              <span style={{ color: "hsl(var(--primary))" }}>Forecast: </span>
                              {d.predicted.toLocaleString()}
                            </p>
                            {d.lower != null && d.upper != null && (
                              <p className="text-xs text-muted-foreground">
                                Range: {d.lower.toLocaleString()} – {d.upper.toLocaleString()}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                dataKey="upper"
                stroke="none"
                fill="hsl(var(--primary))"
                fillOpacity={0.1}
                name="Confidence Band"
                connectNulls={false}
              />
              <Area
                dataKey="lower"
                stroke="none"
                fill="white"
                fillOpacity={1}
                name=" "
                legendType="none"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="history"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 2 }}
                name="Historical"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 2 }}
                name="Forecast"
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
