import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFilters } from "@/contexts/FilterContext";
import { useAuth } from "@/contexts/AuthContext";

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
  const [totalTarget, setTotalTarget] = useState<number>(0);
  const { toast } = useToast();
  const { filters } = useFilters();
  const { user } = useAuth();

  const fetchTeamData = async () => {
    setIsLoading(true);
    
    try {
      // Get current month start and end dates
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      // Fetch only current month's confirmed sales orders
      const { data: salesOrders, error: salesError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            [
              ['state', 'in', ['sale', 'done']], // Only confirmed and done orders
              ['date_order', '>=', monthStart.toISOString()],
              ['date_order', '<=', monthEnd.toISOString()]
            ],
            ['amount_total', 'user_id', 'date_order']
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

  const fetchTotalTarget = async () => {
    if (!user) return;
    
    try {
      // Get current month's target only
      const now = new Date();
      const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { data, error } = await supabase
        .from('monthly_targets')
        .select('total_sales_target')
        .gte('month_date', currentMonthDate.toISOString())
        .lt('month_date', new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString())
        .single();
      
      if (error) throw error;
      
      // Use current month's target
      setTotalTarget(data?.total_sales_target || 0);
    } catch (error) {
      console.error('Error fetching targets:', error);
      setTotalTarget(0);
    }
  };

  useEffect(() => {
    fetchTeamData();
    fetchTotalTarget();
  }, [user]);

  // Process sales reps data
  useEffect(() => {
    const allowedSalespeople = ['Joel Boustani', 'Hein Cro', 'Adam Ford', 'Mitch Lavelle', 'Ami Kirk'];
    
    // Note: allOrders already contains only current month's data from the fetch
    // No additional date filtering needed

    // Aggregate data by salesperson
    const salesByUser: Record<number, { name: string; deals: number; revenue: number }> = {};
    
    allOrders.forEach((order: any) => {
      if (order.user_id) {
        const userId = order.user_id[0];
        const userName = order.user_id[1];
        
        // Only include allowed salespeople
        if (!allowedSalespeople.includes(userName)) {
          return;
        }
        
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
        
        // Calculate individual target based on total target divided by number of reps
        const numReps = Object.keys(salesByUser).length;
        const target = totalTarget > 0 && numReps > 0 ? Math.round(totalTarget / numReps) : 0;
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
  }, [allOrders, totalTarget]);

  return { salesReps, isLoading, refetch: fetchTeamData };
};
