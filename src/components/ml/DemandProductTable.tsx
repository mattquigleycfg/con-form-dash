import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpDown, TrendingUp, TrendingDown, Minus, Leaf, BarChart3 } from "lucide-react";
import type { DemandAnalytics } from "@/hooks/useMLPredictions";

interface DemandProductTableProps {
  data: DemandAnalytics[];
  onSelectProduct: (productId: string) => void;
}

type SortKey =
  | "product_name"
  | "method"
  | "avg_historical"
  | "total_forecasted"
  | "cv"
  | "high_variability"
  | "trend_direction"
  | "seasonality";

const METHOD_LABELS: Record<string, string> = {
  holt_winters: "Holt-Winters",
  moving_average: "Moving Avg",
  exponential_smoothing: "Exp. Smoothing",
  naive: "Naive",
  linear_regression: "Linear Reg.",
};

export function DemandProductTable({ data, onSelectProduct }: DemandProductTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("total_forecasted");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = useMemo(() => {
    const items = [...data];
    items.sort((a, b) => {
      const mult = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "product_name":
          return a.product_name.localeCompare(b.product_name) * mult;
        case "method":
          return a.method.localeCompare(b.method) * mult;
        case "avg_historical":
          return (a.avg_historical - b.avg_historical) * mult;
        case "total_forecasted":
          return (a.total_forecasted - b.total_forecasted) * mult;
        case "cv":
          return (a.cv - b.cv) * mult;
        case "high_variability":
          return ((a.high_variability ? 1 : 0) - (b.high_variability ? 1 : 0)) * mult;
        case "trend_direction": {
          const order: Record<string, number> = { up: 2, flat: 1, down: 0 };
          return ((order[a.trend_direction] ?? 1) - (order[b.trend_direction] ?? 1)) * mult;
        }
        case "seasonality":
          return (
            ((a.seasonality?.is_seasonal ? 1 : 0) - (b.seasonality?.is_seasonal ? 1 : 0)) * mult
          );
        default:
          return 0;
      }
    });
    return items.slice(0, 50);
  }, [data, sortKey, sortDir]);

  const summaryStats = useMemo(() => {
    const highVar = data.filter((d) => d.high_variability).length;
    const seasonal = data.filter((d) => d.seasonality?.is_seasonal).length;
    return { highVar, seasonal };
  }, [data]);

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto p-0 font-medium text-xs"
      onClick={() => toggleSort(field)}
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  const trendIcon = (dir: string) => {
    if (dir === "up") return <TrendingUp className="h-3 w-3 text-emerald-500" />;
    if (dir === "down") return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Demand Forecast Summary
            </CardTitle>
            <CardDescription className="text-xs">
              {data.length} products —{" "}
              {summaryStats.highVar > 0 && (
                <span className="text-amber-600">{summaryStats.highVar} high variability</span>
              )}
              {summaryStats.highVar > 0 && summaryStats.seasonal > 0 && ", "}
              {summaryStats.seasonal > 0 && (
                <span className="text-emerald-600">{summaryStats.seasonal} seasonal</span>
              )}
              {summaryStats.highVar === 0 && summaryStats.seasonal === 0 && "all stable"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            No demand data available
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">
                    <SortHeader label="Product" field="product_name" />
                  </TableHead>
                  <TableHead className="text-xs">
                    <SortHeader label="Method" field="method" />
                  </TableHead>
                  <TableHead className="text-xs">
                    <SortHeader label="Avg Hist." field="avg_historical" />
                  </TableHead>
                  <TableHead className="text-xs">
                    <SortHeader label="Total Forecast" field="total_forecasted" />
                  </TableHead>
                  <TableHead className="text-xs">
                    <SortHeader label="CV" field="cv" />
                  </TableHead>
                  <TableHead className="text-xs">
                    <SortHeader label="Variability" field="high_variability" />
                  </TableHead>
                  <TableHead className="text-xs">
                    <SortHeader label="Trend" field="trend_direction" />
                  </TableHead>
                  <TableHead className="text-xs">
                    <SortHeader label="Seasonality" field="seasonality" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d) => (
                  <TableRow
                    key={d.product_id}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onSelectProduct(d.product_id)}
                  >
                    <TableCell className="text-xs font-medium max-w-[200px] truncate">
                      {d.product_name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {METHOD_LABELS[d.method] || d.method}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.avg_historical.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {d.total_forecasted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          d.cv > 0.5
                            ? "bg-red-500/10 text-red-600 border-red-200"
                            : "bg-slate-500/10 text-slate-600 border-slate-200"
                        }`}
                      >
                        {d.cv.toFixed(2)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.high_variability ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200"
                        >
                          High
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Normal</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        {trendIcon(d.trend_direction)}
                        <span className="capitalize text-[10px] text-muted-foreground">
                          {d.trend_direction}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.seasonality?.is_seasonal ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200"
                        >
                          <Leaf className="h-2.5 w-2.5 mr-1" />
                          Seasonal
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
