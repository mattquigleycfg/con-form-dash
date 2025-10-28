import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFilters } from "@/contexts/FilterContext";

export interface RegionSales {
  region: string;
  sales: number;
  orders: number;
}

// Map Australian states to their abbreviations
const STATE_MAP: Record<string, string> = {
  'New South Wales': 'NSW',
  'Victoria': 'VIC',
  'Queensland': 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
};

export const useOdooSalesByRegion = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [regionData, setRegionData] = useState<RegionSales[]>([]);
  const { toast } = useToast();
  const { filters } = useFilters();

  const fetchSalesData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch confirmed sales orders with partner information
      const { data: salesOrders, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            [['state', 'in', ['sale', 'done']]],
            ['amount_total', 'date_order', 'x_original_confirmation_date', 'partner_id']
          ]
        }
      });

      if (error) throw error;

      // Fetch partner details to get state information
      const partnerIds = [...new Set(salesOrders?.map((o: any) => o.partner_id[0]) || [])];
      
      const { data: partners, error: partnerError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'res.partner',
          method: 'search_read',
          args: [
            [['id', 'in', partnerIds]],
            ['id', 'state_id']
          ]
        }
      });

      if (partnerError) throw partnerError;

      // Create a map of partner_id to state
      const partnerStateMap = new Map();
      partners?.forEach((p: any) => {
        if (p.state_id && p.state_id[1]) {
          partnerStateMap.set(p.id, p.state_id[1]);
        }
      });

      // Enrich orders with state information
      const enrichedOrders = salesOrders?.map((order: any) => ({
        ...order,
        state: partnerStateMap.get(order.partner_id[0]) || 'Unknown'
      })) || [];

      setAllOrders(enrichedOrders);
      return enrichedOrders;
    } catch (error) {
      console.error('Regional sales sync error:', error);
      toast({
        title: "Regional sales sync failed",
        description: error instanceof Error ? error.message : "Failed to sync regional sales data",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  // Apply filters and aggregate by region
  useEffect(() => {
    let filteredOrders = [...allOrders];

    // Apply date range filter using original confirmation date
    if (filters.dateRange.startDate && filters.dateRange.endDate) {
      filteredOrders = filteredOrders.filter((order) => {
        const confirmDate = order.x_original_confirmation_date || order.date_order;
        const orderDate = new Date(confirmDate);
        return (
          orderDate >= filters.dateRange.startDate! &&
          orderDate <= filters.dateRange.endDate!
        );
      });
    }

    // Apply deal status filter
    if (filters.dealStatus.length > 0) {
      filteredOrders = filteredOrders.filter((order) => 
        filters.dealStatus.includes(order.state)
      );
    }

    // Aggregate by state/region
    const regionMap = new Map<string, { sales: number; orders: number }>();
    
    filteredOrders.forEach((order: any) => {
      const state = order.state;
      // Map full state name to abbreviation
      const stateAbbr = Object.entries(STATE_MAP).find(
        ([fullName]) => state.includes(fullName)
      )?.[1];
      
      if (stateAbbr) {
        const existing = regionMap.get(stateAbbr) || { sales: 0, orders: 0 };
        regionMap.set(stateAbbr, {
          sales: existing.sales + order.amount_total,
          orders: existing.orders + 1
        });
      }
    });

    // Convert to array
    const data: RegionSales[] = Array.from(regionMap.entries())
      .map(([region, stats]) => ({
        region,
        sales: Math.round(stats.sales),
        orders: stats.orders
      }))
      .sort((a, b) => b.sales - a.sales);

    setRegionData(data);
  }, [allOrders, filters.dateRange, filters.dealStatus]);

  return { regionData, isLoading, refetch: fetchSalesData };
};
