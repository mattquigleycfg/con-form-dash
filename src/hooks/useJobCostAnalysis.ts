import { useMemo } from "react";
import { Job } from "./useJobs";
import { AnalyticLine, useOdooAnalyticLines } from "./useOdooAnalyticLines";
import { useOdooMRP } from "./useOdooMRP";
import { isRevenueAnalyticEntry } from "@/lib/analyticRevenue";

export interface ComponentCost {
  productId: number;
  productName: string;
  productCode: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface BomCostBreakdown {
  manufacturingOrderId: number;
  moName: string;
  productName: string;
  quantity: number;
  materialCost: number;
  components: ComponentCost[];
}

export interface CostAnalysis {
  // Budget
  budgetedRevenue: number;
  materialBudget: number;
  nonMaterialBudget: number;
  totalBudget: number;

  // Actual costs from analytic accounting
  actualMaterialCost: number;
  actualNonMaterialCost: number;
  totalActualCost: number;

  // BoM estimates
  bomEstimatedMaterialCost: number;
  bomBreakdowns: BomCostBreakdown[];

  // Variances
  materialVariance: number;
  materialVariancePercent: number;
  nonMaterialVariance: number;
  nonMaterialVariancePercent: number;
  totalVariance: number;
  totalVariancePercent: number;

  // Margins
  budgetedMargin: number;
  budgetedMarginPercent: number;
  actualMargin: number;
  actualMarginPercent: number;

