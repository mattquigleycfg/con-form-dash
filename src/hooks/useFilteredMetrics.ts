import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOdooOpportunities } from "./useOdooOpportunities";

interface FilteredMetrics {
  totalRevenue: number;
  dealsClosed: number;
  conversionRate: number;
  activeCustomers: number;
}

export const useFilteredMetrics = () => {
  const { opportunities, isLoading: isOpportunitiesLoading } = useOdooOpportunities();
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
    if (!opportunities.length || isLoading) {
      return {
        totalRevenue: 0,
        dealsClosed: 0,
        conversionRate: 0,
        activeCustomers: 0
      };
    }

    // Get 3-month date range
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());

    // Filter opportunities from last 3 months
    const last3MonthsOpportunities = opportunities.filter((opp) => {
      const createDate = new Date(opp.create_date);
      return createDate >= threeMonthsAgo && createDate <= now;
    });

    // Find "Proposal Required" stage ID
    const proposalRequiredStage = stages.find(
      (stage) => stage.name === "Proposal Required"
    );

    // Filter out "Proposal Required" opportunities
    const filteredOpportunities = last3MonthsOpportunities.filter(
      (opp) => !proposalRequiredStage || opp.stage_id[0] !== proposalRequiredStage.id
    );

    // Calculate total expected revenue from filtered opportunities
    const totalExpectedRevenue = filteredOpportunities.reduce(
      (sum, opp) => sum + (opp.expected_revenue || 0),
      0
    );

    // Calculate total confirmed sales revenue
    const totalConfirmedSales = salesOrders.reduce(
      (sum, order) => sum + (order.amount_total || 0),
      0
    );

    // New conversion rate: (expected revenue / confirmed sales) * 100
    const conversionRate = totalConfirmedSales > 0
      ? (totalExpectedRevenue / totalConfirmedSales) * 100
      : 0;

    // Filter to only active/open opportunities (exclude won >= 90% and lost <= 10%)
    const activeOpportunities = opportunities.filter(
      (opp) => opp.probability > 10 && opp.probability < 90
    );

    // Calculate total expected revenue from active opportunities only
    const totalRevenue = activeOpportunities.reduce(
      (sum, opp) => sum + (opp.expected_revenue || 0),
      0
    );

    // Count won deals (probability >= 90%)
    const wonDeals = opportunities.filter((opp) => opp.probability >= 90);
    const dealsClosed = wonDeals.length;

    // Get unique active customers from opportunities
    const uniqueCustomers = new Set(
      opportunities
        .filter((opp) => opp.partner_id && opp.probability >= 90)
        .map((opp) => opp.partner_id[0])
    );
    const activeCustomers = uniqueCustomers.size;

    return {
      totalRevenue,
      dealsClosed,
      conversionRate,
      activeCustomers
    };
  }, [opportunities, salesOrders, stages, isLoading]);

  return { metrics, isLoading: isOpportunitiesLoading || isLoading };
};
