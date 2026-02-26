import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFilters } from "@/contexts/FilterContext";
import { logger } from "@/utils/logger";

export interface SalesOrder {
  id: number;
  name: string;
  partner_id: [number, string];
  date_order: string;
  amount_total: number;
  state: string;
  user_id: [number, string] | false;
  team_id: [number, string] | false;
  analytic_account_id: [number, string] | false;
  opportunity_id: [number, string] | false;
}

export const useOdooSalesOrders = () => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { filters } = useFilters();

  const fetchSalesOrders = async () => {
    setIsLoading(true);
    
    try {
      // Build filters
      const odooFilters: any[] = [
        ['state', 'in', ['sale', 'done']] // Only confirmed orders
      ];

      // Apply date filters (ensure Date - may be string when restored from localStorage)
      const startDate = filters.dateRange?.startDate;
      const endDate = filters.dateRange?.endDate;
      if (startDate) {
        const d = startDate instanceof Date ? startDate : new Date(startDate);
        if (!isNaN(d.getTime())) odooFilters.push(['date_order', '>=', d.toISOString()]);
      }
      if (endDate) {
        const d = endDate instanceof Date ? endDate : new Date(endDate);
        if (!isNaN(d.getTime())) odooFilters.push(['date_order', '<=', d.toISOString()]);
      }

      // Fetch sales orders including analytic_account_id and opportunity_id
      const { data: orders, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            odooFilters,
            ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state', 'user_id', 'team_id', 'analytic_account_id', 'opportunity_id']
          ]
        }
      });

      if (error) throw error;

      setSalesOrders(orders || []);
    } catch (error) {
      logger.error('Error fetching sales orders', error);
      setSalesOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesOrders();
  }, [filters.dateRange]);

  return {
    salesOrders,
    isLoading,
    refetch: fetchSalesOrders,
  };
};