  // Analytic line details
  analyticLines: AnalyticLine[];
  rawAnalyticLines: AnalyticLine[];
  materialAnalyticLines: AnalyticLine[];
  nonMaterialAnalyticLines: AnalyticLine[];
}


export const useJobCostAnalysis = (job: Job | undefined) => {
  // Collect all analytic account IDs (from sale order and project if different)
  const analyticAccountIds = useMemo(() => {
    const ids: number[] = [];
    if (job?.analytic_account_id) {
      ids.push(job.analytic_account_id);
    }
    // Add project analytic account if it exists and is different from sale order account
    if (job?.project_analytic_account_id && 
        job.project_analytic_account_id !== job?.analytic_account_id) {
      ids.push(job.project_analytic_account_id);
      console.log('📋 Job has separate project analytic account:', {
        saleOrderAccount: job.analytic_account_id,
        projectAccount: job.project_analytic_account_id,
        jobName: job.sale_order_name
      });
    }
    return ids;
  }, [job?.analytic_account_id, job?.project_analytic_account_id, job?.sale_order_name]);

  // Fetch analytic lines from all relevant accounts
  const { data: analyticLines = [], isLoading: loadingAnalytics } = useOdooAnalyticLines(
    analyticAccountIds.length > 0 ? analyticAccountIds : undefined
  );

  const costAnalyticLines = useMemo(() => {
    return analyticLines.filter((line) => {
      const amount = Number(line.amount ?? 0);
      if (!Number.isFinite(amount) || amount >= 0) {
        return false;
      }

      if (isRevenueAnalyticEntry(line)) {
        return false;
      }

      return true;
    });
  }, [analyticLines]);

  // Separate material and non-material analytic lines
  const materialAnalyticLines = useMemo(() => {
    return costAnalyticLines.filter(line => line.cost_category === 'material');
  }, [costAnalyticLines]);

  const nonMaterialAnalyticLines = useMemo(() => {
    return costAnalyticLines.filter(line => line.cost_category === 'non_material');
  }, [costAnalyticLines]);

  // Fetch MRP/BoM data
  const {
    manufacturingOrders,
    boms,
    bomLines,
    productCosts,
    isLoading: loadingMRP,
  } = useOdooMRP(job?.sale_order_name);

  const analysis = useMemo<CostAnalysis | null>(() => {
    if (!job) return null;

    // Budget figures
    const budgetedRevenue = job.total_budget;
    const materialBudget = job.material_budget;
    const nonMaterialBudget = job.non_material_budget;
    const totalBudget = materialBudget + nonMaterialBudget;

    // Actual costs from analytic lines
    const materialLines = costAnalyticLines.filter(
      (line) => line.category === "material" || !line.category
    );
    const nonMaterialLines = costAnalyticLines.filter((line) => line.category === "service");

    const actualMaterialCost = Math.abs(
      materialLines.reduce((sum, line) => sum + line.amount, 0)
    );
    const actualNonMaterialCost = Math.abs(
      nonMaterialLines.reduce((sum, line) => sum + line.amount, 0)
    );
    const totalActualCost = actualMaterialCost + actualNonMaterialCost;

    // Calculate BoM costs
    const bomBreakdowns: BomCostBreakdown[] = [];
    let bomEstimatedMaterialCost = 0;

    if (manufacturingOrders && boms && bomLines && productCosts) {
      manufacturingOrders.forEach((mo) => {
        if (!mo.bom_id) return;

        const bom = boms.find((b) => b.id === mo.bom_id[0]);
        if (!bom) return;

        const moLines = bomLines.filter((line) => line.bom_id[0] === bom.id);
        const components: ComponentCost[] = [];
        let moMaterialCost = 0;

        moLines.forEach((line) => {
          const product = productCosts.find((p) => p.id === line.product_id[0]);
          if (!product) return;

          const quantity = line.product_qty * mo.product_qty;
          const unitCost = product.standard_price;
          const totalCost = quantity * unitCost;

          components.push({
            productId: product.id,
            productName: product.name,
            productCode: product.default_code || "",
            quantity,
            unitCost,
            totalCost,
          });

          moMaterialCost += totalCost;
        });

        bomBreakdowns.push({
          manufacturingOrderId: mo.id,
          moName: mo.name,
          productName: mo.product_id[1],
          quantity: mo.product_qty,
          materialCost: moMaterialCost,
          components,
        });

        bomEstimatedMaterialCost += moMaterialCost;
      });
    }

    // Calculate variances
    const materialVariance = materialBudget - actualMaterialCost;
    const materialVariancePercent =
      materialBudget > 0 ? (materialVariance / materialBudget) * 100 : 0;

    const nonMaterialVariance = nonMaterialBudget - actualNonMaterialCost;
    const nonMaterialVariancePercent =
      nonMaterialBudget > 0 ? (nonMaterialVariance / nonMaterialBudget) * 100 : 0;

    const totalVariance = totalBudget - totalActualCost;
    const totalVariancePercent = totalBudget > 0 ? (totalVariance / totalBudget) * 100 : 0;

    // Calculate margins
    const budgetedMargin = budgetedRevenue - totalBudget;
    const budgetedMarginPercent =
      budgetedRevenue > 0 ? (budgetedMargin / budgetedRevenue) * 100 : 0;

    const actualMargin = budgetedRevenue - totalActualCost;
    const actualMarginPercent = budgetedRevenue > 0 ? (actualMargin / budgetedRevenue) * 100 : 0;

    return {
      budgetedRevenue,
      materialBudget,
      nonMaterialBudget,
      totalBudget,
      actualMaterialCost,
      actualNonMaterialCost,
      totalActualCost,
      bomEstimatedMaterialCost,
      bomBreakdowns,
      materialVariance,
      materialVariancePercent,
      nonMaterialVariance,
      nonMaterialVariancePercent,
      totalVariance,
      totalVariancePercent,
      budgetedMargin,
      budgetedMarginPercent,
      actualMargin,
      actualMarginPercent,
      analyticLines: costAnalyticLines,
      rawAnalyticLines: analyticLines,
      materialAnalyticLines,
      nonMaterialAnalyticLines,
    };
  }, [
    job,
    analyticLines,
    costAnalyticLines,
    materialAnalyticLines,
    nonMaterialAnalyticLines,
    manufacturingOrders,
    boms,
    bomLines,
    productCosts,
  ]);

  return {
    analysis,
    isLoading: loadingAnalytics || loadingMRP,
  };
};
