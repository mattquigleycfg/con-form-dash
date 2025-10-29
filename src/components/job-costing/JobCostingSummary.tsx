import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SaleOrderLine } from '@/hooks/useOdooSaleOrderLines';

interface JobCostingSummaryProps {
  lines: SaleOrderLine[];
}

export function JobCostingSummary({ lines }: JobCostingSummaryProps) {
  const summary = useMemo(() => {
    const materialLines = lines.filter(l => l.is_material);
    const serviceLines = lines.filter(l => !l.is_material);
    
    const materialRevenue = materialLines.reduce((sum, l) => sum + l.price_subtotal, 0);
    const materialCost = materialLines.reduce((sum, l) => sum + l.total_cost, 0);
    const materialMargin = materialRevenue - materialCost;
    const materialMarginPercent = materialRevenue > 0 ? (materialMargin / materialRevenue) * 100 : 0;
    
    const serviceRevenue = serviceLines.reduce((sum, l) => sum + l.price_subtotal, 0);
    const serviceCost = serviceLines.reduce((sum, l) => sum + l.total_cost, 0);
    const serviceMargin = serviceRevenue - serviceCost;
    const serviceMarginPercent = serviceRevenue > 0 ? (serviceMargin / serviceRevenue) * 100 : 0;
    
    const totalRevenue = materialRevenue + serviceRevenue;
    const totalCost = materialCost + serviceCost;
    const totalMargin = totalRevenue - totalCost;
    const totalMarginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    
    return {
      materialLines,
      serviceLines,
      materialRevenue,
      materialCost,
      materialMargin,
      materialMarginPercent,
      serviceRevenue,
      serviceCost,
      serviceMargin,
      serviceMarginPercent,
      totalRevenue,
      totalCost,
      totalMargin,
      totalMarginPercent
    };
  }, [lines]);
  
  const formatCurrency = (amount: number) => amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Material Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${formatCurrency(summary.materialCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.materialLines.length} items
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Service Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${formatCurrency(summary.serviceCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.serviceLines.length} items
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatCurrency(summary.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of ${formatCurrency(summary.totalRevenue)} revenue
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.totalMarginPercent.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${formatCurrency(summary.totalMargin)}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {summary.materialLines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Material Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.materialLines.map(line => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">
                      {line.product_id[1]}
                      {line.default_code && (
                        <span className="text-xs text-muted-foreground ml-2">
                          [{line.default_code}]
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={line.detailed_type === 'consu' ? 'secondary' : 'outline'}>
                        {line.detailed_type === 'consu' ? 'Consumable' : 'Storable'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {line.product_uom_qty}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-orange-600">
                      ${formatCurrency(line.actual_cost)}
                      {!line.purchase_price && line.actual_cost > 0 && (
                        <span className="text-xs text-muted-foreground ml-1" title="Using standard product cost">
                          *
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${formatCurrency(line.total_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${formatCurrency(line.price_subtotal)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      line.margin_percent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {line.margin_percent.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold">
                  <TableCell colSpan={4}>MATERIAL SUBTOTAL</TableCell>
                  <TableCell className="text-right text-orange-600">
                    ${formatCurrency(summary.materialCost)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${formatCurrency(summary.materialRevenue)}
                  </TableCell>
                  <TableCell className={`text-right ${
                    summary.materialMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {summary.materialMarginPercent.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      {summary.serviceLines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Service / Labor Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.serviceLines.map(line => (
                  <TableRow key={line.id}>
                    <TableCell className="font-medium">
                      {line.product_id[1]}
                    </TableCell>
                    <TableCell className="text-right">
                      {line.product_uom_qty}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">
                      ${formatCurrency(line.actual_cost)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${formatCurrency(line.total_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${formatCurrency(line.price_subtotal)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      line.margin_percent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {line.margin_percent.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold">
                  <TableCell colSpan={3}>SERVICE SUBTOTAL</TableCell>
                  <TableCell className="text-right text-blue-600">
                    ${formatCurrency(summary.serviceCost)}
                  </TableCell>
                  <TableCell className="text-right">
                    ${formatCurrency(summary.serviceRevenue)}
                  </TableCell>
                  <TableCell className={`text-right ${
                    summary.serviceMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {summary.serviceMarginPercent.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      
      <Card className="border-2 border-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>TOTAL JOB COST</span>
            <div className="flex gap-8">
              <span>${formatCurrency(summary.totalCost)}</span>
              <span>${formatCurrency(summary.totalRevenue)}</span>
              <span className={summary.totalMarginPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                {summary.totalMarginPercent.toFixed(1)}% (${formatCurrency(summary.totalMargin)})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {lines.some(l => l.actual_cost === 0) && (
        <Card className="border-yellow-500">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-600 font-semibold">
              ⚠️ Some line items have zero cost. Check console for details.
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>The <code>purchase_price</code> field may not be set on sale order lines</li>
              <li>Product <code>standard_price</code> (cost) may not be configured</li>
              <li>Enable "Sale Purchase" module in Odoo to track actual costs</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
