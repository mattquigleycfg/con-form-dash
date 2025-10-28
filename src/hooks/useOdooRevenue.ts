import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFilters } from "@/contexts/FilterContext";
import { useAuth } from "@/contexts/AuthContext";

export interface MonthlyRevenue {
  month: string;
  actual: number;
  target: number;
}

export const useOdooRevenue = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<MonthlyRevenue[]>([]);
  const [monthlyTargets, setMonthlyTargets] = useState<any[]>([]);
  const { toast } = useToast();
  const { filters } = useFilters();
  const { user } = useAuth();

  const fetchRevenueData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch sales orders from this year
      const { data: salesOrders, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            [
              ['state', 'in', ['sale', 'done']],
              ['date_order', '>=', new Date(new Date().getFullYear(), 0, 1).toISOString()]
            ],
            ['amount_total', 'date_order']
          ]
        }
      });

      if (error) throw error;

      setAllOrders(salesOrders || []);
      return salesOrders || [];
    } catch (error) {
      console.error('Revenue sync error:', error);
      toast({
        title: "Revenue sync failed",
        description: error instanceof Error ? error.message : "Failed to sync revenue data",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthlyTargets = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('monthly_targets')
        .select('*')
        .order('month_date', { ascending: true });
      
      if (error) throw error;
      setMonthlyTargets(data || []);
    } catch (error) {
      console.error('Error fetching monthly targets:', error);
    }
  };

  useEffect(() => {
    fetchRevenueData();
    fetchMonthlyTargets();
  }, [user]);

  // Apply date filters and aggregate
  useEffect(() => {
    let filteredOrders = [...allOrders];

    // Apply date range filter using date_order only
    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      filteredOrders = filteredOrders.filter((order) => {
        const orderDate = new Date(order.date_order);
        return (
          orderDate >= filters.dateRange.startDate! &&
          orderDate <= filters.dateRange.endDate!
        );
      });
    }

    // Aggregate by month using date_order only
    const monthlyData: Record<string, number> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    filteredOrders.forEach((order: any) => {
      const date = new Date(order.date_order);
      const monthKey = monthNames[date.getMonth()];
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + order.amount_total;
    });

    // Create array with all months, matching with targets from database
    const currentMonth = new Date().getMonth();
    const data: MonthlyRevenue[] = monthNames
      .slice(0, currentMonth + 1)
      .map((month) => {
        // Find matching target from monthly_targets table
        const targetRecord = monthlyTargets.find(t => {
          const targetMonth = t.month.split('-')[0]; // Extract month part from "Jul-25"
          return targetMonth === month;
        });
        
        return {
          month,
          actual: Math.round(monthlyData[month] || 0),
          target: targetRecord ? targetRecord.total_sales_target : 0
        };
      });

    setRevenueData(data);
  }, [allOrders, filters.dateRange, monthlyTargets]);

  return { revenueData, isLoading, refetch: fetchRevenueData };
};
