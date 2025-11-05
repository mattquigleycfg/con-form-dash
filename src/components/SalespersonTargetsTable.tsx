import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Download, Users, Database } from "lucide-react";
import { useSalespersonTargets, SALESPEOPLE, SalespersonName } from "@/hooks/useSalespersonTargets";

type PeriodType = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export function SalespersonTargetsTable() {
  const [periodFilter, setPeriodFilter] = useState<PeriodType>('monthly');
  const [salespersonFilter, setSalespersonFilter] = useState<SalespersonName | 'all'>('all');
  
  const { targets, isLoading, generateTargetsFromMonthly, syncActualsFromOdoo, fetchTargets } = useSalespersonTargets({
    financialYear: 'FY25-26',
    periodType: periodFilter,
    salesperson: salespersonFilter === 'all' ? undefined : salespersonFilter,
  });

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateProgress = (actual: number | null, target: number) => {
    if (!actual || !target) return 0;
    return Math.min((actual / target) * 100, 100);
  };

  const getVarianceColor = (variance: number | null) => {
    if (!variance) return 'text-muted-foreground';
    return variance >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const handleGenerateTargets = async () => {
    await generateTargetsFromMonthly('FY25-26');
  };

  const handleSyncActuals = async () => {
    await syncActualsFromOdoo('FY25-26');
  };

  // Group targets by salesperson if showing all
  const groupedTargets = salespersonFilter === 'all'
    ? SALESPEOPLE.map(person => ({
        salesperson: person,
        targets: targets.filter(t => t.salesperson_name === person),
      }))
    : [{ salesperson: salespersonFilter, targets }];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Sales Person Targets
              </CardTitle>
              <CardDescription>
                Individual sales targets for Adam, Joel, and Mitch
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSyncActuals}>
                <Database className="h-4 w-4 mr-2" />
                Sync Actuals from Odoo
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerateTargets}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate from Team Targets
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Salesperson</label>
              <Select value={salespersonFilter} onValueChange={(v) => setSalespersonFilter(v as SalespersonName | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Salespeople</SelectItem>
                  {SALESPEOPLE.map(person => (
                    <SelectItem key={person} value={person}>{person}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading targets...</div>
          ) : targets.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No targets found for this period</p>
              <Button onClick={handleGenerateTargets}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Targets
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedTargets.map(({ salesperson, targets: personTargets }) => (
                <div key={salesperson}>
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {salesperson}
                      <Badge variant="outline">{personTargets.length} {periodFilter} periods</Badge>
                    </h3>
                  </div>
                  
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Sales Target</TableHead>
                          <TableHead className="text-right">Sales Actual</TableHead>
                          <TableHead className="text-right">Sales Variance</TableHead>
                          <TableHead className="w-[200px]">Progress</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {personTargets.map((target) => {
                          const salesProgress = calculateProgress(target.cfg_sales_actual, target.cfg_sales_target);
                          
                          return (
                            <TableRow key={target.id}>
                              <TableCell className="font-medium">
                                <div>
                                  <div>{target.period_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(target.period_start_date).toLocaleDateString()} - {new Date(target.period_end_date).toLocaleDateString()}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(target.cfg_sales_target)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(target.cfg_sales_actual)}
                              </TableCell>
                              <TableCell className={`text-right font-medium ${getVarianceColor(target.cfg_sales_variance)}`}>
                                {formatCurrency(target.cfg_sales_variance)}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <Progress value={salesProgress} className="h-2" />
                                  <div className="text-xs text-muted-foreground text-right">
                                    {salesProgress.toFixed(1)}%
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary Card */}
                  <Card className="mt-4 bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Total Target</div>
                          <div className="text-xl font-bold">
                            {formatCurrency(personTargets.reduce((sum, t) => sum + t.cfg_sales_target, 0))}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total Actual</div>
                          <div className="text-xl font-bold">
                            {formatCurrency(personTargets.reduce((sum, t) => sum + (t.cfg_sales_actual || 0), 0))}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total Variance</div>
                          <div className={`text-xl font-bold ${getVarianceColor(personTargets.reduce((sum, t) => sum + (t.cfg_sales_variance || 0), 0))}`}>
                            {formatCurrency(personTargets.reduce((sum, t) => sum + (t.cfg_sales_variance || 0), 0))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

