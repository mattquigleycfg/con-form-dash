import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, X, TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";
import { MonthlyTarget } from "@/hooks/useMonthlyTargets";

interface MonthlyTargetsTableProps {
  targets: MonthlyTarget[];
  onUpdate: (id: string, data: Partial<MonthlyTarget>) => void;
}

export function MonthlyTargetsTable({ targets, onUpdate }: MonthlyTargetsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<MonthlyTarget>>({});

  const startEdit = (target: MonthlyTarget) => {
    setEditingId(target.id);
    setEditData({
      cfg_sales_target: target.cfg_sales_target,
      cfg_invoice_target: target.cfg_invoice_target,
      dsf_sales_target: target.dsf_sales_target,
      dsf_invoice_target: target.dsf_invoice_target,
      notes: target.notes,
    });
  };

  const saveEdit = () => {
    if (editingId) {
      onUpdate(editingId, editData);
      setEditingId(null);
      setEditData({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const getVarianceBadge = (variance: number | null) => {
    if (variance === null || variance === undefined) return null;
    const isPositive = variance >= 0;
    return (
      <Badge 
        variant={isPositive ? "default" : "destructive"}
        className="flex items-center gap-1"
      >
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {formatCurrency(Math.abs(variance))}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Targets & Actuals</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {targets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No monthly targets found. Click "Seed FY25-26" to import data from Excel.
          </div>
        ) : (
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className="border-r font-semibold">Month</TableHead>
              <TableHead colSpan={3} className="border-r text-center bg-primary/5 font-semibold">
                Con-form Division (CFG)
              </TableHead>
              <TableHead colSpan={3} className="border-r text-center bg-accent/5 font-semibold">
                DiamondSteel Division (DSF)
              </TableHead>
              <TableHead colSpan={2} className="border-r text-center bg-secondary/5 font-semibold">
                Totals
              </TableHead>
              <TableHead rowSpan={2}>Actions</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="text-xs">Sales Target</TableHead>
              <TableHead className="text-xs">Invoice Target</TableHead>
              <TableHead className="border-r text-xs">Actual</TableHead>
              <TableHead className="text-xs">Sales Target</TableHead>
              <TableHead className="text-xs">Invoice Target</TableHead>
              <TableHead className="border-r text-xs">Actual</TableHead>
              <TableHead className="text-xs">Sales</TableHead>
              <TableHead className="border-r text-xs">Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {targets.map((target) => (
              <TableRow key={target.id} className="hover:bg-muted/50">
                <TableCell className="border-r font-medium">{target.month}</TableCell>
                
                {/* CFG Sales Target */}
                <TableCell>
                  {editingId === target.id ? (
                    <Input
                      type="number"
                      value={editData.cfg_sales_target || 0}
                      onChange={(e) => setEditData({ ...editData, cfg_sales_target: Number(e.target.value) })}
                      className="w-24"
                    />
                  ) : (
                    <span className="text-primary font-medium">{formatCurrency(target.cfg_sales_target)}</span>
                  )}
                </TableCell>
                
                {/* CFG Invoice Target */}
                <TableCell>
                  {editingId === target.id ? (
                    <Input
                      type="number"
                      value={editData.cfg_invoice_target || 0}
                      onChange={(e) => setEditData({ ...editData, cfg_invoice_target: Number(e.target.value) })}
                      className="w-24"
                    />
                  ) : (
                    <span className="text-primary font-medium">{formatCurrency(target.cfg_invoice_target)}</span>
                  )}
                </TableCell>
                
                {/* CFG Actual & Variance */}
                <TableCell className="border-r">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">{formatCurrency(target.cfg_sales_actual)}</span>
                    {getVarianceBadge(target.cfg_sales_variance)}
                  </div>
                </TableCell>
                
                {/* DSF Sales Target */}
                <TableCell>
                  {editingId === target.id ? (
                    <Input
                      type="number"
                      value={editData.dsf_sales_target || 0}
                      onChange={(e) => setEditData({ ...editData, dsf_sales_target: Number(e.target.value) })}
                      className="w-24"
                    />
                  ) : (
                    <span className="text-accent font-medium">{formatCurrency(target.dsf_sales_target)}</span>
                  )}
                </TableCell>
                
                {/* DSF Invoice Target */}
                <TableCell>
                  {editingId === target.id ? (
                    <Input
                      type="number"
                      value={editData.dsf_invoice_target || 0}
                      onChange={(e) => setEditData({ ...editData, dsf_invoice_target: Number(e.target.value) })}
                      className="w-24"
                    />
                  ) : (
                    <span className="text-accent font-medium">{formatCurrency(target.dsf_invoice_target)}</span>
                  )}
                </TableCell>
                
                {/* DSF Actual & Variance */}
                <TableCell className="border-r">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">{formatCurrency(target.dsf_sales_actual)}</span>
                    {getVarianceBadge(target.dsf_sales_variance)}
                  </div>
                </TableCell>
                
                {/* Total Sales */}
                <TableCell className="bg-secondary/10">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Target:</span>
                    <span className="font-bold">{formatCurrency(target.total_sales_target)}</span>
                    <span className="text-xs text-muted-foreground">Actual:</span>
                    <span className="font-bold text-accent">{formatCurrency(target.total_sales_actual)}</span>
                  </div>
                </TableCell>
                
                {/* Total Invoice */}
                <TableCell className="border-r bg-secondary/10">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Target:</span>
                    <span className="font-bold">{formatCurrency(target.total_invoice_target)}</span>
                    <span className="text-xs text-muted-foreground">Actual:</span>
                    <span className="font-bold text-accent">{formatCurrency(target.total_invoice_actual)}</span>
                  </div>
                </TableCell>
                
                {/* Actions */}
                <TableCell>
                  {editingId === target.id ? (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={saveEdit}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => startEdit(target)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  );
}
