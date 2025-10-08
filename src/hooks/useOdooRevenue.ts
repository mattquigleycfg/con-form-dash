import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFilters } from "@/contexts/FilterContext";

export interface MonthlyRevenue {
  month: string;
  actual: number;
  target: number;
}

export const useOdooRevenue = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<MonthlyRevenue[]>([]);
  const { toast } = useToast();
  const { filters } = useFilters();

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

  useEffect(() => {
    fetchRevenueData();
  }, []);

  // Apply date filters and aggregate
  useEffect(() => {
    let filteredOrders = [...allOrders];

    // Apply date range filter
    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      filteredOrders = filteredOrders.filter((order) => {
        const orderDate = new Date(order.date_order);
        return (
          orderDate >= filters.dateRange.startDate! &&
          orderDate <= filters.dateRange.endDate!
        );
      });
    }

    // Aggregate by month
    const monthlyData: Record<string, number> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    filteredOrders.forEach((order: any) => {
      const date = new Date(order.date_order);
      const monthKey = monthNames[date.getMonth()];
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + order.amount_total;
    });

    // Create array with all months
    const currentMonth = new Date().getMonth();
    const data: MonthlyRevenue[] = monthNames
      .slice(0, currentMonth + 1)
      .map((month, index) => ({
        month,
        actual: Math.round(monthlyData[month] || 0),
        target: 50000 + (index * 5000) // Progressive target
      }));

    setRevenueData(data);
  }, [allOrders, filters.dateRange]);

  return { revenueData, isLoading, refetch: fetchRevenueData };
};
