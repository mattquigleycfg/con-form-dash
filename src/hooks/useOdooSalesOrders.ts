import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFilters } from "@/contexts/FilterContext";

export interface SalesOrder {
  id: number;
  name: string;
  partner_id: [number, string];
  date_order: string;
  original_confirmation_date?: string;
  x_original_confirmation_date?: string;
  amount_total: number;
  state: string;
  user_id: [number, string] | false;
  team_id: [number, string] | false;
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

      // Apply date filters
      if (filters.dateRange?.startDate) {
        odooFilters.push(['date_order', '>=', filters.dateRange.startDate.toISOString()]);
      }
      if (filters.dateRange?.endDate) {
        odooFilters.push(['date_order', '<=', filters.dateRange.endDate.toISOString()]);
      }

      // Fetch sales orders with original confirmation date
      const { data: orders, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            odooFilters,
            ['id', 'name', 'partner_id', 'date_order', 'x_original_confirmation_date', 'amount_total', 'state', 'user_id', 'team_id']
          ]
        }
      });

      if (error) throw error;

      setSalesOrders(orders || []);
    } catch (error) {
      console.error('Error fetching sales orders:', error);
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
