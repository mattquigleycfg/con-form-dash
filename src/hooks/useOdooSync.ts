import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOdooOpportunities } from "./useOdooOpportunities";

interface OdooMetrics {
  totalRevenue: number;
  dealsClosed: number;
  conversionRate: number;
  activeCustomers: number;
}

export const useOdooSync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<OdooMetrics | null>(null);
  const { toast } = useToast();
  const { opportunities } = useOdooOpportunities();

  const syncOdooData = async () => {
    setIsLoading(true);
    
    try {
      // Get current month and 3-month date ranges
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      
      // Fetch only current month's sales orders for totalRevenue and dealsClosed
      const { data: salesOrders, error: salesError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            [
              ['state', 'in', ['sale', 'done']],
              ['date_order', '>=', monthStart.toISOString()],
              ['date_order', '<=', monthEnd.toISOString()]
            ],
            ['amount_total', 'state', 'partner_id', 'date_order']
          ]
        }
      });

      if (salesError) throw salesError;

      // Fetch 3-month sales orders for conversion rate
      const { data: threeMonthOrders, error: threeMonthError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            [
              ['state', 'in', ['sale', 'done']],
              ['date_order', '>=', threeMonthsAgo.toISOString()],
              ['date_order', '<=', now.toISOString()]
            ],
            ['amount_total']
          ]
        }
      });

      if (threeMonthError) throw threeMonthError;

      // Fetch opportunities from last 3 months
      const { data: threeMonthOpps, error: oppError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'crm.lead',
          method: 'search_read',
          args: [
            [
              ['type', '=', 'opportunity'],
              ['create_date', '>=', threeMonthsAgo.toISOString()],
              ['create_date', '<=', now.toISOString()]
            ],
            ['id', 'probability']
          ]
        }
      });

      if (oppError) throw oppError;

      // Calculate metrics from current month
      const totalRevenue = salesOrders?.reduce((sum: number, order: any) => sum + order.amount_total, 0) || 0;
      const dealsClosed = salesOrders?.length || 0;
      
      // Get unique customers from current month
      const uniqueCustomers = new Set(salesOrders?.map((order: any) => order.partner_id[0]) || []);
      const activeCustomers = uniqueCustomers.size;

      // Cohort-based conversion rate calculation
      // All opportunities created in last 3 months
      const opportunitiesInPeriod = threeMonthOpps || [];
      
      // Won opportunities from that same cohort (probability >= 90)
      const wonOpportunities = opportunitiesInPeriod.filter(
        (opp: any) => (opp.probability ?? 0) >= 90
      );

      // Conversion Rate = (Won Opportunities / Total Opportunities Created) × 100
      const conversionRate = opportunitiesInPeriod.length > 0
        ? (wonOpportunities.length / opportunitiesInPeriod.length) * 100
        : 0;

      const calculatedMetrics = {
        totalRevenue,
        dealsClosed,
        conversionRate,
        activeCustomers
      };

      setMetrics(calculatedMetrics);
      
      toast({
        title: "Sync successful",
        description: "Odoo data has been synchronized successfully.",
      });

      return calculatedMetrics;
    } catch (error) {
      console.error('Odoo sync error:', error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync Odoo data",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { syncOdooData, isLoading, metrics };
};
