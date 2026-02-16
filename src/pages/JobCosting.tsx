import { useState, useMemo, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, AlertTriangle, TrendingUp, ChevronDown } from "lucide-react";
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
import { useJobFiltering, ViewMode, BudgetSort, BudgetFilter, DateRange } from "@/hooks/useJobFilters";
import { JobFilterBar } from "@/components/job-costing/JobFilterBar";
import { ListView } from "@/components/job-costing/ListView";
import { useQueryClient } from "@tanstack/react-query";
import { KanbanView } from "@/components/job-costing/KanbanView";
import { GridView } from "@/components/job-costing/GridView";
import { AIInsights } from "@/components/job-costing/AIInsights";
import { processBatched, retryWithBackoff, RateLimiter } from "@/utils/rateLimit";
import { JobListModal } from "@/components/job-costing/JobListModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function JobCosting() {
  const navigate = useNavigate();
  const { jobs, isLoading } = useJobs();
  const { user } = useAuth();
  const { stages, isLoading: loadingStages } = useOdooProjectStages();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectManager, setProjectManager] = useState<string | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [subcontractor, setSubcontractor] = useState<string | null>(null);
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>('all');
  const [jobListModalType, setJobListModalType] = useState<"overBudget" | "atRisk" | null>(null);
  const [aiInsightsOpen, setAiInsightsOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('job-costing-ai-insights-open');
    return stored !== null ? stored === 'true' : true; // default open
  });
  
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

  // Persist AI insights collapsed state
  useEffect(() => {
    localStorage.setItem('job-costing-ai-insights-open', String(aiInsightsOpen));
  }, [aiInsightsOpen]);
  
  // Compute confirmed orders from date range period (default: last 3 months)
  const relevantSalesOrders = (salesOrders || []).filter(order => {
    if (!dateRange) return true;
    const orderDate = new Date(order.date_order);
    return orderDate >= dateRange.start && orderDate <= dateRange.end;
  });

  // Apply all filters using the filtering hook
  const filteredJobs = useJobFiltering(jobs, { dateRange, budgetSort, searchTerm, projectManager, stage, subcontractor, budgetFilter });

  // Extract unique PM names from jobs for the filter dropdown
  const jobPMNames = useMemo(() => {
    if (!jobs) return [];
    const names = new Set<string>();
    for (const job of jobs) {
      if (job.project_manager_name) names.add(job.project_manager_name);
    }
    return Array.from(names).sort();
  }, [jobs]);

  // Compute over-budget and at-risk job lists
  const overBudgetJobs = useMemo(
    () =>
      (filteredJobs || []).filter((job) => {
        const util = job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0;
        return util > 100;
      }),
    [filteredJobs]
  );

  const atRiskJobs = useMemo(
    () =>
      (filteredJobs || []).filter((job) => {
        const util = job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0;
        return util > 80 && util <= 100;
      }),
    [filteredJobs]
  );

  // Determine if any filter deviates from default values
  const hasActiveFilters = useMemo(() => {
    return (
      searchTerm !== "" ||
      projectManager !== null ||
      stage !== null ||
      subcontractor !== null ||
      budgetFilter !== "all" ||
      budgetSort !== "high-low"
    );
  }, [searchTerm, projectManager, stage, subcontractor, budgetFilter, budgetSort]);

  const handleClearAll = useCallback(() => {
    setSearchTerm("");
    setProjectManager(null);
    setStage(null);
    setSubcontractor(null);
    setBudgetFilter("all");
    setBudgetSort("high-low");
    // Reset date range to last quarter (default)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    setDateRange({ start: threeMonthsAgo, end: new Date() });
  }, []);

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
        // Check if already synced (check across all users to prevent duplicates)
        const { data: existingJob } = await supabase
          .from("jobs")
          .select("id")
          .eq("odoo_sale_order_id", order.id)
          .maybeSingle();

        if (existingJob) {
          logger.info(`Job already exists for SO ${order.name}, skipping duplicate creation`);
          continue;
        }
        // Fetch order lines with cost fields (purchase_price is the direct cost field)
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
          
          // Calculate cost price with proper priority (purchase_price is Odoo's Cost field - column 8)
          let costPrice = 0;
          
          if (line.purchase_price !== undefined && line.purchase_price !== null && line.purchase_price !== false && line.purchase_price > 0) {
            // Priority 1: Direct purchase_price from Odoo (most accurate - this is the "Cost" column)
            costPrice = Number(line.purchase_price);
          } else if (line.margin !== undefined && line.margin !== null && line.margin !== false && line.margin > 0) {
            // Priority 2: Calculate from margin (price - margin = cost)
            costPrice = line.price_unit - line.margin;
          } else if (line.margin_percent && line.margin_percent > 0 && line.margin_percent < 100) {
            // Priority 3: Calculate from margin percentage
            costPrice = line.price_unit * (1 - line.margin_percent / 100);
          } else if (line.price_subtotal && line.product_uom_qty > 0) {
            // Priority 4: Use price as fallback when no cost data
            costPrice = line.price_subtotal / line.product_uom_qty;
          } else {
            // Priority 5: Last resort - use unit price as cost
            costPrice = line.price_unit;
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

        // Fetch project stage and analytic account from Odoo if analytic account exists
        let projectStageId = null;
        let projectStageName = 'Unassigned';
        let projectAnalyticAccountId = null;
        let projectAnalyticAccountName = null;
        let projectManagerName = null;
        let subcontractorId = null;
        let subcontractorName = null;
        
        if (order.analytic_account_id) {
          try {
            // Primary lookup: Find project linked to this analytic account
            const { data: projects } = await supabase.functions.invoke("odoo-query", {
              body: {
                model: "project.project",
                method: "search_read",
                args: [
                  [["analytic_account_id", "=", order.analytic_account_id[0]]],
                  ["id", "name", "analytic_account_id", "user_id", "stage_id"],
                ],
              },
            });

            let projectFound = projects && projects.length > 0;
            let project = projectFound ? projects[0] : null;

            // Fallback lookup: Try finding project by sale_order_id if no project found via analytic account
            if (!projectFound) {
              try {
                const { data: projectsBySO } = await supabase.functions.invoke("odoo-query", {
                  body: {
                    model: "project.project",
                    method: "search_read",
                    args: [
                      [["sale_order_id", "=", order.id]],
                      ["id", "name", "analytic_account_id", "user_id", "stage_id"],
                    ],
                  },
                });
                if (projectsBySO && projectsBySO.length > 0) {
                  project = projectsBySO[0];
                  projectFound = true;
                  logger.info(`✓ Found project via sale_order_id fallback for SO ${order.name}`);
                }
              } catch {
                // sale_order_id field may not exist on this Odoo instance - skip gracefully
                logger.info(`sale_order_id lookup not available for SO ${order.name}, skipping fallback`);
              }
            }

            if (projectFound && project) {
              const projectId = project.id;
              
              // Capture project manager (user_id from project.project)
              if (project.user_id && project.user_id[1]) {
                projectManagerName = project.user_id[1];
                logger.info(`✓ Found project manager for SO ${order.name}: ${projectManagerName}`);
              } else {
                logger.warn(`⚠ No project manager assigned for SO ${order.name} (Project ID: ${projectId})`);
              }
              
              // Capture project's analytic account (may differ from sale order)
              if (project.analytic_account_id) {
                projectAnalyticAccountId = project.analytic_account_id[0];
                projectAnalyticAccountName = project.analytic_account_id[1];
                
                // Log if project has different analytic account than sale order
                if (projectAnalyticAccountId !== order.analytic_account_id[0]) {
                  logger.info(`⚠️ Project has different analytic account than sale order`, {
                    saleOrder: order.name,
                    soAnalyticAccount: order.analytic_account_id,
                    projectAnalyticAccount: project.analytic_account_id
                  });
                }
              }
              
              // Use project-level stage (from project.project.stage_id) — NOT task stages
              if (project.stage_id && project.stage_id[0]) {
                projectStageId = project.stage_id[0];
                projectStageName = project.stage_id[1];
                logger.info(`Found project stage for SO ${order.name}: ${projectStageName}`);
              } else {
                logger.info(`No project stage set for SO ${order.name} (Project ID: ${projectId}), using Unassigned`);
              }
            } else {
              logger.info(`No project found for SO ${order.name}, using Unassigned`);
            }

            // Last resort fallback: use salesperson as project manager if still null
            if (!projectManagerName && order.user_id && order.user_id[1]) {
              projectManagerName = order.user_id[1];
              logger.info(`Using salesperson as PM fallback for SO ${order.name}: ${projectManagerName}`);
            }
          } catch (error) {
            logger.error(`Error fetching task stage for SO ${order.name}:`, error);
          }
          
          // Try to auto-detect subcontractor from purchase orders linked to this analytic account
          try {
            const { data: purchaseOrders } = await supabase.functions.invoke("odoo-query", {
              body: {
                model: "purchase.order",
                method: "search_read",
                args: [
                  [
                    ["analytic_account_id", "=", order.analytic_account_id[0]],
                    ["state", "in", ["purchase", "done"]],
                  ],
                  ["id", "name", "partner_id", "amount_total", "order_line"],
                  0,
                  5, // Get first 5 POs
                ],
              },
            });

            if (purchaseOrders && purchaseOrders.length > 0) {
              // Find PO with installation/service items by checking order lines
              for (const po of purchaseOrders) {
                // Simple heuristic: use the first confirmed PO's vendor as subcontractor
                if (po.partner_id && po.partner_id[0]) {
                  subcontractorId = po.partner_id[0];
                  subcontractorName = po.partner_id[1];
                  logger.info(`Auto-detected subcontractor for SO ${order.name}: ${subcontractorName}`);
                  break;
                }
              }
            }
          } catch (error) {
            logger.error(`Error auto-detecting subcontractor for SO ${order.name}:`, error);
          }
        } else {
          // No analytic account - use salesperson as PM fallback
          if (!projectManagerName && order.user_id && order.user_id[1]) {
            projectManagerName = order.user_id[1];
            logger.info(`No analytic account for SO ${order.name}, using salesperson as PM: ${projectManagerName}`);
          }
        }

        // Create job with additional search fields and date_order
        const { data: job, error: jobError } = await supabase
          .from("jobs")
          .insert([{
            user_id: user.id, // Legacy field for backwards compatibility
            created_by_user_id: user.id, // Track who created the job
            last_synced_at: new Date().toISOString(), // Mark as just synced
            last_synced_by_user_id: user.id,
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
            analytic_account_name: order.analytic_account_id ? order.analytic_account_id[1] : null,
            project_analytic_account_id: projectAnalyticAccountId,
            project_analytic_account_name: projectAnalyticAccountName,
            sales_person_name: salesPersonName,
            project_manager_name: projectManagerName,
            opportunity_name: order.opportunity_id ? order.opportunity_id[1] : null,
            date_order: order.date_order,
            project_stage_id: projectStageId,
            project_stage_name: projectStageName,
            subcontractor_id: subcontractorId,
            subcontractor_name: subcontractorName,
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
      handleSyncAll();
    }
  }, [salesOrders?.length, user?.id, hasAutoSynced, loadingSalesOrders, isSyncing]);

  // Consolidated sync function that syncs new jobs from Odoo, updates costs, and refreshes stages
  const handleSyncAll = async () => {
    if (!user) {
      toast.error("You must be logged in to sync");
      return;
    }

    setIsSyncing(true);
    
    try {
      let newJobsCount = 0;
      let updatedCostsCount = 0;
      let updatedStagesCount = 0;
      
      toast.info("Starting comprehensive sync with Odoo...");
      
      // Step 1: Sync new jobs from Odoo (from handleAutoSyncAll)
      if (salesOrders && salesOrders.length > 0) {
        toast.info("Step 1/3: Checking for new jobs...");
        
        for (const order of salesOrders) {
          // Check if already synced
          const { data: existingJob } = await supabase
            .from("jobs")
            .select("id")
            .eq("odoo_sale_order_id", order.id)
            .maybeSingle();

          if (existingJob) {
            continue;
          }
          
          // Create new job (simplified version)
          try {
            const { data: job } = await supabase
              .from("jobs")
              .insert([{
                user_id: user.id,
                created_by_user_id: user.id,
                last_synced_at: new Date().toISOString(),
                last_synced_by_user_id: user.id,
                odoo_sale_order_id: order.id,
                sale_order_name: order.name,
                customer_name: order.partner_id[1],
                total_budget: order.amount_total,
                material_budget: 0,
                non_material_budget: 0,
                total_actual: 0,
                material_actual: 0,
                non_material_actual: 0,
                status: 'active',
                analytic_account_id: order.analytic_account_id ? order.analytic_account_id[0] : null,
                analytic_account_name: order.analytic_account_id ? order.analytic_account_id[1] : null,
                sales_person_name: order.user_id ? order.user_id[1] : null,
                opportunity_name: order.opportunity_id ? order.opportunity_id[1] : null,
                date_order: order.date_order,
              }])
              .select()
              .single();
            
            if (job) newJobsCount++;
          } catch (error) {
            logger.error(`Error creating job for ${order.name}:`, error);
          }
        }
        
        // Refresh jobs list after creating new ones
        if (newJobsCount > 0) {
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait for cache to update
        }
      }
      
      // Step 2: Update costs for all jobs (from handleSyncCosts) with rate limiting
      const { data: currentJobs } = await supabase
        .from("jobs")
        .select("*")
        .order("date_order", { ascending: false });
      
      if (currentJobs && currentJobs.length > 0) {
        toast.info(`Step 2/3: Updating costs for ${currentJobs.length} jobs...`);
        
        // Create a rate limiter to prevent overwhelming the Edge Function
        const rateLimiter = new RateLimiter(5, 200); // Max 5 concurrent, 200ms between requests
        
        // Process jobs in batches with progress updates
        await processBatched(
          currentJobs,
          5, // Batch size: process 5 jobs at a time
          1000, // Wait 1 second between batches
          async (job, index) => {
            try {
              // Use rate limiter and retry logic for Odoo API calls
              const orderLines = await rateLimiter.execute(() =>
                retryWithBackoff(async () => {
                  const { data, error } = await supabase.functions.invoke("odoo-query", {
                    body: {
                      model: "sale.order.line",
                      method: "search_read",
                      args: [
                        [["order_id", "=", job.odoo_sale_order_id]],
                        ["id", "order_id", "product_id", "product_uom_qty", "price_unit", "price_subtotal", "purchase_price", "margin", "margin_percent"],
                      ],
                    },
                  });

                  if (error) throw error;
                  return data;
                }, 3, 1000, 5000) // Retry up to 3 times with exponential backoff
              );

              if (!orderLines || orderLines.length === 0) return;

              // Filter out lines with no product_id, zero sale price, or "DESCRIPTION OF WORKS"
              const lines = (orderLines as any[]).filter(line => {
                if (!line.product_id || !line.product_id[0]) return false;
                if (!line.price_subtotal || line.price_subtotal === 0) return false;
                
                const productName = line.product_id[1] || '';
                if (productName.toLowerCase().includes('description of works')) return false;
                
                return true;
              });

              if (lines.length === 0) return;

              // Calculate costs using same priority as initial sync
              const updatedBudgetLines = lines.map(line => {
                // Calculate cost price with proper priority
                let costPrice = 0;
                
                if (line.purchase_price !== undefined && line.purchase_price !== null && line.purchase_price !== false && line.purchase_price > 0) {
                  // Priority 1: Direct purchase_price from Odoo
                  costPrice = Number(line.purchase_price);
                } else if (line.margin !== undefined && line.margin !== null && line.margin !== false && line.margin > 0) {
                  // Priority 2: Calculate from margin
                  costPrice = line.price_unit - line.margin;
                } else if (line.margin_percent && line.margin_percent > 0 && line.margin_percent < 100) {
                  // Priority 3: Calculate from margin percentage
                  costPrice = line.price_unit * (1 - line.margin_percent / 100);
                } else if (line.price_subtotal && line.product_uom_qty > 0) {
                  // Priority 4: Use price as fallback
                  costPrice = line.price_subtotal / line.product_uom_qty;
                } else {
                  costPrice = line.price_unit;
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
                  last_synced_at: new Date().toISOString(),
                  last_synced_by_user_id: user.id,
                })
                .eq("id", job.id);

              if (jobUpdateError) {
                logger.error(`Error updating job totals:`, jobUpdateError);
              } else {
                updatedCostsCount++;
              }

            } catch (error) {
              logger.error(`Error syncing costs for job ${job.sale_order_name}:`, error);
            }
          },
          (completed, total) => {
            // Progress callback - update toast every 10 jobs
            if (completed % 10 === 0) {
              toast.info(`Step 2/3: Updated ${completed}/${total} jobs...`);
            }
          }
        );
      }
      
      // Step 3: Update project stages for all jobs (from handleRefreshStages) with rate limiting
      const { data: jobsWithAnalytic } = await supabase
        .from("jobs")
        .select("*")
        .not("analytic_account_id", "is", null);
      
      if (jobsWithAnalytic && jobsWithAnalytic.length > 0) {
        toast.info(`Step 3/3: Refreshing stages for ${jobsWithAnalytic.length} jobs...`);
        
        // Create a rate limiter for stage updates
        const stageRateLimiter = new RateLimiter(5, 200);
        
        // Process jobs in batches
        await processBatched(
          jobsWithAnalytic,
          5, // Batch size
          1000, // Wait between batches
          async (job) => {
            try {
              // Find project linked to this analytic account with retry logic
              const projects = await stageRateLimiter.execute(() =>
                retryWithBackoff(async () => {
                  const { data, error } = await supabase.functions.invoke("odoo-query", {
                    body: {
                      model: "project.project",
                      method: "search_read",
                      args: [
                        [["analytic_account_id", "=", job.analytic_account_id]],
                        ["id", "name", "stage_id"],
                      ],
                    },
                  });

                  if (error) throw error;
                  return data;
                }, 3, 1000, 5000)
              );

              if (!projects || projects.length === 0) {
                return;
              }

              const project = projects[0];
              const stageName = project.stage_id?.[1] || null;

              // Update job with project stage
              await supabase
                .from("jobs")
                .update({
                  project_stage_name: stageName,
                })
                .eq("id", job.id);

              updatedStagesCount++;
            } catch (error) {
              logger.error(`Error refreshing stage for job ${job.sale_order_name}:`, error);
            }
          },
          (completed, total) => {
            // Progress callback
            if (completed % 10 === 0) {
              toast.info(`Step 3/3: Refreshed ${completed}/${total} job stages...`);
            }
          }
        );
      }

      // Final summary
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      const messages = [];
      if (newJobsCount > 0) messages.push(`${newJobsCount} new job(s) created`);
      if (updatedCostsCount > 0) messages.push(`${updatedCostsCount} job(s) costs updated`);
      if (updatedStagesCount > 0) messages.push(`${updatedStagesCount} job(s) stages refreshed`);
      
      if (messages.length > 0) {
        toast.success(`Sync complete! ${messages.join(', ')}`);
      } else {
        toast.info("Sync complete - all data is up to date");
      }
    } catch (error) {
      logger.error("Error syncing with Odoo:", error);
      toast.error("Failed to sync with Odoo. Check console for details.");
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
        try {
          let project: any = null;

          // Primary lookup: Find project via analytic account
          if (job.analytic_account_id) {
            const { data: projects } = await supabase.functions.invoke("odoo-query", {
              body: {
                model: "project.project",
                method: "search_read",
                args: [
                  [["analytic_account_id", "=", job.analytic_account_id]],
                  ["id", "name", "user_id", "stage_id"],
                ],
              },
            });
            if (projects && projects.length > 0) {
              project = projects[0];
            }
          }

          // Fallback lookup: Try finding project by sale_order_id
          if (!project && job.odoo_sale_order_id) {
            try {
              const { data: projectsBySO } = await supabase.functions.invoke("odoo-query", {
                body: {
                  model: "project.project",
                  method: "search_read",
                  args: [
                    [["sale_order_id", "=", job.odoo_sale_order_id]],
                    ["id", "name", "user_id", "stage_id"],
                  ],
                },
              });
              if (projectsBySO && projectsBySO.length > 0) {
                project = projectsBySO[0];
                logger.info(`✓ Found project via sale_order_id fallback for ${job.sale_order_name}`);
              }
            } catch {
              // sale_order_id field may not exist - skip gracefully
            }
          }

          if (!project) {
            // Last resort: use salesperson name as PM if available and PM is currently null
            if (!job.project_manager_name && job.sales_person_name) {
              await supabase
                .from("jobs")
                .update({ project_manager_name: job.sales_person_name })
                .eq("id", job.id);
              logger.info(`No project found for ${job.sale_order_name}, using salesperson as PM: ${job.sales_person_name}`);
              updatedCount++;
            } else {
              logger.info(`No project found for ${job.sale_order_name}`);
            }
            continue;
          }

          // Resolve PM: project PM > existing job PM > salesperson fallback
          const projectPM = project.user_id?.[1] || null;
          const resolvedPM = projectPM || job.project_manager_name || job.sales_person_name || null;

          // Build the update object - NEVER overwrite PM with null
          const jobUpdate: Record<string, any> = {};
          if (resolvedPM) {
            jobUpdate.project_manager_name = resolvedPM;
          }

          // Use project-level stage directly (from project.project.stage_id) — NOT task stages
          if (project.stage_id && project.stage_id[0]) {
            jobUpdate.project_stage_id = project.stage_id[0];
            jobUpdate.project_stage_name = project.stage_id[1];
          }

          // Only write to DB if we have something to update
          if (Object.keys(jobUpdate).length > 0) {
            await supabase
              .from("jobs")
              .update(jobUpdate)
              .eq("id", job.id);

            logger.info(`Updated ${job.sale_order_name}: ${JSON.stringify(jobUpdate)}`);
            updatedCount++;
          }
        } catch (error) {
          logger.error(`Error refreshing stage for job ${job.sale_order_name}:`, error);
        }
      }

      // Diagnostic: count how many jobs now have PM assigned
      const { data: allJobs } = await supabase.from("jobs").select("project_manager_name, sale_order_name");
      const withPM = allJobs?.filter(j => j.project_manager_name) || [];
      const withoutPM = allJobs?.filter(j => !j.project_manager_name) || [];
      logger.info(`PM diagnostic: ${withPM.length}/${allJobs?.length} jobs have a project manager assigned`);
      if (withoutPM.length > 0) {
        logger.info(`Jobs missing PM: ${withoutPM.map(j => j.sale_order_name).join(', ')}`);
      }

      if (updatedCount > 0) {
        toast.success(`Updated ${updatedCount} job(s)! (${withPM.length}/${allJobs?.length} have PM assigned)`);
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
      } else {
        toast.info(`No stage updates needed (${withPM.length}/${allJobs?.length} have PM assigned)`);
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
        {/* 1. Header */}
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
              onClick={handleSyncAll} 
              disabled={isSyncing || loadingSalesOrders}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync All Jobs
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 2. AI Insights (Collapsible) */}
        {filteredJobs.length > 0 && (
          <Collapsible open={aiInsightsOpen} onOpenChange={setAiInsightsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 -ml-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${aiInsightsOpen ? '' : '-rotate-90'}`} />
                AI Insights
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <AIInsights jobs={filteredJobs} analysisType="all" />
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 3. Summary Dashboard Cards */}
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

            <Card
              className="cursor-pointer transition-all hover:shadow-md hover:border-red-300 hover:bg-red-50/50"
              onClick={() => overBudgetJobs.length > 0 && setJobListModalType("overBudget")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                  Over Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {overBudgetJobs.length}
                </div>
                {overBudgetJobs.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">Click to view jobs</p>
                )}
              </CardContent>
            </Card>

            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card
                    className="cursor-pointer transition-all hover:shadow-md hover:border-yellow-300 hover:bg-yellow-50/50"
                    onClick={() => atRiskJobs.length > 0 && setJobListModalType("atRisk")}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                        At Risk
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-yellow-600">
                        {atRiskJobs.length}
                      </div>
                      {atRiskJobs.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Click to view jobs</p>
                      )}
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                {atRiskJobs.length > 0 && (
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="font-semibold mb-1">At Risk Jobs (80-100% utilized):</p>
                    <ul className="text-xs space-y-0.5">
                      {atRiskJobs.slice(0, 10).map((job) => (
                        <li key={job.id} className="flex justify-between gap-3">
                          <span className="truncate">{job.sale_order_name} — {job.customer_name}</span>
                          <span className="text-yellow-600 font-medium whitespace-nowrap">
                            {(job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0).toFixed(0)}%
                          </span>
                        </li>
                      ))}
                      {atRiskJobs.length > 10 && (
                        <li className="text-muted-foreground italic">
                          +{atRiskJobs.length - 10} more...
                        </li>
                      )}
                    </ul>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* 4. Search + Filter Bar (combined row) */}
        <JobFilterBar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          budgetSort={budgetSort}
          onBudgetSortChange={setBudgetSort}
          budgetFilter={budgetFilter}
          onBudgetFilterChange={setBudgetFilter}
          view={view}
          onViewChange={setView}
          projectManager={projectManager}
          onProjectManagerChange={setProjectManager}
          stage={stage}
          onStageChange={setStage}
          stages={stages}
          isLoadingStages={loadingStages}
          subcontractor={subcontractor}
          onSubcontractorChange={setSubcontractor}
          onClearAll={handleClearAll}
          hasActiveFilters={hasActiveFilters}
          jobPMNames={jobPMNames}
        />

        {/* 5. Job List */}
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

      {/* Over Budget / At Risk Job List Modal */}
      <JobListModal
        open={jobListModalType !== null}
        onOpenChange={(open) => {
          if (!open) setJobListModalType(null);
        }}
        jobs={jobListModalType === "overBudget" ? overBudgetJobs : atRiskJobs}
        title={jobListModalType === "overBudget" ? "Over Budget Jobs" : "At Risk Jobs"}
        variant={jobListModalType ?? "overBudget"}
      />
    </DashboardLayout>
  );
}
