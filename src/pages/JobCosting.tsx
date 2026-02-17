import { useState, useMemo, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, AlertTriangle, TrendingUp, ChevronDown, ShieldAlert, Trash2, Brain } from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import { useNavigate } from "react-router-dom";
import { useMLInsights } from "@/hooks/useMLPredictions";
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
import { formatCompactCurrency } from "@/lib/utils";
import { KanbanView } from "@/components/job-costing/KanbanView";
import { GridView } from "@/components/job-costing/GridView";
import { AIInsights } from "@/components/job-costing/AIInsights";
import { SafeSection } from "@/components/SafeSection";
import { processBatched, retryWithBackoff, RateLimiter } from "@/utils/rateLimit";
import { JobListModal } from "@/components/job-costing/JobListModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/utils";

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

  const { data: mlInsights } = useMLInsights();
  const mlOverruns = mlInsights?.overrun_warnings?.filter((o) => o.risk_level === "high" || o.risk_level === "medium").length ?? 0;
  const mlAnomalies = mlInsights?.anomaly_scores?.filter((a) => a.is_anomaly).length ?? 0;
  const mlWasteRisks = mlInsights?.waste_risks?.filter((w) => w.risk_level === "high" || w.risk_level === "medium").length ?? 0;

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
        
        try {
          let project: any = null;

          // Primary lookup: Find project linked to this analytic account
          if (order.analytic_account_id) {
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
            if (projects && projects.length > 0) {
              project = projects[0];
              logger.info(`✓ Found project via analytic_account_id for SO ${order.name}`);
            }
          }

          // Fallback 1: Find project by name matching opportunity name
          if (!project && order.opportunity_id && order.opportunity_id[1]) {
            try {
              const { data: projectsByName } = await supabase.functions.invoke("odoo-query", {
                body: {
                  model: "project.project",
                  method: "search_read",
                  args: [
                    [["name", "=ilike", order.opportunity_id[1]]],
                    ["id", "name", "analytic_account_id", "user_id", "stage_id"],
                  ],
                },
              });
              if (projectsByName && projectsByName.length > 0) {
                project = projectsByName[0];
                logger.info(`✓ Found project via name match for SO ${order.name}: "${order.opportunity_id[1]}"`);
              }
            } catch {
              logger.info(`Name-based project lookup not available for SO ${order.name}`);
            }
          }

          // Fallback 2: Try finding project by sale_order_id (retained for future use)
          if (!project) {
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
                logger.info(`✓ Found project via sale_order_id for SO ${order.name}`);
              }
            } catch {
              // sale_order_id field may not exist on this Odoo instance
            }
          }

          if (project) {
            // Capture project manager (user_id from project.project)
            if (project.user_id && project.user_id[1]) {
              projectManagerName = project.user_id[1];
              logger.info(`✓ Found project manager for SO ${order.name}: ${projectManagerName}`);
            } else {
              logger.warn(`⚠ No project manager assigned for SO ${order.name} (Project: ${project.name})`);
            }

            // Capture project's analytic account (may differ from sale order)
            if (project.analytic_account_id) {
              projectAnalyticAccountId = project.analytic_account_id[0];
              projectAnalyticAccountName = project.analytic_account_id[1];
            }

            // Use project-level stage (from project.project.stage_id)
            if (project.stage_id && project.stage_id[0]) {
              projectStageId = project.stage_id[0];
              projectStageName = project.stage_id[1];
              logger.info(`Found project stage for SO ${order.name}: ${projectStageName}`);
            } else {
              logger.info(`No project stage set for SO ${order.name}, using Unassigned`);
            }
          } else {
            logger.info(`No project found for SO ${order.name}, using Unassigned`);
          }
        } catch (error) {
          logger.error(`Error looking up project for SO ${order.name}:`, error);
        }

        // Try to auto-detect subcontractor from purchase orders linked to this analytic account
        if (order.analytic_account_id) {
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
                  5,
                ],
              },
            });

            if (purchaseOrders && purchaseOrders.length > 0) {
              for (const po of purchaseOrders) {
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

  // Trigger auto-sync once on mount — only creates NEW jobs (skips existing)
  useEffect(() => {
    if (!loadingSalesOrders && salesOrders && salesOrders.length > 0 && user && !isSyncing && !hasAutoSynced) {
      setHasAutoSynced(true);
      handleAutoSyncAll();
    }
  }, [salesOrders?.length, user?.id, hasAutoSynced, loadingSalesOrders, isSyncing]);

  // Helper: fetch order lines from Odoo, categorize, and calculate cost budgets for a single job
  const syncJobBudgetLines = async (jobId: string, saleOrderId: number) => {
    // Fetch order lines with cost fields
    const { data: orderLines, error: linesError } = await supabase.functions.invoke("odoo-query", {
      body: {
        model: "sale.order.line",
        method: "search_read",
        args: [
          [["order_id", "=", saleOrderId]],
          ["id", "order_id", "product_id", "product_uom_qty", "price_unit", "price_subtotal", "purchase_price", "margin", "margin_percent"],
        ],
      },
    });
    if (linesError) throw linesError;

    // Filter out lines with no product, zero price, or description-only
    const lines = ((orderLines as any[]) || []).filter(line => {
      if (!line.product_id || !line.product_id[0]) return false;
      if (!line.price_subtotal || line.price_subtotal === 0) return false;
      const productName = line.product_id[1] || '';
      if (productName.toLowerCase().includes('description of works')) return false;
      return true;
    });

    if (lines.length === 0) return;

    // Fetch product details for type classification
    const productIds = lines.map((l: any) => l.product_id[0]);
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
    const productMap = new Map(((products as any[]) || []).map(p => [p.id, p]));

    const serviceKeywords = [
      'INSTALLATION', 'FREIGHT', 'CRANAGE', 'ACCOMMODATION', 'TRAVEL',
      'TRANSPORT', 'DELIVERY', 'LABOUR', 'SERVICE', 'SITE INSPECTION',
      'WORKSHOP LABOUR', 'SHOP DRAWING', 'MAN DAY', 'EXPENSES', 'SITE LABOUR'
    ];

    const materialLines: any[] = [];
    const nonMaterialLines: any[] = [];

    lines.forEach((line: any) => {
      const product = productMap.get(line.product_id[0]);
      const productName = line.product_id[1] || '';
      const productNameUpper = productName.toUpperCase();
      let productType = ((product?.detailed_type || product?.type || 'product') as string).toLowerCase();

      if (serviceKeywords.some(kw => productNameUpper.includes(kw)) && productType !== 'service') {
        productType = 'service';
      }

      // 5-tier cost price priority
      let costPrice = 0;
      if (line.purchase_price !== undefined && line.purchase_price !== null && line.purchase_price !== false && line.purchase_price > 0) {
        costPrice = Number(line.purchase_price);
      } else if (line.margin !== undefined && line.margin !== null && line.margin !== false && line.margin > 0) {
        costPrice = line.price_unit - line.margin;
      } else if (line.margin_percent && line.margin_percent > 0 && line.margin_percent < 100) {
        costPrice = line.price_unit * (1 - line.margin_percent / 100);
      } else if (line.price_subtotal && line.product_uom_qty > 0) {
        costPrice = line.price_subtotal / line.product_uom_qty;
      } else {
        costPrice = line.price_unit;
      }
      costPrice = Math.max(0, costPrice);

      const quantity = line.product_uom_qty;
      let costSubtotal = quantity > 0 ? costPrice * quantity : line.price_subtotal || 0;
      if ((!costSubtotal || costSubtotal <= 0) && line.price_subtotal) {
        costSubtotal = line.price_subtotal;
      }

      const category = productType === 'service' ? 'non_material' : 'material';
      const enrichedLine = {
        ...line,
        detailed_type: productType,
        cost_price: costPrice,
        cost_subtotal: costSubtotal,
        cost_category: category,
      };

      if (category === 'non_material') {
        nonMaterialLines.push(enrichedLine);
      } else {
        materialLines.push(enrichedLine);
      }
    });

    const materialBudget = materialLines.reduce((sum, l) => sum + l.cost_subtotal, 0);
    const nonMaterialBudget = nonMaterialLines.reduce((sum, l) => sum + l.cost_subtotal, 0);

    // Delete existing budget lines for this job (clean slate)
    await supabase.from("job_budget_lines").delete().eq("job_id", jobId);

    // Insert fresh budget lines
    const allLines = [...materialLines, ...nonMaterialLines];
    const budgetRows = allLines.map(line => ({
      job_id: jobId,
      odoo_line_id: line.id,
      product_id: line.product_id[0],
      product_name: line.product_id[1],
      product_type: line.detailed_type,
      quantity: line.product_uom_qty,
      unit_price: line.cost_price,
      subtotal: line.cost_subtotal,
      cost_category: line.cost_category,
    }));

    if (budgetRows.length > 0) {
      const { error: insertErr } = await supabase.from("job_budget_lines").insert(budgetRows);
      if (insertErr) {
        logger.error(`Budget lines insert error for job ${jobId}:`, insertErr);
      }
    }

    // Update job budget totals
    await supabase.from("jobs").update({
      material_budget: materialBudget,
      non_material_budget: nonMaterialBudget,
      total_budget: materialBudget + nonMaterialBudget,
      last_synced_at: new Date().toISOString(),
      last_synced_by_user_id: user?.id,
    }).eq("id", jobId);

    return { materialBudget, nonMaterialBudget };
  };

  // Full sync: create new jobs + update budgets for existing + refresh stages/PM
  const handleFullSync = async () => {
    if (!user) {
      toast.error("You must be logged in to sync");
      return;
    }

    setIsSyncing(true);

    try {
      // Step 1: Create any new jobs using the complete sync path
      toast.info("Step 1/3: Checking for new jobs...");
      await handleAutoSyncAll();

      // Step 2: Update budgets for ALL existing jobs
      const { data: allJobs } = await supabase
        .from("jobs")
        .select("id, odoo_sale_order_id, sale_order_name")
        .order("date_order", { ascending: false });

      if (allJobs && allJobs.length > 0) {
        toast.info(`Step 2/3: Updating budgets for ${allJobs.length} jobs...`);

        const rateLimiter = new RateLimiter(3, 300);
        let updatedCount = 0;

        await processBatched(
          allJobs,
          3,
          1500,
          async (job) => {
            try {
              await rateLimiter.execute(() =>
                retryWithBackoff(
                  () => syncJobBudgetLines(job.id, job.odoo_sale_order_id),
                  2, 1000, 5000
                )
              );
              updatedCount++;
            } catch (error) {
              logger.error(`Error updating budget for ${job.sale_order_name}:`, error);
            }
          },
          (completed, total) => {
            if (completed % 10 === 0) {
              toast.info(`Step 2/3: Updated ${completed}/${total} job budgets...`);
            }
          }
        );
      }

      // Step 3: Refresh stages and PM for all jobs
      toast.info("Step 3/3: Refreshing stages and project managers...");
      await handleRefreshStages();

      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success("Full sync complete!");
    } catch (error) {
      logger.error("Error during full sync:", error);
      toast.error("Failed to complete full sync. Check console for details.");
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
              logger.info(`✓ Found project via analytic_account_id for ${job.sale_order_name}`);
            }
          }

          // Fallback 1: Find project by name matching opportunity name
          if (!project && job.opportunity_name) {
            try {
              const { data: projectsByName } = await supabase.functions.invoke("odoo-query", {
                body: {
                  model: "project.project",
                  method: "search_read",
                  args: [
                    [["name", "=ilike", job.opportunity_name]],
                    ["id", "name", "user_id", "stage_id"],
                  ],
                },
              });
              if (projectsByName && projectsByName.length > 0) {
                project = projectsByName[0];
                logger.info(`✓ Found project via name match for ${job.sale_order_name}: "${job.opportunity_name}"`);
              }
            } catch {
              // =ilike may not be supported
            }
          }

          // Fallback 2: Try finding project by sale_order_id (retained for future use)
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
                logger.info(`✓ Found project via sale_order_id for ${job.sale_order_name}`);
              }
            } catch {
              // sale_order_id field may not exist
            }
          }

          if (!project) {
            logger.info(`No project found for ${job.sale_order_name}`);
            continue;
          }

          // Build the update object - use project PM, never overwrite with null
          const projectPM = project.user_id?.[1] || null;
          const jobUpdate: Record<string, any> = {};
          if (projectPM) {
            jobUpdate.project_manager_name = projectPM;
          }

          // Use project-level stage directly (from project.project.stage_id)
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
              onClick={handleFullSync} 
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

        {/* ML Risk Summary Strip */}
        <SafeSection name="ML Risk Strip" silent>
        {(mlOverruns > 0 || mlAnomalies > 0 || mlWasteRisks > 0) && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border bg-muted/50">
            <Brain className="h-4 w-4 text-violet-500 flex-shrink-0" />
            <span className="text-xs font-medium text-muted-foreground mr-1">ML Risks:</span>
            {mlOverruns > 0 && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {mlOverruns} overrun
              </Badge>
            )}
            {mlAnomalies > 0 && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400">
                <ShieldAlert className="h-3 w-3 mr-1" />
                {mlAnomalies} anomal{mlAnomalies === 1 ? "y" : "ies"}
              </Badge>
            )}
            {mlWasteRisks > 0 && (
              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400">
                <Trash2 className="h-3 w-3 mr-1" />
                {mlWasteRisks} waste risk
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => navigate("/ml-dashboard")}>
              View Dashboard
            </Button>
          </div>
        )}
        </SafeSection>

        {/* 2. AI Insights (Collapsible) */}
        <SafeSection name="AI Insights">
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
        </SafeSection>

        {/* 3. Summary Dashboard Cards with hover details */}
        {filteredJobs && filteredJobs.length > 0 && (() => {
          const totalBudget = filteredJobs.reduce((sum, job) => sum + job.total_budget, 0);
          const totalActual = filteredJobs.reduce((sum, job) => sum + job.total_actual, 0);
          const utilPct = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
          const topByBudget = [...filteredJobs].sort((a, b) => b.total_budget - a.total_budget).slice(0, 5);
          const topByActual = [...filteredJobs].sort((a, b) => b.total_actual - a.total_actual).slice(0, 5);
          const avgBudget = totalBudget / filteredJobs.length;
          const avgActual = totalActual / filteredJobs.length;
          const noBudgetCount = filteredJobs.filter(j => j.total_budget === 0).length;
          const topByUtil = [...filteredJobs]
            .filter(j => j.total_budget > 0)
            .map(j => ({ ...j, util: (j.total_actual / j.total_budget) * 100 }))
            .sort((a, b) => b.util - a.util)
            .slice(0, 5);

          return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <Card className="cursor-default transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Active Jobs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{filteredJobs.length}</div>
                    </CardContent>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent side="bottom" className="w-72">
                  <p className="font-semibold text-sm mb-2">Top Jobs by Budget</p>
                  <ul className="space-y-1">
                    {topByBudget.map(j => (
                      <li key={j.id} className="flex justify-between text-xs gap-2">
                        <span className="truncate">{j.sale_order_name} — {j.customer_name}</span>
                        <span className="font-medium whitespace-nowrap">{formatCurrency(j.total_budget)}</span>
                      </li>
                    ))}
                  </ul>
                  {noBudgetCount > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-2">{noBudgetCount} job(s) have no budget set</p>
                  )}
                </HoverCardContent>
              </HoverCard>

              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <Card className="cursor-default transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCompactCurrency(totalBudget)}</div>
                    </CardContent>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent side="bottom" className="w-72">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Average per job</span>
                      <span className="font-medium">{formatCurrency(avgBudget)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Material</span>
                      <span className="font-medium">{formatCurrency(filteredJobs.reduce((s, j) => s + j.material_budget, 0))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Non-Material</span>
                      <span className="font-medium">{formatCurrency(filteredJobs.reduce((s, j) => s + j.non_material_budget, 0))}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pt-1 border-t">Largest: {topByBudget[0]?.sale_order_name} ({formatCurrency(topByBudget[0]?.total_budget)})</p>
                  </div>
                </HoverCardContent>
              </HoverCard>

              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <Card className="cursor-default transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCompactCurrency(totalActual)}</div>
                    </CardContent>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent side="bottom" className="w-72">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Average per job</span>
                      <span className="font-medium">{formatCurrency(avgActual)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Material</span>
                      <span className="font-medium">{formatCurrency(filteredJobs.reduce((s, j) => s + j.material_actual, 0))}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Non-Material</span>
                      <span className="font-medium">{formatCurrency(filteredJobs.reduce((s, j) => s + j.non_material_actual, 0))}</span>
                    </div>
                    <p className="font-semibold text-xs mt-2">Top Spending Jobs</p>
                    <ul className="space-y-0.5">
                      {topByActual.slice(0, 3).map(j => (
                        <li key={j.id} className="flex justify-between text-xs gap-2">
                          <span className="truncate">{j.sale_order_name}</span>
                          <span className="font-medium whitespace-nowrap">{formatCurrency(j.total_actual)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </HoverCardContent>
              </HoverCard>

              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <Card className="cursor-default transition-all hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Utilization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${utilPct > 100 ? 'text-red-600' : utilPct > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {utilPct.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </HoverCardTrigger>
                <HoverCardContent side="bottom" className="w-72">
                  <p className="font-semibold text-sm mb-2">Highest Utilization Jobs</p>
                  <ul className="space-y-1">
                    {topByUtil.map(j => (
                      <li key={j.id} className="flex justify-between text-xs gap-2">
                        <span className="truncate">{j.sale_order_name} — {j.customer_name}</span>
                        <span className={`font-medium whitespace-nowrap ${j.util > 100 ? 'text-red-600' : j.util > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                          {j.util.toFixed(0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-0.5">
                    <div className="flex justify-between"><span>Under 80%</span><span>{filteredJobs.filter(j => j.total_budget > 0 && (j.total_actual / j.total_budget) * 100 <= 80).length} jobs</span></div>
                    <div className="flex justify-between"><span>80-100%</span><span>{atRiskJobs.length} jobs</span></div>
                    <div className="flex justify-between"><span>Over 100%</span><span>{overBudgetJobs.length} jobs</span></div>
                  </div>
                </HoverCardContent>
              </HoverCard>

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
                  <div className="text-2xl font-bold text-red-600">{overBudgetJobs.length}</div>
                  {overBudgetJobs.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Click to view jobs</p>
                  )}
                </CardContent>
              </Card>

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
                  <div className="text-2xl font-bold text-yellow-600">{atRiskJobs.length}</div>
                  {atRiskJobs.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Click to view jobs</p>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })()}

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
