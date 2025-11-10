import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Plus, Trash2, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useJobBOM } from "@/hooks/useJobBOM";
import { useJobNonMaterialCosts } from "@/hooks/useJobNonMaterialCosts";
import { useJobCostAnalysis } from "@/hooks/useJobCostAnalysis";
import { CostAnalysisCard } from "@/components/job-costing/CostAnalysisCard";
import { AnalyticLinesTable } from "@/components/job-costing/AnalyticLinesTable";
import { AnalyticLinesMaterialTable } from "@/components/job-costing/AnalyticLinesMaterialTable";
import { BomBreakdownCard } from "@/components/job-costing/BomBreakdownCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useOdooProducts } from "@/hooks/useOdooProducts";
import { useOdooSaleOrderLines } from "@/hooks/useOdooSaleOrderLines";
import { JobCostingSummary } from "@/components/job-costing/JobCostingSummary";
import { BudgetCircleChart } from "@/components/job-costing/BudgetCircleChart";
import { Database } from "@/integrations/supabase/types";
import confetti from "canvas-confetti";

export default function JobCostingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: job, isLoading: loadingJob } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: budgetLines, isLoading: loadingBudget } = useQuery({
    queryKey: ["job-budget-lines", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_budget_lines")
        .select("*")
        .eq("job_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { bomLines, isLoading: loadingBOM, createBOMLineAsync, deleteBOMLineAsync, importBOMFromCSVAsync } = useJobBOM(id);
  const { costs, isLoading: loadingCosts, createCost, updateCost, deleteCost } = useJobNonMaterialCosts(id);
  const { analysis, isLoading: loadingAnalysis } = useJobCostAnalysis(job);
  const { data: saleOrderLines, isLoading: loadingSaleOrderLines, refetch: refetchSaleOrderLines } = useOdooSaleOrderLines(job?.odoo_sale_order_id);

  // Auto-refresh analytic lines on job load to ensure we have the latest data
  useEffect(() => {
    if (job?.analytic_account_id) {
      // Invalidate the analytic lines query to trigger a fresh fetch
      queryClient.invalidateQueries({ queryKey: ["odoo-analytic-lines", job.analytic_account_id] });
    }
  }, [job?.analytic_account_id, queryClient]);
  const materialPurchasePriceMap = useMemo(() => {
    const map = new Map<number, number>();
    if (saleOrderLines && saleOrderLines.length > 0) {
      for (const line of saleOrderLines as any[]) {
        try {
          const pid = Array.isArray(line.product_id) ? line.product_id[0] : undefined;
          if (!pid) continue;

          let cost = 0;

          const actualCost = Number(line.actual_cost || 0);
          if (actualCost && actualCost > 0) {
            cost = actualCost;
          } else {
            const margin = (line as any).margin;
            if (margin !== undefined && margin !== null && margin !== false) {
              cost = Number(line.price_unit) - Number(margin);
            }

            if (!cost || cost <= 0) {
              const marginPercent = Number(line.margin_percent || 0);
              if (marginPercent > 0 && marginPercent < 100) {
                cost = Number(line.price_unit) * (1 - marginPercent / 100);
              }
            }

            if (!cost || cost <= 0) {
              const purchasePrice = Number(line.purchase_price || 0);
              if (purchasePrice > 0) cost = purchasePrice;
            }

            if (!cost || cost <= 0) {
              const productCost = Number(line.product_cost || 0);
              if (productCost > 0) cost = productCost;
            }

            if (!cost || cost <= 0) {
              const costPrice = Number(line.cost_price || 0);
              if (costPrice > 0) cost = costPrice;
            }

            if ((!cost || cost <= 0) && line.standard_price !== undefined && line.standard_price !== null) {
              const standardPrice = Number(line.standard_price || 0);
              if (standardPrice > 0) cost = standardPrice;
            }

            if ((!cost || cost <= 0) && line.total_cost && line.product_uom_qty) {
              const perUnit = Number(line.total_cost) / Number(line.product_uom_qty || 1);
              if (perUnit > 0 && Number.isFinite(perUnit)) {
                cost = perUnit;
              }
            }
          }

          cost = Math.max(0, Number.isFinite(cost) ? cost : 0);
          map.set(pid, cost);
        } catch (error) {
          console.warn('Failed to compute cost for sale order line', error);
        }
      }
    }
    return map;
  }, [saleOrderLines]);

  const SERVICE_KEYWORDS = [
    "INSTALLATION",
    "FREIGHT",
    "CRANAGE",
    "ACCOMMODATION",
    "TRAVEL",
    "TRANSPORT",
    "DELIVERY",
    "LABOUR",
    "SERVICE",
    "SITE INSPECTION",
    "WORKSHOP LABOUR",
    "SHOP DRAWING",
    "MAN DAY",
    "EXPENSES",
    "SITE LABOUR"
  ];

  const isServiceName = (name?: string | null) => {
    const upper = name?.toUpperCase() || "";
    return SERVICE_KEYWORDS.some((keyword) => upper.includes(keyword));
  };

const resolveBomLineTotal = (line: { total_cost?: number | null; unit_cost?: number | null; quantity?: number | null }) => {
    if (line.total_cost !== undefined && line.total_cost !== null) {
      return Number(line.total_cost);
    }
  const subtotal = (line as any).subtotal;
  if (subtotal !== undefined && subtotal !== null) {
    return Number(subtotal);
  }
    const unit = Number(line.unit_cost ?? 0);
    const quantity = Number(line.quantity ?? 0);
    const computed = unit * quantity;
    return Number.isFinite(computed) ? computed : 0;
  };

  const isServiceBudgetLine = (line: Database["public"]["Tables"]["job_budget_lines"]["Row"]) => {
    const type = line.product_type?.toString().toLowerCase() || "";
    if (type === "service") return true;
    return isServiceName(line.product_name);
  };

  const isMaterialBudgetLine = (line: Database["public"]["Tables"]["job_budget_lines"]["Row"]) => !isServiceBudgetLine(line);

  const formatNumber = (value: number) => (Number.isFinite(value) ? formatCurrency(value) : formatCurrency(0));

  const [isAddBOMOpen, setIsAddBOMOpen] = useState(false);
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Consolidated sync function that combines all sync operations
  const handleSyncWithOdoo = async () => {
    if (!job || !id) return;
    
    setIsSyncing(true);
    toast.info("Syncing with Odoo...");
    
    try {
      // 1. Refresh budget line costs from sale order
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
      
      if (linesError) throw linesError;
      
      const lines = (orderLines as any[]) || [];
      const updatedBudgetLines = lines.map(line => {
        // Calculate cost price with proper priority
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
        const costSubtotal = costPrice * quantity;

        return {
          odoo_line_id: line.id,
          unit_price: costPrice,
          subtotal: costSubtotal,
        };
      });
      
      // Update existing budget lines
      for (const update of updatedBudgetLines) {
        await supabase
          .from("job_budget_lines")
          .update({
            unit_price: update.unit_price,
            subtotal: update.subtotal,
          })
          .eq("job_id", id)
          .eq("odoo_line_id", update.odoo_line_id);
      }
      
      // 2. Update project stage
      if (job.analytic_account_id) {
        const { data: projects } = await supabase.functions.invoke("odoo-query", {
          body: {
            model: "project.project",
            method: "search_read",
            args: [
              [["analytic_account_id", "=", job.analytic_account_id]],
              ["id", "name", "stage_id"],
            ],
          },
        });

        const projectData = projects as any[];
        if (projectData && projectData.length > 0) {
          const project = projectData[0];
          const stageName = project.stage_id?.[1] || null;
          
          await supabase
            .from("jobs")
            .update({ project_stage_name: stageName })
            .eq("id", id);
        }
      }
      
      // 3. Mark job as synced
      await supabase
        .from("jobs")
        .update({ 
          last_synced_at: new Date().toISOString()
        })
        .eq("id", id);
      
      // 4. Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      queryClient.invalidateQueries({ queryKey: ["job-budget-lines", id] });
      queryClient.invalidateQueries({ queryKey: ["sale-order-lines", job.odoo_sale_order_id] });
      
      toast.success("Successfully synced with Odoo!");
      
    } catch (error) {
      console.error("Error syncing with Odoo:", error);
      toast.error("Failed to sync with Odoo. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Smart sync: Auto-refresh if data is stale (> 1 hour old)
  useEffect(() => {
    if (!job || !id) return;
    
    const lastSync = job.last_synced_at;
    const isStale = !lastSync || (Date.now() - new Date(lastSync).getTime()) > 3600000; // 1 hour
    
    if (isStale && !isSyncing) {
      // Auto-refresh in background
      handleSyncWithOdoo();
    }
  }, [job?.id]); // Only trigger on job ID change, not on job object changes
  
  const [productSearch, setProductSearch] = useState("");
  const { data: products } = useOdooProducts(productSearch);

  // Calculate budgets from budget_lines table (fixes donut chart source bug)
  const materialBudget = useMemo(() => {
    return budgetLines
      ?.filter(line => isMaterialBudgetLine(line))
      .reduce((sum, line) => sum + Number(line.subtotal || 0), 0) || 0;
  }, [budgetLines]);

  const nonMaterialBudget = useMemo(() => {
    return budgetLines
      ?.filter(line => isServiceBudgetLine(line))
      .reduce((sum, line) => sum + Number(line.subtotal || 0), 0) || 0;
  }, [budgetLines]);

const budgetLineByProductId = useMemo(() => {
  const map = new Map<number, Database["public"]["Tables"]["job_budget_lines"]["Row"]>();
  budgetLines?.forEach((line) => {
    if (line.product_id) {
      map.set(line.product_id, line);
    }
  });
  return map;
}, [budgetLines]);

const materialActualByProductId = useMemo(() => {
  const map = new Map<number, number>();
  if (!bomLines) return map;

  bomLines.forEach((line) => {
    if (!line.odoo_product_id) return;
    const budgetLine = budgetLineByProductId.get(line.odoo_product_id);
    if (!budgetLine || !isMaterialBudgetLine(budgetLine)) return;

    const totalCost = resolveBomLineTotal(line);
    map.set(line.odoo_product_id, (map.get(line.odoo_product_id) ?? 0) + totalCost);
  });

  return map;
}, [bomLines, budgetLineByProductId]);

  const [newBOM, setNewBOM] = useState({
    odoo_product_id: null as number | null,
    product_name: "",
    quantity: 0,
    unit_cost: 0,
    notes: "",
  });

  const [newCost, setNewCost] = useState<{
    cost_type: "installation" | "freight" | "cranage" | "travel" | "accommodation" | "other";
    description: string;
    amount: number;
  }>(
    {
      cost_type: "installation",
      description: "",
      amount: 0,
    }
  );

  const [actualInputs, setActualInputs] = useState<Record<number, string>>({});
  const [isSavingActual, setIsSavingActual] = useState(false);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

const getManualAdjustmentLine = (productId: number) =>
  bomLines?.find(
    (line) =>
      line.odoo_product_id === productId &&
      (line.notes === "Manual actual adjustment" || line.product_name?.includes("(Manual Actual)"))
  );

const sumActualExcludingManual = (productId: number) =>
  bomLines?.reduce((sum, line) => {
    if (line.odoo_product_id !== productId) return sum;
    if (line.notes === "Manual actual adjustment" || line.product_name?.includes("(Manual Actual)")) {
      return sum;
    }
    return sum + resolveBomLineTotal(line);
  }, 0) || 0;

const handleActualInputChange = (productId: number, value: string) => {
  setActualInputs((prev) => ({ ...prev, [productId]: value }));
};

const recalculateJobTotals = async () => {
  if (!id) return;

  const { data: allMaterial } = await supabase
    .from("job_bom_lines")
    .select("unit_cost, quantity")
    .eq("job_id", id);

  const materialActual = allMaterial?.reduce(
    (sum, line) => sum + (Number(line.unit_cost || 0) * Number(line.quantity || 0)), 
    0
  ) || 0;

  const { data: allNonMaterial } = await supabase
    .from("job_non_material_costs")
    .select("amount")
    .eq("job_id", id);

  const nonMaterialActual = allNonMaterial?.reduce(
    (sum, line) => sum + Number(line.amount || 0), 
    0
  ) || 0;

  await supabase
    .from("jobs")
    .update({
      material_actual: materialActual,
      non_material_actual: nonMaterialActual,
      total_actual: materialActual + nonMaterialActual,
    })
    .eq("id", id);
};

const handleActualSave = async (
  line: Database["public"]["Tables"]["job_budget_lines"]["Row"],
  rawValue: string
) => {
  if (!id) return;

  const normalizedInput = rawValue.trim();
  const parsed = normalizedInput === "" ? 0 : parseFloat(normalizedInput.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) {
    toast.error("Please enter a valid actual amount");
    return;
  }

  setIsSavingActual(true);

  try {
    const productId = line.product_id;
    if (!productId) {
      toast.error("Cannot update actuals for this item");
      return;
    }

    const baseActual = sumActualExcludingManual(productId);
    const adjustment = parsed - baseActual;
    const manualLine = getManualAdjustmentLine(productId);

    if (adjustment <= 0.0001) {
      if (manualLine) {
        await supabase
          .from("job_bom_lines")
          .delete()
          .eq("id", manualLine.id);
      }
    } else if (manualLine) {
      await supabase
        .from("job_bom_lines")
        .update({
          quantity: 1,
          unit_cost: adjustment,
          total_cost: adjustment,
          notes: "Manual actual adjustment",
        })
        .eq("id", manualLine.id);
    } else {
      await supabase
        .from("job_bom_lines")
        .insert({
          job_id: id,
          odoo_product_id: productId,
          product_name: `${line.product_name} (Manual Actual)`,
          quantity: 1,
          unit_cost: adjustment,
          total_cost: adjustment,
          notes: "Manual actual adjustment",
        });
    }

    await recalculateJobTotals();

    queryClient.invalidateQueries({ queryKey: ["job-bom", id] });
    queryClient.invalidateQueries({ queryKey: ["job", id] });
    queryClient.invalidateQueries({ queryKey: ["jobs"] });

    setActualInputs((prev) => ({ ...prev, [productId]: parsed.toFixed(2) }));

    toast.success("Actual updated");
  } catch (error) {
    console.error(error);
    toast.error("Failed to update actual");
  } finally {
    setIsSavingActual(false);
  }
};

  const handleAddBOM = async () => {
    if (!id || !newBOM.product_name || newBOM.quantity <= 0 || newBOM.unit_cost < 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await createBOMLineAsync({
        job_id: id,
        odoo_product_id: newBOM.odoo_product_id || undefined,
        product_name: newBOM.product_name,
        quantity: newBOM.quantity,
        unit_cost: newBOM.unit_cost,
        total_cost: newBOM.quantity * newBOM.unit_cost,
        notes: newBOM.notes || undefined,
      });

      await recalculateJobTotals();

      queryClient.invalidateQueries({ queryKey: ["job-bom", id] });
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });

      toast.success("BOM line added successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add BOM line");
    } finally {
      setNewBOM({
        odoo_product_id: null,
        product_name: "",
        quantity: 0,
        unit_cost: 0,
        notes: "",
      });
      setIsAddBOMOpen(false);
    }
  };

  const handleAddCost = () => {
    if (!id || !newCost.cost_type || newCost.amount <= 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    createCost({
      job_id: id,
      cost_type: newCost.cost_type,
      description: newCost.description || undefined,
      amount: newCost.amount,
      is_from_odoo: false,
    });

    setNewCost({
      cost_type: "installation",
      description: "",
      amount: 0,
    });
    setIsAddCostOpen(false);
    toast.success("Cost added successfully");
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      // Parse header to find column indices
      const header = lines[0].split(',').map(h => h.trim());
      const productIndex = header.indexOf('Product');
      const quantityIndex = header.indexOf('To Consume');
      const internalRefIndex = header.indexOf('Internal Reference');

      if (productIndex === -1 || quantityIndex === -1) {
        toast.error("CSV must have 'Product' and 'To Consume' columns");
        return;
      }
      
      // Skip header row
      const dataLines = lines.slice(1);
      
      toast.info("Looking up product costs from Odoo...");
      
      const bomData = await Promise.all(dataLines.map(async (line) => {
        const cols = line.split(',').map(s => s.trim());
        const productName = cols[productIndex];
        const quantity = parseFloat(cols[quantityIndex]) || 0;
        const internalRef = internalRefIndex !== -1 ? cols[internalRefIndex] : '';
        
        // Try to look up product in Odoo by internal reference
        let unitCost = 0;
        let odooProductId: number | undefined;
        
        if (internalRef) {
          try {
            const { data } = await supabase.functions.invoke("odoo-query", {
              body: {
                model: "product.product",
                method: "search_read",
                args: [
                  [["default_code", "=", internalRef]],
                  ["id", "standard_price"],
                  0,
                  1,
                ],
              },
            });
            
            if (data && data.length > 0) {
              odooProductId = data[0].id;
              unitCost = data[0].standard_price || 0;
            }
          } catch (error) {
            console.error(`Failed to lookup product ${internalRef}:`, error);
          }
        }

        return {
          product_name: productName,
          quantity,
          unit_cost: unitCost,
          total_cost: quantity * unitCost,
          odoo_product_id: odooProductId,
        };
      }));

      const validLines = bomData.filter(line => line.product_name && line.quantity > 0);
 
       if (validLines.length > 0) {
        try {
          await importBOMFromCSVAsync({ jobId: id, lines: validLines });
          await recalculateJobTotals();
          queryClient.invalidateQueries({ queryKey: ["job-bom", id] });
          queryClient.invalidateQueries({ queryKey: ["job", id] });
          queryClient.invalidateQueries({ queryKey: ["jobs"] });
          toast.success(`Imported ${validLines.length} BOM lines with costs from Odoo`);
        } catch (error) {
          console.error(error);
          toast.error("Failed to import BOM lines");
        }
      } else {
        toast.error("No valid lines found in CSV");
      }
    };
    reader.readAsText(file);
  };

  const selectProduct = (productId: number, productName: string, cost: number) => {
    setNewBOM({
      ...newBOM,
      odoo_product_id: productId,
      product_name: productName,
      unit_cost: cost,
    });
    setProductSearch("");
  };

  // Calculate material totals using enriched cost data
  const materialBudgetTotal =
    budgetLines?.filter(isMaterialBudgetLine).reduce((sum, line) => {
      return sum + (line.subtotal ?? 0);
    }, 0) || 0;
  const matchedMaterialActualTotal = Array.from(materialActualByProductId.values()).reduce((sum, value) => sum + value, 0);
  const unmatchedMaterialActualTotal =
    bomLines?.reduce((sum, line) => {
      if (line.odoo_product_id && budgetLineByProductId.has(line.odoo_product_id)) return sum;
      if (isServiceName(line.product_name)) return sum;
      return sum + resolveBomLineTotal(line);
    }, 0) || 0;
  const materialActualTotal = matchedMaterialActualTotal + unmatchedMaterialActualTotal;
  const materialRemaining = materialBudgetTotal - materialActualTotal;
  const materialOverBudget = materialRemaining < 0;

  // Calculate non-material totals
  const nonMaterialBudgetTotal = budgetLines?.filter(isServiceBudgetLine).reduce((sum, line) => sum + (line.subtotal ?? 0), 0) || 0;
  const nonMaterialActualTotal = costs?.reduce((sum, cost) => sum + cost.amount, 0) || 0;
  const nonMaterialRemaining = nonMaterialBudgetTotal - nonMaterialActualTotal;
  const nonMaterialOverBudget = nonMaterialRemaining < 0;

  const costAnalysisOverview = useMemo(() => {
    if (!analysis) return null;
    return {
      ...analysis,
      materialBudget: materialBudgetTotal,
      nonMaterialBudget: nonMaterialBudgetTotal,
      totalBudget: materialBudgetTotal + nonMaterialBudgetTotal,
    };
  }, [analysis, materialBudgetTotal, nonMaterialBudgetTotal]);

  const materialBudgetQtyTotal = useMemo(() => {
    return budgetLines?.filter(isMaterialBudgetLine).reduce((sum, line) => sum + Number(line.quantity || 0), 0) || 0;
  }, [budgetLines]);

  const materialBomQtyTotal = useMemo(() => {
    return bomLines?.reduce((sum, line) => sum + Number(line.quantity || 0), 0) || 0;
  }, [bomLines]);

  const materialBomCostTotal = useMemo(() => {
    return bomLines?.reduce((sum, line) => sum + resolveBomLineTotal(line), 0) || 0;
  }, [bomLines]);

  const nonMaterialBudgetQtyTotal = useMemo(() => {
    return budgetLines?.filter(isServiceBudgetLine).reduce((sum, line) => sum + Number(line.quantity || 0), 0) || 0;
  }, [budgetLines]);

  // Early returns AFTER all hooks
  if (loadingJob) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Job not found</p>
          <Button onClick={() => navigate("/job-costing")} className="mt-4">
            Back to Jobs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const percentage = job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0;
  const remaining = job.total_budget - job.total_actual;
  const isOverBudget = remaining < 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/job-costing")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{job.sale_order_name}</h1>
            <p className="text-muted-foreground mt-1">{job.customer_name}</p>
            {job.last_synced_at && (
              <p className="text-xs text-muted-foreground mt-1">
                Last synced: {new Date(job.last_synced_at).toLocaleString()}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleSyncWithOdoo}
            disabled={isSyncing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync with Odoo'}
          </Button>
        </div>

        {/* Budget Circle Chart - Hero Section */}
        <BudgetCircleChart
          totalBudget={materialBudget + nonMaterialBudget}
          totalActual={job.total_actual}
          materialBudget={materialBudget}
          materialActual={job.material_actual}
          nonMaterialBudget={nonMaterialBudget}
          nonMaterialActual={job.non_material_actual}
        />

        {/* Cost Analysis Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cost Analysis Overview</CardTitle>
              <Badge variant="outline" className="ml-2">
                {analysis?.rawAnalyticLines?.length || 0} entries
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAnalysis ? (
              <div className="text-center py-8">
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              costAnalysisOverview && <CostAnalysisCard analysis={costAnalysisOverview} job={job} />
            )}
          </CardContent>
        </Card>

        {/* BOM Breakdown - Only show if data exists */}
        {analysis?.bomBreakdowns && analysis.bomBreakdowns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bill of Materials Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <BomBreakdownCard bomBreakdowns={analysis.bomBreakdowns} />
            </CardContent>
          </Card>
        )}

        {/* Keep old cards hidden for data compatibility but don't display */}
        <div className="hidden">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(job.total_budget)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Material: {formatCurrency(job.material_budget)} | Non-Material: {formatCurrency(job.non_material_budget)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Actual Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(job.total_actual)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Material: {formatCurrency(job.material_actual)} | Non-Material: {formatCurrency(job.non_material_actual)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Remaining</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(remaining)}
                </div>
                <Progress 
                  value={percentage} 
                className="mt-2"
                style={{
                  ['--progress-background' as any]: isOverBudget 
                    ? 'hsl(var(--destructive))' 
                    : 'hsl(var(--primary))'
                }}
              />
              <div className="text-xs text-muted-foreground mt-1">{percentage.toFixed(1)}% spent</div>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Quotation Material & Service Costs - Hidden, data shown in circle chart */}
        <div className="hidden">
          {saleOrderLines && saleOrderLines.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Quotation Material & Service Costs</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Costs from Odoo sale order lines (purchase_price field)
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchSaleOrderLines()}
                  disabled={loadingSaleOrderLines}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingSaleOrderLines ? 'animate-spin' : ''}`} />
                  Reload
                </Button>
              </CardHeader>
              <CardContent>
                <JobCostingSummary lines={saleOrderLines} />
            </CardContent>
          </Card>
          )}
        </div>

        {/* Cost Analysis Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Cost Analysis Breakdown</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!analysis?.analyticLines || !id || !job) return;
                    
                    toast.info("Importing costs from analytic account...");
                    
                    // Get products for classification
                    const productIds = analysis.analyticLines
                      .filter(line => line.product_id && line.product_id[0])
                      .map(line => line.product_id![0]);
                    
                    let productMap = new Map();
                    if (productIds.length > 0) {
                      const { data: products } = await supabase.functions.invoke("odoo-query", {
                        body: {
                          model: "product.product",
                          method: "search_read",
                          args: [
                            [["id", "in", productIds]],
                            ["id", "detailed_type", "default_code", "name"],
                          ],
                        },
                      });
                      productMap = new Map((products as any[] || []).map(p => [p.id, p]));
                    }
                    
                    // Check existing costs to avoid duplicates
                    const { data: existingCosts } = await supabase
                      .from('job_non_material_costs')
                      .select('description')
                      .eq('job_id', id)
                      .eq('is_from_odoo', true);
                    
                    const { data: existingBOMLines } = await supabase
                      .from('job_bom_lines')
                      .select('odoo_product_id')
                      .eq('job_id', id)
                      .not('odoo_product_id', 'is', null);
                    
                    const existingDescriptions = new Set(existingCosts?.map(c => c.description) || []);
                    const existingBOMProductIds = new Set(existingBOMLines?.map(b => b.odoo_product_id).filter(Boolean) || []);
                    
                    // Classify analytic lines by product type
                    const materialLines: any[] = [];
                    const nonMaterialLines: any[] = [];
                    
                    analysis.analyticLines.forEach(line => {
                      // Skip positive amounts (invoices/revenue) - only process negative amounts (vendor bills/costs)
                      if (line.amount >= 0) return;
                      
                      const lineDescription = `${line.name} (${line.date})`;
                      if (existingDescriptions.has(lineDescription)) return;
                      
                      const productId = line.product_id?.[0];
                      const product = productMap.get(productId);
                      const productName = line.product_id?.[1] || '';
                      const productNameUpper = productName.toUpperCase();
                      
                      // Classify by product type (same logic as quote lines)
                      let productType = product?.detailed_type || 'product';
                      
                      const serviceKeywords = [
                        'INSTALLATION', 'FREIGHT', 'CRANAGE', 'ACCOMMODATION', 'TRAVEL',
                        'TRANSPORT', 'DELIVERY', 'LABOUR', 'SERVICE', 'SITE INSPECTION',
                        'WORKSHOP LABOUR', 'SHOP DRAWING', 'MAN DAY', 'EXPENSES', 'SITE LABOUR'
                      ];
                      
                      const isServiceByName = serviceKeywords.some(keyword => productNameUpper.includes(keyword));
                      
                      if (isServiceByName && productType !== 'service') {
                        productType = 'service';
                      }
                      
                      const amount = Math.abs(line.amount);
                      
                      if (productType === 'service') {
                        // Non-material
                        let costType: "installation" | "freight" | "cranage" | "travel" | "accommodation" | "other" = "other";
                        if (productNameUpper.includes('INSTALLATION')) costType = 'installation';
                        else if (productNameUpper.includes('FREIGHT')) costType = 'freight';
                        else if (productNameUpper.includes('CRANAGE')) costType = 'cranage';
                        else if (productNameUpper.includes('ACCOMMODATION')) costType = 'accommodation';
                        else if (productNameUpper.includes('TRAVEL')) costType = 'travel';
                        
                        nonMaterialLines.push({
                          job_id: id,
                          cost_type: costType,
                          description: lineDescription,
                          amount: amount,
                          is_from_odoo: true,
                        });
                      } else {
                        // Material - add to BOM if product exists and not already imported
                        if (productId && !existingBOMProductIds.has(productId)) {
                          materialLines.push({
                            job_id: id,
                            odoo_product_id: productId,
                            product_name: productName,
                            quantity: 1, // Default quantity
                            unit_cost: amount,
                            notes: `Imported from analytic: ${line.name}`,
                          });
                        }
                      }
                    });
                    
                    // Import material lines (BOM)
                    let materialImported = 0;
                    for (const line of materialLines) {
                      try {
                        await createBOMLineAsync(line);
                        materialImported++;
                      } catch (error) {
                        console.error('Error importing material line:', error);
                      }
                    }
                    
                    // Import non-material lines
                    let nonMaterialImported = 0;
                    for (const line of nonMaterialLines) {
                      try {
                        await createCost(line);
                        nonMaterialImported++;
                      } catch (error) {
                        console.error('Error importing non-material line:', error);
                      }
                    }
                    
                    if (materialImported > 0 || nonMaterialImported > 0) {
                      // Wait for mutations to complete
                      await new Promise(resolve => setTimeout(resolve, 500));
                      
                      // Recalculate job totals
                      const { data: allBOMLines } = await supabase
                        .from("job_bom_lines")
                        .select("unit_cost, quantity")
                        .eq("job_id", id);
                      
                      const { data: allCosts } = await supabase
                        .from("job_non_material_costs")
                        .select("amount")
                        .eq("job_id", id);
                      
                      const materialActual = allBOMLines?.reduce((sum, line) => sum + (Number(line.unit_cost) * Number(line.quantity)), 0) || 0;
                      const nonMaterialActual = allCosts?.reduce((sum, cost) => sum + Number(cost.amount), 0) || 0;
                      
                      await supabase
                        .from("jobs")
                        .update({
                          material_actual: materialActual,
                          non_material_actual: nonMaterialActual,
                          total_actual: materialActual + nonMaterialActual
                        })
                        .eq("id", id);
                      
                      queryClient.invalidateQueries({ queryKey: ["jobs"] });
                      queryClient.invalidateQueries({ queryKey: ["job", id] });
                      queryClient.invalidateQueries({ queryKey: ["job-bom-lines", id] });
                      queryClient.invalidateQueries({ queryKey: ["job-non-material-costs", id] });

                      // Trigger confetti celebration
                      confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                      });

                      toast.success(`Imported ${materialImported} material line(s) and ${nonMaterialImported} non-material cost(s)`);
                    } else {
                      toast.info('No new costs to import (all already imported or no cost lines found)');
                    }
                  }}
                  disabled={!analysis?.analyticLines || analysis.analyticLines.length === 0}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Import from Analytic
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="material" className="w-full">
              <TabsList>
                <TabsTrigger value="material">Material</TabsTrigger>
                <TabsTrigger value="non-material">Non-Material</TabsTrigger>
              </TabsList>

          <TabsContent value="material" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Material Costs</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Budget: {formatCurrency(materialBudget)} | Actual: {formatCurrency(job.material_actual)}
                  </p>
                </div>
                <Dialog open={isAddBOMOpen} onOpenChange={setIsAddBOMOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Material Line</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Search Odoo Product (Optional)</Label>
                        <Input
                          placeholder="Search by product name or internal reference..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                        {products && products.length > 0 && (
                          <div className="border rounded-md max-h-48 overflow-y-auto">
                            {products.map((product) => (
                              <div
                                key={product.id}
                                className="p-2 hover:bg-accent cursor-pointer"
                                onClick={() => selectProduct(product.id, product.name, product.standard_price)}
                              >
                                <div className="font-medium">{product.name}</div>
                                {product.default_code && (
                                  <div className="text-xs text-muted-foreground">
                                    Ref: {product.default_code}
                                  </div>
                                )}
                                <div className="text-sm text-muted-foreground">
                                  Cost: {formatCurrency(product.standard_price)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Product Name *</Label>
                        <Input
                          value={newBOM.product_name}
                          onChange={(e) => setNewBOM({ ...newBOM, product_name: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            value={newBOM.quantity || ""}
                            onChange={(e) => setNewBOM({ ...newBOM, quantity: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Unit Cost *</Label>
                          <Input
                            type="number"
                            value={newBOM.unit_cost || ""}
                            onChange={(e) => setNewBOM({ ...newBOM, unit_cost: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={newBOM.notes}
                          onChange={(e) => setNewBOM({ ...newBOM, notes: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleAddBOM} className="w-full">Add Material Line</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Budget Lines */}
                  <Card className="rounded-lg border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Budgeted Costs</CardTitle>
                    </CardHeader>
                    <CardContent>
                    {loadingBudget ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Budget Total</TableHead>
                            <TableHead className="text-right">Actual</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {budgetLines?.filter(isMaterialBudgetLine).map((line) => {
                            const unitCost = line.unit_price ?? materialPurchasePriceMap.get(line.product_id) ?? 0;
                            const totalCost = line.subtotal ?? unitCost * (line.quantity || 0);
                            const productId = line.product_id || 0;
                            const actualValue = materialActualByProductId.get(productId) ?? 0;
                            const displayValue = actualInputs[productId] ?? actualValue.toFixed(2);
                            return (
                              <TableRow key={line.id}>
                                <TableCell className="font-medium">{line.product_name}</TableCell>
                                <TableCell className="text-right">{line.quantity}</TableCell>
                                <TableCell className="text-right">
                                  {formatNumber(unitCost)}
                                </TableCell>
                                <TableCell className="text-right">{formatNumber(totalCost)}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={displayValue}
                                      onChange={(e) => handleActualInputChange(productId, e.target.value)}
                                      onBlur={() => handleActualSave(line, actualInputs[productId] ?? displayValue)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      disabled={isSavingActual}
                                      className="h-8 w-32 text-right pr-2"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                  <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    ref={(el) => {
                                      fileInputRefs.current[productId] = el;
                                    }}
                                    onChange={(event) => {
                                      handleCSVUpload(event);
                                      event.target.value = "";
                                    }}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => fileInputRefs.current[productId]?.click()}
                                  >
                                    <Upload className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setNewBOM({
                                        odoo_product_id: line.product_id || null,
                                        product_name: line.product_name,
                                        quantity: 1,
                                        unit_cost: line.unit_price ?? 0,
                                        notes: "",
                                      });
                                      setProductSearch("");
                                      setIsAddBOMOpen(true);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {budgetLines && budgetLines.filter(isMaterialBudgetLine).length > 0 && (
                            <TableRow className="font-semibold bg-muted/50">
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right">{materialBudgetQtyTotal}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">{formatNumber(materialBudgetTotal)}</TableCell>
                              <TableCell className="text-right">{formatNumber(materialActualTotal)}</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                    </CardContent>
                  </Card>

                  {/* Analytic Lines - Material Costs */}
                  {analysis?.materialAnalyticLines && analysis.materialAnalyticLines.length > 0 && (
                    <AnalyticLinesMaterialTable materialLines={analysis.materialAnalyticLines} />
                  )}

                  {/* BOM Actuals */}
                  <Card className="rounded-lg border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Actual Costs (BOM)</CardTitle>
                    </CardHeader>
                    <CardContent>
                    {loadingBOM ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bomLines?.map((line) => {
                            const unitCost = line.unit_cost ?? materialPurchasePriceMap.get(line.odoo_product_id || -1) ?? 0;
                            const totalCost = line.total_cost ?? unitCost * (line.quantity || 0);
                            return (
                              <TableRow key={line.id}>
                                <TableCell>
                                  <div className="font-medium">{line.product_name}</div>
                                  {line.notes && (
                                    <div className="text-xs text-muted-foreground">{line.notes}</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{line.quantity}</TableCell>
                                <TableCell className="text-right">
                                  {formatNumber(unitCost)}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatNumber(totalCost)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!confirm("Delete this BOM line?")) return;
                                      try {
                                        await deleteBOMLineAsync(line.id);
                                        await recalculateJobTotals();
                                        queryClient.invalidateQueries({ queryKey: ["job-bom", id] });
                                        queryClient.invalidateQueries({ queryKey: ["job", id] });
                                        queryClient.invalidateQueries({ queryKey: ["jobs"] });
                                        toast.success("BOM line removed");
                                      } catch (error) {
                                        console.error(error);
                                        toast.error("Failed to delete BOM line");
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {bomLines && bomLines.length > 0 && (
                            <TableRow className="font-semibold bg-muted/50">
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right">{materialBomQtyTotal}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">{formatNumber(materialBomCostTotal)}</TableCell>
                              <TableCell></TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                    </CardContent>
                  </Card>

                  {/* Remaining Section */}
                  <Card className="rounded-lg border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Remaining Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow className={`font-semibold ${materialOverBudget ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                          <TableCell className="font-semibold">Total Remaining</TableCell>
                          <TableCell className={`text-right text-lg ${materialOverBudget ? 'text-destructive' : 'text-primary'}`}>
                            {formatCurrency(materialRemaining)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="non-material" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Service Costs</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Budget: {formatCurrency(nonMaterialBudget)} | Actual: {formatCurrency(job.non_material_actual)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Dialog open={isAddCostOpen} onOpenChange={setIsAddCostOpen}>
                    <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Cost
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Non-Material Cost</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Cost Type *</Label>
                        <Select
                          value={newCost.cost_type}
                          onValueChange={(value: typeof newCost.cost_type) => setNewCost({ ...newCost, cost_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="installation">Installation</SelectItem>
                            <SelectItem value="freight">Freight</SelectItem>
                            <SelectItem value="cranage">Cranage</SelectItem>
                            <SelectItem value="accommodation">Accommodation</SelectItem>
                            <SelectItem value="travel">Travel</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={newCost.description}
                          onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount *</Label>
                        <Input
                          type="number"
                          value={newCost.amount || ""}
                          onChange={(e) => setNewCost({ ...newCost, amount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <Button onClick={handleAddCost} className="w-full">Add Cost</Button>
                    </div>
                  </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Budget Lines */}
                  <Card className="rounded-lg border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Budgeted Costs</CardTitle>
                    </CardHeader>
                    <CardContent>
                    {loadingBudget ? (
                      <Skeleton className="h-32 w-full" />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {budgetLines?.filter(isServiceBudgetLine).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-muted-foreground">
                                No non-material budget items
                              </TableCell>
                            </TableRow>
                          ) : (
                            budgetLines?.filter(isServiceBudgetLine).map((line) => (
                              <TableRow key={line.id}>
                                <TableCell className="font-medium">{line.product_name}</TableCell>
                                <TableCell className="text-right">{line.quantity}</TableCell>
                                <TableCell className="text-right">{formatNumber(line.unit_price ?? 0)}</TableCell>
                                <TableCell className="text-right">{formatNumber(line.subtotal ?? 0)}</TableCell>
                              </TableRow>
                            ))
                          )}
                          {budgetLines && budgetLines.filter(isServiceBudgetLine).length > 0 && (
                            <TableRow className="font-semibold bg-muted/50">
                              <TableCell>Total</TableCell>
                              <TableCell className="text-right">{nonMaterialBudgetQtyTotal}</TableCell>
                              <TableCell className="text-right">-</TableCell>
                              <TableCell className="text-right">{formatNumber(nonMaterialBudgetTotal)}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                    </CardContent>
                  </Card>

                  {/* Actual Costs by Category */}
                  <Card className="rounded-lg border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Actual Costs (Actuals & POs)</CardTitle>
                      {analysis?.nonMaterialAnalyticLines && analysis.nonMaterialAnalyticLines.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Showing {costs?.length || 0} manual entries + {analysis.nonMaterialAnalyticLines.length} from analytic accounts
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                    {['installation', 'freight', 'cranage', 'accommodation', 'travel', 'other'].map((type) => {
                      const typeCosts = costs?.filter(c => c.cost_type === type) || [];
                      if (typeCosts.length === 0) return null;

                      const typeTotal = typeCosts.reduce((sum, cost) => sum + cost.amount, 0);

                      return (
                        <div key={type}>
                          <h4 className="font-medium mb-2 text-sm capitalize text-muted-foreground">{type}</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {typeCosts.map((cost) => (
                                <TableRow key={cost.id}>
                                  <TableCell>
                                    {cost.description || "-"}
                                    {cost.is_from_odoo && (
                                      <Badge variant="outline" className="ml-2 text-xs">Odoo</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">{formatCurrency(cost.amount)}</TableCell>
                                  <TableCell>
                                    {!cost.is_from_odoo && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm("Delete this cost?")) {
                                            deleteCost(cost.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="font-semibold bg-muted/50">
                                <TableCell>Total</TableCell>
                                <TableCell className="text-right">{formatNumber(typeTotal)}</TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}

                    {(!costs || costs.length === 0) && (!analysis?.nonMaterialAnalyticLines || analysis.nonMaterialAnalyticLines.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No non-material costs added yet. Click "Add Cost" to start tracking.
                      </div>
                    )}
                    </CardContent>
                  </Card>

                  {/* Remaining Section */}
                  <Card className="rounded-lg border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Remaining Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow className={`font-semibold ${nonMaterialOverBudget ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                          <TableCell className="font-semibold">Total Remaining</TableCell>
                          <TableCell className={`text-right text-lg ${nonMaterialOverBudget ? 'text-destructive' : 'text-primary'}`}>
                            {formatCurrency(nonMaterialRemaining)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </CardContent>
        </Card>
      </div>
      <AICopilot />
    </DashboardLayout>
  );
}
