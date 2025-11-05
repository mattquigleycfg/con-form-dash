import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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

interface UseJobCostingSalesOrdersParams {
  startDate?: Date;
  endDate?: Date;
}

export const useJobCostingSalesOrders = (params?: UseJobCostingSalesOrdersParams) => {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSalesOrders = async () => {
    setIsLoading(true);
    
    try {
      // Build filters - only confirmed orders
      const odooFilters: any[] = [
        ['state', 'in', ['sale', 'done']]
      ];

      // Apply date filters if provided
      if (params?.startDate) {
        odooFilters.push(['date_order', '>=', params.startDate.toISOString()]);
      }
      if (params?.endDate) {
        odooFilters.push(['date_order', '<=', params.endDate.toISOString()]);
      }

      // Fetch sales orders
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
      logger.error('Error fetching sales orders for job costing', error);
      setSalesOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesOrders();
  }, [params?.startDate?.toISOString(), params?.endDate?.toISOString()]);

  return {
    salesOrders,
    isLoading,
    refetch: fetchSalesOrders,
  };
};

