import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOdooOpportunities } from "./useOdooOpportunities";

export interface StageSuccess {
  stage: string;
  won_count: number;
  lost_count: number;
  success_rate: number;
}

interface FilteredMetrics {
  totalRevenue: number;
  dealsClosed: number;
  conversionRate: number;
  conversionRateExclTender: number;
  activeCustomers: number;
  wonCount: number;
  byStageSuccess: StageSuccess[];
}

export const useFilteredMetrics = () => {
  const { opportunities, allOpportunities, isLoading: isOpportunitiesLoading } = useOdooOpportunities();
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch sales orders and stages for the last 3 months
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get 3-month date range
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

        // Fetch confirmed sales orders from last 3 months
        const { data: orders, error: ordersError } = await supabase.functions.invoke('odoo-query', {
          body: {
            model: 'sale.order',
            method: 'search_read',
            args: [
              [
                ['state', 'in', ['sale', 'done']],
                ['date_order', '>=', threeMonthsAgo.toISOString()],
                ['date_order', '<=', now.toISOString()]
              ],
              ['id', 'amount_total', 'date_order']
            ]
          }
        });

        if (ordersError) throw ordersError;
        setSalesOrders(orders || []);

        // Fetch stages to identify "Proposal Required"
        const { data: stageData, error: stagesError } = await supabase.functions.invoke('odoo-query', {
          body: {
            model: 'crm.stage',
            method: 'search_read',
            args: [
              [],
              ['id', 'name']
            ]
          }
        });

        if (stagesError) throw stagesError;
        setStages(stageData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const metrics = useMemo<FilteredMetrics>(() => {
    const empty = {
      totalRevenue: 0,
      dealsClosed: 0,
      conversionRate: 0,
      conversionRateExclTender: 0,
      activeCustomers: 0,
      wonCount: 0,
      byStageSuccess: [] as StageSuccess[],
    };
    if (!allOpportunities?.length || isLoading) return empty;

    // Get 3-month date range
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    const isTenderStage = (name: string) => (name || "").toLowerCase().includes("tender");

    // All opportunities created in last 3 months (cohort-based analysis)
    const opportunitiesInPeriod = allOpportunities.filter((opp) => {
      const createDate = new Date(opp.create_date);
      return createDate >= threeMonthsAgo && createDate <= now;
    });

    // Won (prob >= 90) and lost (prob <= 10, typically 0) from cohort
    const wonInPeriod = opportunitiesInPeriod.filter((opp) => (Number(opp.probability ?? 0) >= 90));
    const wonOpportunities = allOpportunities.filter((opp) => (Number(opp.probability ?? 0) >= 90));
    const lostOpportunities = allOpportunities.filter((opp) => (Number(opp.probability ?? 0) <= 10));
    const totalResolved = wonOpportunities.length + lostOpportunities.length;

    // Conversion Rate = Won / Total Created in 3 months (Sales Overview formula)
    const conversionRate = opportunitiesInPeriod.length > 0
      ? (wonInPeriod.length / opportunitiesInPeriod.length) * 100
      : 0;

    // Excluding tender stage
    const wonExcl = wonOpportunities.filter((o) => {
      const stage = Array.isArray(o.stage_id) ? o.stage_id[1] : "";
      return !isTenderStage(stage);
    });
    const lostExcl = lostOpportunities.filter((o) => {
      const stage = Array.isArray(o.stage_id) ? o.stage_id[1] : "";
      return !isTenderStage(stage);
    });
    const totalExcl = wonExcl.length + lostExcl.length;
    const conversionRateExclTender = totalExcl > 0 ? (wonExcl.length / totalExcl) * 100 : conversionRate;

    // By stage: won_count, lost_count, success_rate (Sales dash formula)
    const wonByStage: Record<string, number> = {};
    const lostByStage: Record<string, number> = {};
    for (const o of wonOpportunities) {
      const stage = Array.isArray(o.stage_id) ? (o.stage_id[1] || "Unknown") : "Unknown";
      wonByStage[stage] = (wonByStage[stage] ?? 0) + 1;
    }
    for (const o of lostOpportunities) {
      const stage = Array.isArray(o.stage_id) ? (o.stage_id[1] || "Unknown") : "Unknown";
      lostByStage[stage] = (lostByStage[stage] ?? 0) + 1;
    }
    const allStages = [...new Set([...Object.keys(wonByStage), ...Object.keys(lostByStage)])];
    const byStageSuccess: StageSuccess[] = allStages
      .filter((s) => (wonByStage[s] ?? 0) + (lostByStage[s] ?? 0) > 0)
      .map((stage) => {
        const won = wonByStage[stage] ?? 0;
        const lost = lostByStage[stage] ?? 0;
        const total = won + lost;
        return {
          stage,
          won_count: won,
          lost_count: lost,
          success_rate: total > 0 ? Math.round((won / total) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => -(a.won_count + a.lost_count) + (b.won_count + b.lost_count));

    // Filter to only active/open opportunities (exclude won >= 90% and lost <= 10%)
    const activeOpportunities = opportunities.filter(
      (opp) => (opp.probability ?? 0) > 10 && (opp.probability ?? 0) < 90
    );

    const totalRevenue = activeOpportunities.reduce((sum, opp) => sum + (opp.expected_revenue || 0), 0);
    const wonDeals = opportunities.filter((opp) => (opp.probability ?? 0) >= 90);
    const dealsClosed = wonDeals.length;

    const uniqueCustomers = new Set(
      opportunities
        .filter((opp) => opp.partner_id && (opp.probability ?? 0) >= 90)
        .map((opp) => opp.partner_id[0])
    );
    const activeCustomers = uniqueCustomers.size;

    return {
      totalRevenue,
      dealsClosed,
      conversionRate,
      conversionRateExclTender,
      activeCustomers,
      wonCount: wonOpportunities.length,
      byStageSuccess,
    };
  }, [opportunities, allOpportunities, salesOrders, stages, isLoading]);

  return { metrics, isLoading: isOpportunitiesLoading || isLoading };
};
