import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Download, RefreshCw } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOdooSalesOrders } from "@/hooks/useOdooSalesOrders";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOdooSaleOrderLines } from "@/hooks/useOdooSaleOrderLines";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { triggerConfetti } from "@/utils/confetti";

export default function JobCosting() {
  const navigate = useNavigate();
  const { jobs, isLoading, createJob } = useJobs();
  const { user } = useAuth();
  const { salesOrders, isLoading: loadingSalesOrders } = useOdooSalesOrders();
  const [selectedSaleOrderId, setSelectedSaleOrderId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [allOrdersWithLines, setAllOrdersWithLines] = useState<Array<{ order: any; hasInstallation: boolean }>>([]);
  const [loadingOrdersWithLines, setLoadingOrdersWithLines] = useState(false);

  const { data: saleOrderLines, isLoading: loadingLines } = useOdooSaleOrderLines(selectedSaleOrderId || undefined);

  // Fetch all orders and check for INSTALLATION lines when dialog opens
  useEffect(() => {
    if (isCreateDialogOpen && salesOrders && !loadingOrdersWithLines) {
      const checkOrdersForInstallation = async () => {
        setLoadingOrdersWithLines(true);
        try {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          
          // Filter orders from last month
          const recentOrders = salesOrders.filter(order => {
            const orderDate = new Date(order.date_order);
            return orderDate >= oneMonthAgo;
          });

          const ordersWithInstallationStatus = await Promise.all(
            recentOrders.map(async (order) => {
              try {
                // Fetch lines for this order
                const { data: lines } = await supabase.functions.invoke("odoo-query", {
                  body: {
                    model: "sale.order.line",
                    method: "search_read",
                    args: [
                      [["order_id", "=", order.id]],
                      ["id", "product_id"],
                    ],
                  },
                });

                if (!lines || lines.length === 0) {
                  return { order, hasInstallation: false };
                }

                const productIds = lines.map((l: any) => l.product_id[0]);
                
                // Fetch product details to check for INS001 SKU
                const { data: products } = await supabase.functions.invoke("odoo-query", {
                  body: {
                    model: "product.product",
                    method: "search_read",
                    args: [
                      [["id", "in", productIds], ["default_code", "=", "INS001"]],
                      ["id", "default_code", "name"],
                    ],
                  },
                });

                return { 
                  order, 
                  hasInstallation: products && products.length > 0 
                };
              } catch (error) {
                console.error(`Error checking order ${order.id}:`, error);
                return { order, hasInstallation: false };
              }
            })
          );

          // Filter to only show orders with INSTALLATION line
          const ordersWithInstallation = ordersWithInstallationStatus.filter(o => o.hasInstallation);
          setAllOrdersWithLines(ordersWithInstallation);
        } catch (error) {
          console.error("Error fetching orders with INSTALLATION:", error);
          toast.error("Failed to load orders");
        } finally {
          setLoadingOrdersWithLines(false);
        }
      };

      checkOrdersForInstallation();
    }
  }, [isCreateDialogOpen, salesOrders, loadingOrdersWithLines]);

  const handleSyncFromOdoo = async () => {
    if (!selectedSaleOrderId || !saleOrderLines || !user) return;

    setIsSyncing(true);
    try {
      const selectedOrder = salesOrders?.find(so => so.id === selectedSaleOrderId);
      if (!selectedOrder) throw new Error("Sale order not found");

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
          odoo_sale_order_id: selectedOrder.id,
          sale_order_name: selectedOrder.name,
          customer_name: selectedOrder.partner_id[1],
          total_budget: selectedOrder.amount_total,
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

      const { error: linesError } = await supabase
        .from("job_budget_lines")
        .insert(budgetLines);

      if (linesError) throw linesError;

      triggerConfetti();
      toast.success("Job synced successfully from Odoo!");
      setIsCreateDialogOpen(false);
      setSelectedSaleOrderId(null);
      navigate(`/job-costing/${job.id}`);
    } catch (error) {
      console.error("Error syncing job:", error);
      toast.error("Failed to sync job from Odoo");
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
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Sync from Odoo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import Job from Odoo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Select Sales Order (with INSTALLATION - Last Month)</Label>
                    {loadingOrdersWithLines ? (
                      <div className="text-sm text-muted-foreground">
                        Checking orders for INSTALLATION line items...
                      </div>
                    ) : (
                      <Select
                        value={selectedSaleOrderId?.toString()}
                        onValueChange={(value) => setSelectedSaleOrderId(parseInt(value))}
                        disabled={loadingSalesOrders || loadingOrdersWithLines}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a sales order..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allOrdersWithLines.length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">
                              No orders with INSTALLATION (INS001) found in the last month
                            </div>
                          ) : (
                            allOrdersWithLines.map(({ order }) => (
                              <SelectItem key={order.id} value={order.id.toString()}>
                                {order.name} - {order.partner_id[1]} ({formatCurrency(order.amount_total)})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {selectedSaleOrderId && loadingLines && (
                    <div className="text-sm text-muted-foreground">Loading order lines...</div>
                  )}

                  {selectedSaleOrderId && saleOrderLines && (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <div className="font-medium">Order Summary:</div>
                        <div className="text-muted-foreground">
                          {saleOrderLines.length} lines • 
                          {" "}{saleOrderLines.filter(l => l.detailed_type === 'product' || l.detailed_type === 'consu').length} material • 
                          {" "}{saleOrderLines.filter(l => l.detailed_type === 'service').length} non-material
                        </div>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={handleSyncFromOdoo} 
                    disabled={!selectedSaleOrderId || isSyncing || loadingLines}
                    className="w-full"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Job
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                    <TableHead>Job</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const percentage = job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0;
                    return (
                      <TableRow 
                        key={job.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/job-costing/${job.id}`)}
                      >
                        <TableCell className="font-medium">{job.sale_order_name}</TableCell>
                        <TableCell>{job.customer_name}</TableCell>
                        <TableCell>{formatCurrency(job.total_budget)}</TableCell>
                        <TableCell>{formatCurrency(job.total_actual)}</TableCell>
                        <TableCell className="w-48">
                          <div className="space-y-1">
                            <Progress value={percentage} className={getProgressColor(percentage)} />
                            <div className="text-xs text-muted-foreground text-right">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                            {job.status}
                          </Badge>
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
