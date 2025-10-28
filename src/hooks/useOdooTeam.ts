import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFilters } from "@/contexts/FilterContext";

export interface SalesRep {
  id: number;
  name: string;
  avatar: string;
  deals: number;
  revenue: number;
  target: number;
  trend: "up" | "down";
}

export const useOdooTeam = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const { toast } = useToast();
  const { filters } = useFilters();

  const fetchTeamData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch all confirmed sales orders
      const { data: salesOrders, error: salesError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            [['state', 'in', ['sale', 'done']]], // Only confirmed and done orders
            ['amount_total', 'user_id', 'date_order', 'x_original_confirmation_date']
          ]
        }
      });

      if (salesError) throw salesError;

      setAllOrders(salesOrders || []);
      return salesOrders || [];
    } catch (error) {
      console.error('Odoo team sync error:', error);
      // Don't show toast on every error - user may not have Odoo configured yet
      setAllOrders([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  // Apply filters and recalculate sales reps data
  useEffect(() => {
    let filteredOrders = [...allOrders];

    // Apply date range filter using original confirmation date (try both field names)
    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      filteredOrders = filteredOrders.filter((order) => {
        const confirmDate = order.original_confirmation_date || order.x_original_confirmation_date || order.date_order;
        const orderDate = new Date(confirmDate);
        return (
          orderDate >= filters.dateRange.startDate! &&
          orderDate <= filters.dateRange.endDate!
        );
      });
    }

    // Aggregate data by salesperson
    const salesByUser: Record<number, { name: string; deals: number; revenue: number }> = {};
    
    filteredOrders.forEach((order: any) => {
      if (order.user_id) {
        const userId = order.user_id[0];
        const userName = order.user_id[1];
        
        if (!salesByUser[userId]) {
          salesByUser[userId] = {
            name: userName,
            deals: 0,
            revenue: 0
          };
        }
        
        salesByUser[userId].deals += 1;
        salesByUser[userId].revenue += order.amount_total;
      }
    });

    // Convert to array and sort by revenue
    const repsArray: SalesRep[] = Object.entries(salesByUser)
      .map(([id, data]) => {
        const initials = data.name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        
        // Set a default target (can be customized later)
        const target = 150000;
        const trend: "up" | "down" = data.revenue >= target ? "up" : "down";
        
        return {
          id: parseInt(id),
          name: data.name,
          avatar: initials,
          deals: data.deals,
          revenue: Math.round(data.revenue),
          target,
          trend
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    setSalesReps(repsArray);
  }, [allOrders, filters.dateRange]);

  return { salesReps, isLoading, refetch: fetchTeamData };
};
