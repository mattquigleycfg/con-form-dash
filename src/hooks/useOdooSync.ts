import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const syncOdooData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch sales orders
      const { data: salesOrders, error: salesError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            [['state', 'in', ['sale', 'done']]], // Only confirmed and done orders
            ['amount_total', 'state', 'partner_id', 'date_order']
          ]
        }
      });

      if (salesError) throw salesError;

      // Fetch opportunities
      const { data: opportunities, error: oppError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'crm.lead',
          method: 'search_read',
          args: [
            [['type', '=', 'opportunity']],
            ['probability', 'expected_revenue', 'stage_id']
          ]
        }
      });

      if (oppError) throw oppError;

      // Calculate metrics
      const totalRevenue = salesOrders?.reduce((sum: number, order: any) => sum + order.amount_total, 0) || 0;
      const dealsClosed = salesOrders?.length || 0;
      const wonOpportunities = opportunities?.filter((opp: any) => opp.probability === 100).length || 0;
      const totalOpportunities = opportunities?.length || 1;
      const conversionRate = (wonOpportunities / totalOpportunities) * 100;
      
      // Get unique customers
      const uniqueCustomers = new Set(salesOrders?.map((order: any) => order.partner_id[0]) || []);
      const activeCustomers = uniqueCustomers.size;

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
