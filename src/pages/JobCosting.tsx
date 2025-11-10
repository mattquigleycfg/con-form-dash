import { useState, useMemo, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw, Search } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useJobCostingSalesOrders } from "@/hooks/useJobCostingSalesOrders";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { triggerConfetti } from "@/utils/confetti";
import { logger } from "@/utils/logger";
import { useOdooProjectStages } from "@/hooks/useOdooProjectStages";
import { useJobFiltering, ViewMode, BudgetSort, DateRange } from "@/hooks/useJobFilters";
import { JobFilterBar } from "@/components/job-costing/JobFilterBar";
import { ListView } from "@/components/job-costing/ListView";
import { useQueryClient } from "@tanstack/react-query";
import { KanbanView } from "@/components/job-costing/KanbanView";
import { GridView } from "@/components/job-costing/GridView";

export default function JobCosting() {
  const navigate = useNavigate();
  const { jobs, isLoading } = useJobs();
  const { user } = useAuth();
  const { stages, isLoading: loadingStages } = useOdooProjectStages();
  const queryClient = useQueryClient();
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
  
  // Fetch sales orders using the job costing specific hook (not global filters)
  const { salesOrders, isLoading: loadingSalesOrders } = useJobCostingSalesOrders({
    startDate: dateRange?.start,
    endDate: dateRange?.end,
  });
  
  // Persist view preference
  useEffect(() => {
    localStorage.setItem('job-costing-view-mode', view);
  }, [view]);
  
  // Compute confirmed orders from date range period (default: last 3 months)
  const relevantSalesOrders = (salesOrders || []).filter(order => {
    if (!dateRange) return true;
    const orderDate = new Date(order.date_order);
    return orderDate >= dateRange.start && orderDate <= dateRange.end;
  });

  // Apply all filters using the filtering hook
  const filteredJobs = useJobFiltering(jobs, { dateRange, budgetSort, searchTerm });

  // Auto-sync on mount and when sales orders change (only run once)
  const [hasAutoSynced, setHasAutoSynced] = useState(false);

// Removed INSTALLATION SKU pre-check. We now simply filter by last month's confirmed orders using date_order.

  const handleAutoSyncAll = useCallback(async () => {
    if (!relevantSalesOrders.length || !user) {
      toast.error("No sales orders in selected date range to sync");
      return;
    }

    setIsSyncing(true);
    try {
      let syncedCount = 0;
      
      
      for (const order of relevantSalesOrders) {
        // Check if already synced (check across all users)
        const { data: existingJob } = await supabase
          .from("jobs")
          .select("id")
          .eq("odoo_sale_order_id", order.id)
          .maybeSingle();

        if (existingJob) {
          continue;
        }
        // Fetch order lines with margin fields to calculate cost
        const { data: orderLines, error: linesError } = await supabase.functions.invoke("odoo-query", {
          body: {
            model: "sale.order.line",
            method: "search_read",
            args: [
              [["order_id", "=", order.id]],
              ["id", "order_id", "product_id", "product_uom_qty", "price_unit", "price_subtotal", "purchase_price", "margin", "margin_percent"],
            ],
          },
        });

        if (linesError) {
          logger.error(`Error fetching order lines for SO ${order.name}:`, linesError);
          throw linesError;
        }

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
              ["id", "detailed_type", "default_code"],
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
          const productName = line.product_id[1] || '';
          const productNameUpper = productName.toUpperCase();
          const productTypeRaw = (product?.detailed_type || product?.type || 'product') as string;
          let productType = productTypeRaw?.toLowerCase?.() || 'product';
          
          // CRITICAL FIX: Classify services by product name if detailed_type doesn't indicate service
          // Check for service-related keywords in product name
          const serviceKeywords = [
            'INSTALLATION',
            'FREIGHT',
            'CRANAGE',
            'ACCOMMODATION',
            'TRAVEL',
            'TRANSPORT',
            'DELIVERY',
            'LABOUR',
            'SERVICE',
            'SITE INSPECTION',
            'WORKSHOP LABOUR',
            'SHOP DRAWING',
            'MAN DAY',
            'EXPENSES',
            'SITE LABOUR'
          ];
          
          const isServiceByName = serviceKeywords.some(keyword => productNameUpper.includes(keyword));
          
          // Override product type if name suggests it's a service
          if (isServiceByName && productType !== 'service') {
            productType = 'service';
          }
          
          // Calculate cost price with multiple methods (prioritized order):
          // 1. Use purchase_price (direct cost from Odoo)
          // 2. Calculate from margin: price_unit - margin
          // 3. Calculate from margin_percent
          // 4. Fallback to price if no cost data available
          let costPrice = 0;
          
          if (line.purchase_price && line.purchase_price > 0) {
            // Option 1: Direct purchase price/cost from Odoo (most accurate)
            costPrice = line.purchase_price;
          } else if (line.margin !== undefined && line.margin !== null && line.margin !== false) {
            // Option 2: Calculate from margin (price - margin = cost)
            costPrice = line.price_unit - line.margin;
          } else if (line.margin_percent && line.margin_percent > 0 && line.margin_percent < 100) {
            // Option 3: Calculate from margin percentage
            costPrice = line.price_unit * (1 - line.margin_percent / 100);
          }
          
          if ((!costPrice || costPrice <= 0) && line.price_subtotal) {
            // Option 4: Use price as last resort
            costPrice = line.product_uom_qty > 0
              ? line.price_subtotal / line.product_uom_qty
              : line.price_subtotal;
          }

          // Ensure cost is not negative
          costPrice = Math.max(0, costPrice);
          
          const quantity = line.product_uom_qty;
          let costSubtotal = quantity > 0 ? costPrice * quantity : line.price_subtotal || 0;
          if ((!costSubtotal || costSubtotal <= 0) && line.price_subtotal) {
            costSubtotal = line.price_subtotal;
          }
          
          if (productType === 'service') {
            nonMaterialLines.push({
              ...line,
              detailed_type: productType,
              cost_price: costPrice,
              cost_subtotal: costSubtotal,
              cost_category: 'non_material', // Fixed: use constraint-compliant value
              sub_category: getNonMaterialCategory(product, line.product_id[1]), // Store subcategory separately
            });
          } else {
            materialLines.push({
              ...line,
              detailed_type: productType,
              cost_price: costPrice,
              cost_subtotal: costSubtotal,
              cost_category: 'material', // Fixed: use constraint-compliant value
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

        // Fetch project stage from Odoo if analytic account exists
        let projectStageId = null;
        let projectStageName = 'Unassigned';
        
        if (order.analytic_account_id) {
          try {
            // Find project linked to this analytic account
            const { data: projects } = await supabase.functions.invoke("odoo-query", {
              body: {
                model: "project.project",
                method: "search_read",
                args: [
                  [["analytic_account_id", "=", order.analytic_account_id[0]]],
                  ["id", "name"],
                ],
              },
            });

            if (projects && projects.length > 0) {
              const projectId = projects[0].id;
              
              // Find tasks for this project to get the actual task stage
              const { data: tasks } = await supabase.functions.invoke("odoo-query", {
                body: {
                  model: "project.task",
                  method: "search_read",
                  args: [
                    [
                      ["project_id", "=", projectId],
                      ["active", "=", true],
                    ],
                    ["id", "name", "stage_id", "priority"],
                  ],
                },
              });

              if (tasks && tasks.length > 0) {
                // Get primary task (highest priority, most recent)
                const mainTask = tasks.sort((a: any, b: any) => {
                  if (a.priority !== b.priority) return b.priority - a.priority;
                  return b.id - a.id;
                })[0];

                if (mainTask.stage_id && mainTask.stage_id[0]) {
                  projectStageId = mainTask.stage_id[0];
                  projectStageName = mainTask.stage_id[1];
                  logger.info(`Found task stage for SO ${order.name}: ${projectStageName}`);
                }
              } else {
                logger.info(`No tasks found for project ${projectId}, using Unassigned`);
              }
            } else {
              logger.info(`No project found for SO ${order.name}, using Unassigned`);
            }
          } catch (error) {
            logger.error(`Error fetching task stage for SO ${order.name}:`, error);
          }
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
            project_stage_id: projectStageId,
            project_stage_name: projectStageName,
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
          cost_category: line.cost_category, // 'material' or 'non_material'
        }));

        if (budgetLines.length > 0) {
          const { error: linesError2 } = await supabase
            .from("job_budget_lines")
            .insert(budgetLines);

          if (linesError2) {
            logger.error('Budget lines insert error:', linesError2);
            throw linesError2;
          }
        }

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
  }, [relevantSalesOrders, user, queryClient]);

  // Trigger auto-sync once on mount
  useEffect(() => {
    if (!loadingSalesOrders && salesOrders && salesOrders.length > 0 && user && !isSyncing && !hasAutoSynced) {
      setHasAutoSynced(true);
      handleAutoSyncAll();
    }
  }, [salesOrders?.length, user?.id, hasAutoSynced, loadingSalesOrders, isSyncing, handleAutoSyncAll]);

  const handleSyncCosts = async () => {
    if (!user || jobs.length === 0) {
      toast.error("No jobs to sync costs for");
      return;
    }

    setIsSyncing(true);
    
    try {
      let updatedCount = 0;
      
      toast.info(`Syncing costs for ${jobs.length} jobs...`);
      
      for (const job of jobs) {
        try {
          // Fetch order lines with margin data from Odoo
          const { data: orderLines, error: linesError } = await supabase.functions.invoke("odoo-query", {
            body: {
              model: "sale.order.line",
              method: "search_read",
              args: [
                [["order_id", "=", job.odoo_sale_order_id]],
                ["id", "order_id", "product_id", "product_uom_qty", "price_unit", "price_subtotal", "purchase_price", "margin", "margin_percent"],
              ],
            },
          });

          if (linesError) {
            logger.error(`Error fetching lines for job ${job.sale_order_name}:`, linesError);
            continue;
          }

          if (!orderLines || orderLines.length === 0) continue;

          // Filter out lines with no product_id, zero sale price, or "DESCRIPTION OF WORKS"
          const lines = (orderLines as any[]).filter(line => {
            if (!line.product_id || !line.product_id[0]) return false;
            if (!line.price_subtotal || line.price_subtotal === 0) return false;
            
            const productName = line.product_id[1] || '';
            if (productName.toLowerCase().includes('description of works')) return false;
            
            return true;
          });

          if (lines.length === 0) continue;

          // Calculate costs using margin (same prioritized logic as sync)
          const updatedBudgetLines = lines.map(line => {
            // Calculate cost price with prioritized methods:
            let costPrice = 0;
            
            if (line.purchase_price && line.purchase_price > 0) {
              // Option 1: Direct purchase price/cost from Odoo (most accurate)
              costPrice = line.purchase_price;
            } else if (line.margin !== undefined && line.margin !== null && line.margin !== false) {
              // Option 2: Calculate from margin
              costPrice = line.price_unit - line.margin;
            } else if (line.margin_percent && line.margin_percent > 0 && line.margin_percent < 100) {
              // Option 3: Calculate from margin percentage
              costPrice = line.price_unit * (1 - line.margin_percent / 100);
            }
            
            costPrice = Math.max(0, costPrice);
            const quantity = line.product_uom_qty;
            const costSubtotal = costPrice * quantity;

            return {
              odoo_line_id: line.id,
              unit_price: costPrice,
              subtotal: costSubtotal,
            };
          });

          // Update existing budget lines
          for (const updatedLine of updatedBudgetLines) {
            const { error: updateError } = await supabase
              .from("job_budget_lines")
              .update({
                unit_price: updatedLine.unit_price,
                subtotal: updatedLine.subtotal,
              })
              .eq("job_id", job.id)
              .eq("odoo_line_id", updatedLine.odoo_line_id);

            if (updateError) {
              logger.error(`Error updating budget line:`, updateError);
            }
          }

          // Recalculate job totals
          const materialBudget = updatedBudgetLines
            .reduce((sum, line) => sum + line.subtotal, 0);

          const { error: jobUpdateError } = await supabase
            .from("jobs")
            .update({
              material_budget: materialBudget,
            })
            .eq("id", job.id);

          if (jobUpdateError) {
            logger.error(`Error updating job totals:`, jobUpdateError);
          } else {
            updatedCount++;
          }

        } catch (error) {
          logger.error(`Error syncing costs for job ${job.sale_order_name}:`, error);
          continue;
        }
      }

      if (updatedCount > 0) {
        toast.success(`Updated costs for ${updatedCount} job(s)!`);
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      } else {
        toast.warning("No jobs were updated. Check console for errors.");
      }
    } catch (error) {
      logger.error("Error syncing costs:", error);
      toast.error("Failed to sync costs. Check console for details.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshStages = async () => {
    if (!jobs || jobs.length === 0 || !user) {
      toast.error("No jobs to refresh");
      return;
    }

    setIsSyncing(true);
    try {
      let updatedCount = 0;
      
      for (const job of jobs) {
        if (!job.analytic_account_id) {
          logger.info(`Job ${job.sale_order_name} has no analytic account, skipping`);
          continue;
        }

        try {
          // Find project linked to this analytic account
          const { data: projects } = await supabase.functions.invoke("odoo-query", {
            body: {
              model: "project.project",
              method: "search_read",
              args: [
                [["analytic_account_id", "=", job.analytic_account_id]],
                ["id", "name"],
              ],
            },
          });

          if (!projects || projects.length === 0) {
            logger.info(`No project found for ${job.sale_order_name}`);
            continue;
          }

          const projectId = projects[0].id;

          // Find tasks for this project
          const { data: tasks } = await supabase.functions.invoke("odoo-query", {
            body: {
              model: "project.task",
              method: "search_read",
              args: [
                [
                  ["project_id", "=", projectId],
                  ["active", "=", true],
                ],
                ["id", "name", "stage_id", "priority", "kanban_state"],
              ],
            },
          });

          if (tasks && tasks.length > 0) {
            // Get the primary task (highest priority, most recent)
            const mainTask = tasks.sort((a: any, b: any) => {
              if (a.priority !== b.priority) {
                return b.priority - a.priority;
              }
              return b.id - a.id;
            })[0];

            if (mainTask.stage_id && mainTask.stage_id[0]) {
              const taskStageId = mainTask.stage_id[0];
              const taskStageName = mainTask.stage_id[1];

              // Update job with task stage
              await supabase
                .from("jobs")
                .update({
                  project_stage_id: taskStageId,
                  project_stage_name: taskStageName,
                })
                .eq("id", job.id);

              logger.info(`Updated stage for ${job.sale_order_name}: ${taskStageName}`);
              updatedCount++;
            }
          }
        } catch (error) {
          logger.error(`Error refreshing stage for job ${job.sale_order_name}:`, error);
        }
      }

      if (updatedCount > 0) {
        toast.success(`Updated stages for ${updatedCount} job(s)!`);
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
      } else {
        toast.info("No stage updates needed");
      }
    } catch (error) {
      logger.error("Error refreshing stages", error);
      toast.error("Failed to refresh stages from Odoo");
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
            <Button 
              variant="outline" 
              onClick={handleSyncCosts} 
              disabled={isSyncing || isLoading || !jobs || jobs.length === 0}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Costs
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRefreshStages} 
              disabled={isSyncing || isLoading || !jobs || jobs.length === 0}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Stages
                </>
              )}
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

        {/* Summary Dashboard */}
        {filteredJobs && filteredJobs.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredJobs.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(filteredJobs.reduce((sum, job) => sum + job.total_budget, 0) / 1000).toFixed(0)}K
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Actual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(filteredJobs.reduce((sum, job) => sum + job.total_actual, 0) / 1000).toFixed(0)}K
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className={`text-2xl font-bold ${
                    (() => {
                      const totalBudget = filteredJobs.reduce((sum, job) => sum + job.total_budget, 0);
                      const totalActual = filteredJobs.reduce((sum, job) => sum + job.total_actual, 0);
                      const util = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
                      return util > 100 ? 'text-red-600' : util > 80 ? 'text-yellow-600' : 'text-green-600';
                    })()
                  }`}
                >
                  {(() => {
                    const totalBudget = filteredJobs.reduce((sum, job) => sum + job.total_budget, 0);
                    const totalActual = filteredJobs.reduce((sum, job) => sum + job.total_actual, 0);
                    return totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0;
                  })()}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Over Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {filteredJobs.filter(job => {
                    const util = job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0;
                    return util > 100;
                  }).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">At Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {filteredJobs.filter(job => {
                    const util = job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0;
                    return util > 80 && util <= 100;
                  }).length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
