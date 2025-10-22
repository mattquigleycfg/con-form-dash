import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar } from "lucide-react";

export function HuddleMetrics() {
  const metrics = {
    monthToDate: 691000,
    remainingToTarget: 1360000,
    monthTarget: 2050000,
    forecasted: 2810000,
    ytdVariance: -353800,
    invoiceMonthToDate: 735000,
    invoiceTarget: 1920000,
    actualYearToDate: 6621886,
    ytdBudget: 25000000,
    cfgSalesTotal: 614000,
    cfgTarget: 1900000,
    dsfSalesTotal: 77000,
    dsfTarget: 150000,
  };

  const cfgProgress = (metrics.cfgSalesTotal / metrics.cfgTarget) * 100;
  const dsfProgress = (metrics.dsfSalesTotal / metrics.dsfTarget) * 100;
  const ytdProgress = (metrics.actualYearToDate / metrics.ytdBudget) * 100;
  const monthProgress = (metrics.monthToDate / metrics.monthTarget) * 100;

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {/* Month Progress Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Month Progress</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-muted-foreground">Month to Date</span>
                <span className="text-2xl font-bold text-foreground">{formatCurrency(metrics.monthToDate)}</span>
              </div>
              <Progress value={monthProgress} className="h-2" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{monthProgress.toFixed(1)}% of target</span>
                <span>Target: {formatCurrency(metrics.monthTarget)}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Remaining</span>
                <span className="text-lg font-semibold text-foreground">{formatCurrency(metrics.remainingToTarget)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Forecasted</span>
              <span className="text-lg font-semibold text-accent flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {formatCurrency(metrics.forecasted)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* YTD Performance Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-accent/10 via-background to-background border-accent/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-semibold text-foreground">Year to Date</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-muted-foreground">Actual YTD</span>
                <span className="text-2xl font-bold text-foreground">{formatCurrency(metrics.actualYearToDate)}</span>
              </div>
              <Progress value={ytdProgress} className="h-2" />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{ytdProgress.toFixed(1)}% of budget</span>
                <span>Budget: {formatCurrency(metrics.ytdBudget)}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">YTD Variance</span>
                <span className={`text-lg font-semibold flex items-center gap-1 ${
                  metrics.ytdVariance < 0 ? 'text-destructive' : 'text-accent'
                }`}>
                  {metrics.ytdVariance < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                  {formatCurrency(metrics.ytdVariance)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Status Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-secondary/10 via-background to-background border-secondary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-secondary/10">
              <DollarSign className="h-5 w-5 text-secondary" />
            </div>
            <h3 className="font-semibold text-foreground">Invoice Status</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-muted-foreground">MTD Invoiced</span>
                <span className="text-2xl font-bold text-foreground">{formatCurrency(metrics.invoiceMonthToDate)}</span>
              </div>
              <Progress 
                value={(metrics.invoiceMonthToDate / metrics.invoiceTarget) * 100} 
                className="h-2"
              />
              <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                <span>{((metrics.invoiceMonthToDate / metrics.invoiceTarget) * 100).toFixed(1)}% of target</span>
                <span>Target: {formatCurrency(metrics.invoiceTarget)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CFG Sales Card */}
      <Card className="overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">CFG Sales</h3>
              <p className="text-xs text-muted-foreground">Con-form Division</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(metrics.cfgSalesTotal)}</span>
            </div>
            <div className="relative">
              <Progress value={cfgProgress} className="h-3" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground drop-shadow-md">
                  {cfgProgress.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target</span>
              <span className="font-semibold text-foreground">{formatCurrency(metrics.cfgTarget)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DSF Sales Card */}
      <Card className="overflow-hidden border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-background">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/20">
              <Target className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">DSF Sales</h3>
              <p className="text-xs text-muted-foreground">DiamondSteel Division</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-accent">{formatCurrency(metrics.dsfSalesTotal)}</span>
            </div>
            <div className="relative">
              <Progress value={dsfProgress} className="h-3" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground drop-shadow-md">
                  {dsfProgress.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target</span>
              <span className="font-semibold text-foreground">{formatCurrency(metrics.dsfTarget)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
