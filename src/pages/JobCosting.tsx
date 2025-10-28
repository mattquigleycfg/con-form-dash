import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { useOdooSalesOrders } from "@/hooks/useOdooSalesOrders";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { triggerConfetti } from "@/utils/confetti";
import { logger } from "@/utils/logger";

export default function JobCosting() {
  const navigate = useNavigate();
  const { jobs, isLoading } = useJobs();
  const { user } = useAuth();
  const { salesOrders, isLoading: loadingSalesOrders } = useOdooSalesOrders();
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Compute last-month confirmed orders from available sales orders
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const recentSalesOrders = (salesOrders || []).filter(order => new Date(order.date_order) >= oneMonthAgo);

// Removed INSTALLATION SKU pre-check. We now simply filter by last month's confirmed orders using date_order.

  const handleAutoSyncAll = async () => {
    if (!recentSalesOrders.length || !user) {
      toast.error("No recent sales orders to sync");
      return;
    }

    setIsSyncing(true);
    try {
      let syncedCount = 0;
      
      for (const order of recentSalesOrders) {
        // Check if already synced
        const { data: existingJob } = await supabase
          .from("jobs")
          .select("id")
          .eq("odoo_sale_order_id", order.id)
          .eq("user_id", user.id)
          .single();

        if (existingJob) {
          logger.info(`Job for SO ${order.name} already exists, skipping`);
          continue;
        }

        // Fetch order lines
        const { data: orderLines, error: linesError } = await supabase.functions.invoke("odoo-query", {
          body: {
            model: "sale.order.line",
            method: "search_read",
            args: [
              [["order_id", "=", order.id]],
              ["id", "order_id", "product_id", "product_uom_qty", "price_unit", "price_subtotal"],
            ],
          },
        });

        if (linesError) throw linesError;

        const lines = (orderLines as any[]).filter(line => line.product_id && line.product_id[0]);
        const productIds = lines.map(line => line.product_id[0]);

        const { data: products } = await supabase.functions.invoke("odoo-query", {
          body: {
            model: "product.product",
            method: "search_read",
            args: [
              [["id", "in", productIds]],
              ["id", "detailed_type", "standard_price", "default_code"],
            ],
          },
        });

        const productMap = new Map((products as any[]).map(p => [p.id, p]));

        const saleOrderLines = lines.map(line => {
          const product = productMap.get(line.product_id[0]);
          return {
            ...line,
            detailed_type: product?.detailed_type || 'product',
          };
        });

        // Categorize lines
        const materialLines = saleOrderLines.filter(line => 
          line.detailed_type === 'product' || line.detailed_type === 'consu'
        );
        const nonMaterialLines = saleOrderLines.filter(line => 
          line.detailed_type === 'service'
        );

        const materialBudget = materialLines.reduce((sum, line) => sum + line.price_subtotal, 0);
        const nonMaterialBudget = nonMaterialLines.reduce((sum, line) => sum + line.price_subtotal, 0);

        // Create job
        const { data: job, error: jobError } = await supabase
          .from("jobs")
          .insert([{
            user_id: user.id,
            odoo_sale_order_id: order.id,
            sale_order_name: order.name,
            customer_name: order.partner_id[1],
            total_budget: order.amount_total,
            material_budget: materialBudget,
            non_material_budget: nonMaterialBudget,
            total_actual: 0,
            material_actual: 0,
            non_material_actual: 0,
            status: 'active',
          }])
          .select()
          .single();

        if (jobError) throw jobError;

        // Create budget lines
        const budgetLines = saleOrderLines.map(line => ({
          job_id: job.id,
          odoo_line_id: line.id,
          product_id: line.product_id[0],
          product_name: line.product_id[1],
          product_type: line.detailed_type,
          quantity: line.product_uom_qty,
          unit_price: line.price_unit,
          subtotal: line.price_subtotal,
          cost_category: (line.detailed_type === 'product' || line.detailed_type === 'consu') ? 'material' : 'non_material',
        }));

        const { error: linesError2 } = await supabase
          .from("job_budget_lines")
          .insert(budgetLines);

        if (linesError2) throw linesError2;

        syncedCount++;
      }

      if (syncedCount > 0) {
        triggerConfetti();
        toast.success(`Synced ${syncedCount} job(s) from Odoo!`);
      } else {
        toast.info("All recent jobs already synced");
      }
    } catch (error) {
      logger.error("Error auto-syncing jobs", error);
      toast.error("Failed to sync jobs from Odoo");
    } finally {
      setIsSyncing(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage < 70) return "bg-success";
    if (percentage < 90) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Job Costing</h1>
            <p className="text-muted-foreground mt-2">
              Track project budgets and actual costs
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/job-costing/reports")}>
              <Download className="mr-2 h-4 w-4" />
              Reports
            </Button>
            <Button onClick={handleAutoSyncAll} disabled={isSyncing || loadingSalesOrders}>
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Auto-Sync from Odoo
                </>
              )}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !jobs || jobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No jobs found. Sync your first job from Odoo to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Name</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Actual</TableHead>
                    <TableHead className="w-80">Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const percentage = job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0;
                    return (
                      <TableRow 
                        key={job.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/job-costing/${job.id}`)}
                      >
                        <TableCell>
                          <div className="font-medium">{job.sale_order_name}</div>
                          <div className="text-sm text-muted-foreground">{job.customer_name}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(job.total_budget)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(job.total_actual)}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Progress 
                                value={percentage} 
                                className={`flex-1 h-2 transition-all duration-500 ${getProgressColor(percentage)}`} 
                              />
                              <span className="text-sm font-medium min-w-[3rem] text-right">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Remaining: {formatCurrency(job.total_budget - job.total_actual)}</span>
                              <Badge variant={job.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                                {job.status}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
