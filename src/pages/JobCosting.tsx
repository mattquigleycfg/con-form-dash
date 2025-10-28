import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw, Search } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useOdooSalesOrders } from "@/hooks/useOdooSalesOrders";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { triggerConfetti } from "@/utils/confetti";
import { logger } from "@/utils/logger";
import { useOdooProjectStages } from "@/hooks/useOdooProjectStages";
import { useJobFiltering, ViewMode, BudgetSort, DateRange } from "@/hooks/useJobFilters";
import { JobFilterBar } from "@/components/job-costing/JobFilterBar";
import { ListView } from "@/components/job-costing/ListView";
import { KanbanView } from "@/components/job-costing/KanbanView";
import { GridView } from "@/components/job-costing/GridView";

export default function JobCosting() {
  const navigate = useNavigate();
  const { jobs, isLoading } = useJobs();
  const { user } = useAuth();
  const { salesOrders, isLoading: loadingSalesOrders } = useOdooSalesOrders();
  const { stages, isLoading: loadingStages } = useOdooProjectStages();
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // View and filter state with localStorage persistence
  const [view, setView] = useState<ViewMode>(
    (localStorage.getItem('job-costing-view-mode') as ViewMode) || 'list'
  );
  const [dateRange, setDateRange] = useState<DateRange | null>(() => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return { start: threeMonthsAgo, end: new Date() };
  });
  const [budgetSort, setBudgetSort] = useState<BudgetSort>('high-low');
  
  // Persist view preference
  useEffect(() => {
    localStorage.setItem('job-costing-view-mode', view);
  }, [view]);
  
  // Compute last-month confirmed orders from available sales orders
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const recentSalesOrders = (salesOrders || []).filter(order => new Date(order.date_order) >= oneMonthAgo);

  // Apply all filters using the filtering hook
  const filteredJobs = useJobFiltering(jobs, { dateRange, budgetSort, searchTerm });

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

        // Filter out lines with no product_id, zero sale price, or "DESCRIPTION OF WORKS"
        const lines = (orderLines as any[]).filter(line => {
          if (!line.product_id || !line.product_id[0]) return false;
          if (!line.price_subtotal || line.price_subtotal === 0) return false;
          
          const productName = line.product_id[1] || '';
          if (productName.toLowerCase().includes('description of works')) return false;
          
          return true;
        });
        
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

        // Helper function to determine non-material sub-category
        const getNonMaterialCategory = (product: any, productName: string): string => {
          const sku = product?.default_code || '';
          const name = productName.toUpperCase();
          
          // Check specific SKUs first
          if (sku === 'CF000412') return 'Freight';
          if (sku === 'CFGCRAN001') return 'Cranage';
          
          // Check product name patterns
          if (name.includes('INSTALLATION')) return 'Installation';
          if (name.includes('FREIGHT')) return 'Freight';
          if (name.includes('CRANAGE')) return 'Cranage';
          if (name.includes('ACCOMMODATION')) return 'Accommodation';
          if (name.includes('TRAVEL')) return 'Travel';
          
          return 'Other';
        };

        // Categorize lines and calculate using COST prices
        const materialLines: any[] = [];
        const nonMaterialLines: any[] = [];

        lines.forEach(line => {
          const product = productMap.get(line.product_id[0]);
          const productType = product?.detailed_type || 'product';
          const costPrice = product?.standard_price || 0;
          const quantity = line.product_uom_qty;
          const costSubtotal = costPrice * quantity;
          
          if (productType === 'service') {
            nonMaterialLines.push({
              ...line,
              detailed_type: productType,
              cost_price: costPrice,
              cost_subtotal: costSubtotal,
              cost_category: getNonMaterialCategory(product, line.product_id[1]),
            });
          } else {
            materialLines.push({
              ...line,
              detailed_type: productType,
              cost_price: costPrice,
              cost_subtotal: costSubtotal,
            });
          }
        });

        const materialBudget = materialLines.reduce((sum, line) => sum + line.cost_subtotal, 0);
        const nonMaterialBudget = nonMaterialLines.reduce((sum, line) => sum + line.cost_subtotal, 0);

        // Fetch sales person name if available
        let salesPersonName = null;
        if (order.user_id && order.user_id[0]) {
          salesPersonName = order.user_id[1];
        }

        // Create job with additional search fields and date_order
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
            analytic_account_id: order.analytic_account_id ? order.analytic_account_id[0] : null,
            sales_person_name: salesPersonName,
            opportunity_name: order.opportunity_id ? order.opportunity_id[1] : null,
            date_order: order.date_order,
            project_stage_name: 'Unassigned',
          }])
          .select()
          .single();

        if (jobError) throw jobError;

        // Create budget lines using COST prices
        const allLines = [...materialLines, ...nonMaterialLines];
        const budgetLines = allLines.map(line => ({
          job_id: job.id,
          odoo_line_id: line.id,
          product_id: line.product_id[0],
          product_name: line.product_id[1],
          product_type: line.detailed_type,
          quantity: line.product_uom_qty,
          unit_price: line.cost_price, // Use cost price
          subtotal: line.cost_subtotal, // Use cost-based subtotal
          cost_category: line.cost_category || 'material',
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
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

        {/* Filter Bar */}
        <JobFilterBar
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          budgetSort={budgetSort}
          onBudgetSortChange={setBudgetSort}
          view={view}
          onViewChange={setView}
        />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by SO number, customer, opportunity, or sales person..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* View Rendering */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {jobs && jobs.length > 0 ? (
                  <>No jobs found matching your filters</>
                ) : (
                  <>No jobs found. Sync your first job from Odoo to get started.</>
                )}
              </div>
            ) : (
              <>
                {view === 'list' && (
                  <ListView 
                    jobs={filteredJobs} 
                    onJobClick={(jobId) => navigate(`/job-costing/${jobId}`)}
                  />
                )}
                {view === 'kanban' && (
                  <div className="p-6">
                    <KanbanView 
                      jobs={filteredJobs} 
                      stages={stages}
                      isLoadingStages={loadingStages}
                      onJobClick={(jobId) => navigate(`/job-costing/${jobId}`)}
                    />
                  </div>
                )}
                {view === 'grid' && (
                  <GridView 
                    jobs={filteredJobs} 
                    onJobClick={(jobId) => navigate(`/job-costing/${jobId}`)}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
