import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

export function YTDPerformanceChart() {
  const data = [
    { month: "Jul-24", target: 1900000, actual: 2200000 },
    { month: "Aug-24", target: 1900000, actual: 1600000 },
    { month: "Sep-24", target: 1900000, actual: 1400000 },
    { month: "Oct-24", target: 1900000, actual: 1400000 },
    { month: "Nov-24", target: 1900000, actual: 1500000 },
    { month: "Dec-24", target: 2000000, actual: 1100000 },
    { month: "Jan-25", target: 1400000, actual: 1100000 },
    { month: "Feb-25", target: 1200000, actual: 1500000 },
    { month: "Mar-25", target: 2100000, actual: 500400 },
    { month: "Apr-25", target: 2100000, actual: 2000000 },
    { month: "May-25", target: 2300000, actual: 1700000 },
    { month: "Jun-25", target: 2300000, actual: 1900000 },
    { month: "Jul-25", target: 1900000, actual: 1500000 },
    { month: "Aug-25", target: 2000000, actual: 1900000 },
    { month: "Sep-25", target: 2000000, actual: 2600000 },
    { month: "Oct-25", target: 2000000, actual: 690600 },
  ];

  const formatCurrency = (value: number) => {
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const variance = payload[1].value - payload[0].value;
      const variancePercent = ((variance / payload[0].value) * 100).toFixed(1);
      
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-lg">
          <p className="font-semibold text-foreground mb-2">{payload[0].payload.month}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Target: </span>
              <span className="font-medium text-primary">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Actual: </span>
              <span className="font-medium text-accent">{formatCurrency(payload[1].value)}</span>
            </p>
            <p className={`text-sm font-semibold ${variance >= 0 ? 'text-accent' : 'text-destructive'}`}>
              Variance: {variance >= 0 ? '+' : ''}{formatCurrency(variance)} ({variancePercent}%)
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>YTD Performance</span>
          <span className="text-sm font-normal text-muted-foreground">Target vs Actual</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart 
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <defs>
              <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.6}/>
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.2}/>
              </linearGradient>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
            <XAxis 
              dataKey="month" 
              angle={-45}
              textAnchor="end"
              height={80}
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" />
            <Bar 
              dataKey="target" 
              name="Target"
              fill="url(#colorTarget)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar 
              dataKey="actual" 
              name="Actual"
              fill="url(#colorActual)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
