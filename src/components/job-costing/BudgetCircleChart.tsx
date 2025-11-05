import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface BudgetCircleChartProps {
  totalBudget: number;
  totalActual: number;
  materialBudget: number;
  materialActual: number;
  nonMaterialBudget: number;
  nonMaterialActual: number;
}

export function BudgetCircleChart({
  totalBudget,
  totalActual,
  materialBudget,
  materialActual,
  nonMaterialBudget,
  nonMaterialActual,
}: BudgetCircleChartProps) {
  const utilizationPercent = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const remaining = Math.max(0, totalBudget - totalActual);
  const materialUtilization = materialBudget > 0 ? (materialActual / materialBudget) * 100 : 0;
  const nonMaterialUtilization = nonMaterialBudget > 0 ? (nonMaterialActual / nonMaterialBudget) * 100 : 0;

  const getColor = (percent: number) => {
    if (percent > 100) return '#ef4444'; // red - over budget
    if (percent > 80) return '#f59e0b'; // yellow - at risk
    return '#10b981'; // green - on track
  };

  const mainColor = getColor(utilizationPercent);
  const materialColor = getColor(materialUtilization);
  const nonMaterialColor = getColor(nonMaterialUtilization);

  const mainData = [
    { name: 'Spent', value: Math.min(totalActual, totalBudget) },
    { name: 'Remaining', value: remaining },
  ];

  // If over budget, show overspend
  if (totalActual > totalBudget) {
    mainData[0].value = totalBudget;
    mainData.push({ name: 'Over Budget', value: totalActual - totalBudget });
  }

  const materialData = [
    { name: 'Spent', value: Math.min(materialActual, materialBudget) },
    { name: 'Remaining', value: Math.max(0, materialBudget - materialActual) },
  ];

  const nonMaterialData = [
    { name: 'Spent', value: Math.min(nonMaterialActual, nonMaterialBudget) },
    { name: 'Remaining', value: Math.max(0, nonMaterialBudget - nonMaterialActual) },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isOverBudget = utilizationPercent > 100;

  return (
    <div className="w-full bg-gradient-to-br from-background to-accent/5 rounded-lg border shadow-sm p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        {/* Main Circle Chart */}
        <div className="lg:col-span-1 flex flex-col items-center group">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Overall Budget Status</h3>
          <div className="relative transition-all duration-300 ease-out group-hover:scale-[1.03] group-hover:shadow-lg group-hover:shadow-primary/10 rounded-full">
            <ResponsiveContainer width={360} height={360}>
              <PieChart>
                <Pie
                  data={mainData}
                  cx={180}
                  cy={180}
                  innerRadius={110}
                  outerRadius={150}
                  dataKey="value"
                  isAnimationActive={true}
                  animationDuration={800}
                  animationBegin={0}
                  animationEasing="ease-out"
                >
                  <Cell fill={mainColor} />
                  <Cell fill={isOverBudget ? '#fca5a5' : '#e5e7eb'} />
                  {isOverBudget && <Cell fill="#dc2626" />}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in duration-400 delay-200 px-12 py-10">
              <div className="text-center space-y-3">
                <div className={`flex items-baseline justify-center gap-1 ${isOverBudget ? 'text-destructive' : 'text-foreground'} transition-colors duration-200`}>
                  <span className="text-4xl font-bold tracking-tight">
                    {utilizationPercent.toFixed(1)}
                  </span>
                  <span className="text-2xl font-semibold">%</span>
                </div>
                <div className="text-sm font-medium text-muted-foreground">
                  {isOverBudget ? 'Over Budget' : 'Utilized'}
                </div>
                <div className={`text-xl font-semibold ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(isOverBudget ? totalActual - totalBudget : remaining)}
                </div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {isOverBudget ? 'Overspend' : 'Remaining'}
                </div>
              </div>
            </div>
          </div>

          {/* Budget Summary */}
          <div className="mt-6 space-y-3 w-full max-w-[360px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-base">Budget:</span>
              <span className="font-bold text-xl">{formatCurrency(totalBudget)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-base">Actual:</span>
              <span className={`font-bold text-xl ${isOverBudget ? 'text-destructive' : ''}`}>
                {formatCurrency(totalActual)}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown Section */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Materials Breakdown */}
          <div className="flex flex-col items-center p-4 rounded-lg bg-background border animate-in fade-in duration-600 delay-400">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Materials</h4>
            <div className="relative">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={materialData}
                    cx={80}
                    cy={80}
                    innerRadius={45}
                    outerRadius={65}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={800}
                    animationBegin={200}
                    animationEasing="ease-out"
                  >
                    <Cell fill={materialColor} />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: materialColor }}>
                    {materialUtilization.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1 w-full">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-medium">{formatCurrency(materialBudget)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Actual:</span>
                <span className={`font-medium ${materialUtilization > 100 ? 'text-destructive' : ''}`}>
                  {formatCurrency(materialActual)}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">Remaining:</span>
                <span className={`font-medium ${materialUtilization > 100 ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(Math.max(0, materialBudget - materialActual))}
                </span>
              </div>
            </div>

            {materialUtilization > 100 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                <TrendingUp className="h-3 w-3" />
                <span>{formatCurrency(materialActual - materialBudget)} over</span>
              </div>
            )}
          </div>

          {/* Services Breakdown */}
          <div className="flex flex-col items-center p-4 rounded-lg bg-background border animate-in fade-in duration-600 delay-600">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Services</h4>
            <div className="relative">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={nonMaterialData}
                    cx={80}
                    cy={80}
                    innerRadius={45}
                    outerRadius={65}
                    dataKey="value"
                    isAnimationActive={true}
                    animationDuration={800}
                    animationBegin={400}
                    animationEasing="ease-out"
                  >
                    <Cell fill={nonMaterialColor} />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: nonMaterialColor }}>
                    {nonMaterialUtilization.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1 w-full">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-medium">{formatCurrency(nonMaterialBudget)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Actual:</span>
                <span className={`font-medium ${nonMaterialUtilization > 100 ? 'text-destructive' : ''}`}>
                  {formatCurrency(nonMaterialActual)}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">Remaining:</span>
                <span className={`font-medium ${nonMaterialUtilization > 100 ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(Math.max(0, nonMaterialBudget - nonMaterialActual))}
                </span>
              </div>
            </div>

            {nonMaterialUtilization > 100 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
                <TrendingUp className="h-3 w-3" />
                <span>{formatCurrency(nonMaterialActual - nonMaterialBudget)} over</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

