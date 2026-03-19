import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { AnimatedTrendingUp, AnimatedTrendingDown } from '@/components/ui/animated-icon';
import { motion } from 'framer-motion';

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
  const utilizationPercent = totalBudget > 0
    ? (totalActual / totalBudget) * 100
    : (totalActual > 0 ? 100 : 0);
  const remaining = Math.max(0, totalBudget - totalActual);
  const materialUtilization = materialBudget > 0
    ? (materialActual / materialBudget) * 100
    : (materialActual > 0 ? 100 : 0);
  const nonMaterialUtilization = nonMaterialBudget > 0
    ? (nonMaterialActual / nonMaterialBudget) * 100
    : (nonMaterialActual > 0 ? 100 : 0);

  // Edge case flags: budget is zero but there are actual costs
  const isNoBudget = totalBudget === 0 && totalActual > 0;
  const isMaterialNoBudget = materialBudget === 0 && materialActual > 0;
  const isNonMaterialNoBudget = nonMaterialBudget === 0 && nonMaterialActual > 0;

  const getColor = (percent: number) => {
    if (percent > 100) return '#ef4444'; // red - over budget
    if (percent > 80) return '#f59e0b'; // yellow - at risk
    return '#10b981'; // green - on track
  };

  const mainColor = isNoBudget ? '#ef4444' : getColor(utilizationPercent);
  const materialColor = isMaterialNoBudget ? '#ef4444' : getColor(materialUtilization);
  const nonMaterialColor = isNonMaterialNoBudget ? '#ef4444' : getColor(nonMaterialUtilization);

  const mainData = isNoBudget
    ? [
        { name: 'Spent', value: totalActual },
        { name: 'Remaining', value: 0 },
      ]
    : [
        { name: 'Spent', value: Math.min(totalActual, totalBudget) },
        { name: 'Remaining', value: remaining },
      ];

  // If over budget (and budget > 0), show overspend slice
  if (!isNoBudget && totalActual > totalBudget) {
    mainData[0].value = totalBudget;
    mainData.push({ name: 'Over Budget', value: totalActual - totalBudget });
  }

  const materialData = isMaterialNoBudget
    ? [
        { name: 'Spent', value: materialActual },
        { name: 'Remaining', value: 0 },
      ]
    : [
        { name: 'Spent', value: Math.min(materialActual, materialBudget) },
        { name: 'Remaining', value: Math.max(0, materialBudget - materialActual) },
      ];

  const nonMaterialData = isNonMaterialNoBudget
    ? [
        { name: 'Spent', value: nonMaterialActual },
        { name: 'Remaining', value: 0 },
      ]
    : [
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

  const isOverBudget = utilizationPercent > 100 || isNoBudget;

  return (
    <div className="w-full bg-gradient-to-br from-background to-accent/5 rounded-xl border shadow-sm p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        {/* Main Circle Chart */}
        <div className="lg:col-span-1 flex flex-col items-center group">
          <h3 className="text-label-lg uppercase tracking-wider text-muted-foreground mb-4">Overall Budget Status</h3>
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
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center px-12 py-10"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="text-center space-y-2">
                {isNoBudget ? (
                  <>
                    <div className="text-label-lg font-semibold text-destructive">No Budget Set</div>
                    <div className="text-headline-sm font-bold text-destructive">
                      {formatCurrency(totalActual)}
                    </div>
                    <div className="text-label-md uppercase tracking-widest text-muted-foreground">
                      Spent
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`flex items-baseline justify-center gap-0.5 ${isOverBudget ? 'text-destructive' : 'text-foreground'} transition-colors duration-200`}>
                      <span className="text-display-sm font-bold tracking-tight tabular-nums">
                        {utilizationPercent.toFixed(1)}
                      </span>
                      <span className="text-headline-sm font-semibold">%</span>
                    </div>
                    <div className="text-label-lg font-medium text-muted-foreground">
                      {isOverBudget ? 'Over Budget' : 'Utilized'}
                    </div>
                    <div className={`text-title-lg font-bold ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                      {formatCurrency(isOverBudget ? totalActual - totalBudget : remaining)}
                    </div>
                    <div className="text-label-md uppercase tracking-widest text-muted-foreground">
                      {isOverBudget ? 'Overspend' : 'Remaining'}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Budget Summary */}
          <div className="mt-6 space-y-2.5 w-full max-w-[360px] bg-muted/40 rounded-lg px-4 py-3">
            <div className="flex justify-between items-center">
              <span className="text-label-lg text-muted-foreground uppercase tracking-wide">Budget</span>
              <span className="font-bold text-title-lg tabular-nums">{formatCurrency(totalBudget)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-label-lg text-muted-foreground uppercase tracking-wide">Actual</span>
              <span className={`font-bold text-title-lg tabular-nums ${isOverBudget ? 'text-destructive' : ''}`}>
                {formatCurrency(totalActual)}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown Section */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Materials Breakdown */}
          <motion.div
            className="flex flex-col items-center p-5 rounded-xl bg-background border"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
          >
            <h4 className="text-label-lg uppercase tracking-wider text-muted-foreground mb-3">Materials</h4>
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
                  {isMaterialNoBudget ? (
                    <div className="text-label-md font-semibold text-destructive">No Budget</div>
                  ) : (
                    <div className="text-headline-sm font-bold tabular-nums" style={{ color: materialColor }}>
                      {materialUtilization.toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 w-full">
              <div className="flex justify-between items-center">
                <span className="text-label-lg text-muted-foreground">Budget</span>
                <span className={`text-body-sm font-semibold tabular-nums ${isMaterialNoBudget ? 'text-destructive' : ''}`}>
                  {formatCurrency(materialBudget)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-label-lg text-muted-foreground">Actual</span>
                <span className={`text-body-sm font-semibold tabular-nums ${materialUtilization > 100 || isMaterialNoBudget ? 'text-destructive' : ''}`}>
                  {formatCurrency(materialActual)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-border/50">
                <span className="text-label-lg text-muted-foreground">Remaining</span>
                <span className={`text-body-sm font-semibold tabular-nums ${materialUtilization > 100 || isMaterialNoBudget ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(Math.max(0, materialBudget - materialActual))}
                </span>
              </div>
            </div>

            {(materialUtilization > 100 || isMaterialNoBudget) && materialActual > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-label-lg text-destructive">
                <AnimatedTrendingUp size={14} />
                <span>{isMaterialNoBudget ? `${formatCurrency(materialActual)} spent` : `${formatCurrency(materialActual - materialBudget)} over`}</span>
              </div>
            )}
          </motion.div>

          {/* Services Breakdown */}
          <motion.div
            className="flex flex-col items-center p-5 rounded-xl bg-background border"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.65, ease: [0.4, 0, 0.2, 1] }}
          >
            <h4 className="text-label-lg uppercase tracking-wider text-muted-foreground mb-3">Services</h4>
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
                  {isNonMaterialNoBudget ? (
                    <div className="text-label-md font-semibold text-destructive">No Budget</div>
                  ) : (
                    <div className="text-headline-sm font-bold tabular-nums" style={{ color: nonMaterialColor }}>
                      {nonMaterialUtilization.toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2 w-full">
              <div className="flex justify-between items-center">
                <span className="text-label-lg text-muted-foreground">Budget</span>
                <span className={`text-body-sm font-semibold tabular-nums ${isNonMaterialNoBudget ? 'text-destructive' : ''}`}>
                  {formatCurrency(nonMaterialBudget)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-label-lg text-muted-foreground">Actual</span>
                <span className={`text-body-sm font-semibold tabular-nums ${nonMaterialUtilization > 100 || isNonMaterialNoBudget ? 'text-destructive' : ''}`}>
                  {formatCurrency(nonMaterialActual)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-border/50">
                <span className="text-label-lg text-muted-foreground">Remaining</span>
                <span className={`text-body-sm font-semibold tabular-nums ${nonMaterialUtilization > 100 || isNonMaterialNoBudget ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(Math.max(0, nonMaterialBudget - nonMaterialActual))}
                </span>
              </div>
            </div>

            {(nonMaterialUtilization > 100 || isNonMaterialNoBudget) && nonMaterialActual > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-label-lg text-destructive">
                <AnimatedTrendingUp size={14} />
                <span>{isNonMaterialNoBudget ? `${formatCurrency(nonMaterialActual)} spent` : `${formatCurrency(nonMaterialActual - nonMaterialBudget)} over`}</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

