import { useMemo } from "react";
import { useOdooOpportunities } from "./useOdooOpportunities";

interface FilteredMetrics {
  totalRevenue: number;
  dealsClosed: number;
  conversionRate: number;
  activeCustomers: number;
}

export const useFilteredMetrics = () => {
  const { opportunities, isLoading } = useOdooOpportunities();

  const metrics = useMemo<FilteredMetrics>(() => {
    if (!opportunities.length) {
      return {
        totalRevenue: 0,
        dealsClosed: 0,
        conversionRate: 0,
        activeCustomers: 0
      };
    }

    // Calculate total expected revenue from all opportunities
    const totalRevenue = opportunities.reduce(
      (sum, opp) => sum + (opp.expected_revenue || 0),
      0
    );

    // Count won deals (probability >= 90%)
    const wonDeals = opportunities.filter((opp) => opp.probability >= 90);
    const dealsClosed = wonDeals.length;

    // Calculate conversion rate
    const conversionRate = opportunities.length > 0
      ? (dealsClosed / opportunities.length) * 100
      : 0;

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
  }, [opportunities]);

  return { metrics, isLoading };
};
