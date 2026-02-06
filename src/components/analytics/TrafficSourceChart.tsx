import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { type TrafficSourceData } from "@/hooks/useWebsiteAnalytics";
import { Skeleton } from "@/components/ui/skeleton";

interface TrafficSourceChartProps {
  data: TrafficSourceData[];
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function TrafficSourceChart({
  data,
  isLoading,
  title = "Traffic Sources",
  description = "Sessions by source and medium",
}: TrafficSourceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            No traffic source data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for pie chart
  const chartData = data.map(item => ({
    name: `${item.source} / ${item.medium}`,
    value: item.sessions,
    percentage: 0, // Will calculate below
  }));

  // Calculate percentages
  const totalSessions = chartData.reduce((sum, item) => sum + item.value, 0);
  chartData.forEach(item => {
    item.percentage = totalSessions > 0 ? (item.value / totalSessions) * 100 : 0;
  });

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              formatter={(value: number, name: string) => {
                const item = chartData.find(d => d.name === name);
                return [
                  `${value.toLocaleString()} sessions (${item?.percentage.toFixed(1)}%)`,
                  name
                ];
              }}
            />
            <Legend 
              verticalAlign="bottom"
              height={36}
              formatter={(value) => {
                // Shorten long source names
                return value.length > 25 ? value.substring(0, 22) + '...' : value;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
