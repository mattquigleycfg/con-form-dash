import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job } from "@/hooks/useJobs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface CostCategoryChartProps {
  jobs: Job[];
}

type GroupBy = "customer" | "sales_person" | "project_manager" | "subcontractor";

export function CostCategoryChart({ jobs }: CostCategoryChartProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>("customer");

  // Group jobs and calculate totals
  const groupedData = jobs.reduce((acc, job) => {
    let groupKey = "";
    
    switch (groupBy) {
      case "customer":
        groupKey = job.customer_name || "Unknown";
        break;
      case "sales_person":
        groupKey = job.sales_person_name || "Unassigned";
        break;
      case "project_manager":
        groupKey = job.project_manager_name || "Unassigned";
        break;
      case "subcontractor":
        groupKey = job.subcontractor_name || "None";
        break;
    }

    if (!acc[groupKey]) {
      acc[groupKey] = {
        name: groupKey,
        materialBudget: 0,
        materialActual: 0,
        nonMaterialBudget: 0,
        nonMaterialActual: 0,
      };
    }

    acc[groupKey].materialBudget += job.material_budget;
    acc[groupKey].materialActual += job.material_actual;
    acc[groupKey].nonMaterialBudget += job.non_material_budget;
    acc[groupKey].nonMaterialActual += job.non_material_actual;

    return acc;
  }, {} as Record<string, any>);

  // Convert to array and sort by total budget
  const chartData = Object.values(groupedData)
    .sort((a, b) => {
      const totalA = a.materialBudget + a.nonMaterialBudget;
      const totalB = b.materialBudget + b.nonMaterialBudget;
      return totalB - totalA;
    })
    .slice(0, 10); // Top 10 only

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{payload[0].payload.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cost Breakdown by Category</CardTitle>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">By Customer</SelectItem>
              <SelectItem value="sales_person">By Sales Person</SelectItem>
              <SelectItem value="project_manager">By Project Manager</SelectItem>
              <SelectItem value="subcontractor">By Subcontractor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No data available for selected grouping
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="rect"
              />
              <Bar 
                dataKey="materialBudget" 
                name="Material Budget" 
                fill="#3b82f6" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="materialActual" 
                name="Material Actual" 
                fill="#1d4ed8" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="nonMaterialBudget" 
                name="Non-Material Budget" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="nonMaterialActual" 
                name="Non-Material Actual" 
                fill="#047857" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

