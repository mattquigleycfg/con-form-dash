import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import type { SingleSourceRisk } from "@/hooks/useMLPredictions";

interface SupplierComparisonPanelProps {
  singleSourceRisks: SingleSourceRisk[];
}

export function SupplierComparisonPanel({ singleSourceRisks }: SupplierComparisonPanelProps) {
  const [weights, setWeights] = useState({ price: 30, leadTime: 30, reliability: 25, moq: 15 });

  const normalizeWeights = (key: keyof typeof weights, value: number) => {
    const newWeights = { ...weights, [key]: value };
    const total = Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const scale = 100 / total;
      Object.keys(newWeights).forEach((k) => {
        newWeights[k as keyof typeof weights] = Math.round(newWeights[k as keyof typeof weights] * scale);
      });
    }
    setWeights(newWeights);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Scoring Weights</CardTitle>
          <CardDescription className="text-xs">Adjust how suppliers are ranked per product</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.entries(weights) as [keyof typeof weights, number][]).map(([key, val]) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs capitalize">{key === "leadTime" ? "Lead Time" : key === "moq" ? "MOQ Flex" : key}</Label>
                  <span className="text-xs text-muted-foreground">{val}%</span>
                </div>
                <Slider
                  value={[val]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([v]) => normalizeWeights(key, v)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {singleSourceRisks.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Single-Source Risk ({singleSourceRisks.length} products)
            </CardTitle>
            <CardDescription className="text-xs">Products with only one supplier -- supply chain vulnerability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-xs">Sole Vendor</TableHead>
                    <TableHead className="text-xs text-right">Total Spend</TableHead>
                    <TableHead className="text-xs">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {singleSourceRisks.map((r) => (
                    <TableRow key={r.product_id}>
                      <TableCell className="text-xs font-medium max-w-[200px] truncate">{r.product_name}</TableCell>
                      <TableCell className="text-xs max-w-[180px] truncate">{r.sole_vendor}</TableCell>
                      <TableCell className="text-xs text-right">${(r.total_spend ?? 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={r.risk_level === "high" ? "destructive" : "default"} className="text-[10px]">
                          {r.risk_level}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
