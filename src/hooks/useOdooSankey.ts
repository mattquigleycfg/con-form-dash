import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFilters } from "@/contexts/FilterContext";
import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export const useOdooSankey = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sankeyData, setSankeyData] = useState<SankeyData>({ nodes: [], links: [] });
  const { toast } = useToast();
  const { filters } = useFilters();

  const fetchSankeyData = async () => {
    setIsLoading(true);
    
    try {
      // Calculate date filters
      let dateFilter: string | undefined;
      let endDateFilter: string | undefined;

      if (filters.dateRange.preset !== 'all') {
        const today = new Date();
        if (filters.dateRange.preset === 'month') {
          dateFilter = startOfMonth(today).toISOString().split('T')[0];
          endDateFilter = endOfMonth(today).toISOString().split('T')[0];
        } else if (filters.dateRange.preset === 'quarter') {
          dateFilter = startOfQuarter(today).toISOString().split('T')[0];
          endDateFilter = endOfQuarter(today).toISOString().split('T')[0];
        } else if (filters.dateRange.preset === 'year') {
          dateFilter = startOfYear(today).toISOString().split('T')[0];
          endDateFilter = endOfYear(today).toISOString().split('T')[0];
        } else if (filters.dateRange.preset === 'custom' && filters.dateRange.startDate && filters.dateRange.endDate) {
          dateFilter = filters.dateRange.startDate.toISOString().split('T')[0];
          endDateFilter = filters.dateRange.endDate.toISOString().split('T')[0];
        }
      }

      // Fetch sales orders with pipeline stage info
      const orderFilters: any[] = [['state', 'in', ['sale', 'done']]];
      const { data: orders, error: orderError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            orderFilters,
            ['id', 'name', 'user_id', 'amount_total', 'date_order', 'partner_id']
          ]
        }
      });

      if (orderError) throw orderError;

      // Filter by date
      let filteredOrders = orders || [];
      if (dateFilter && filteredOrders.length > 0) {
        filteredOrders = filteredOrders.filter((order: any) => {
          const confirmDate = order.original_confirmation_date || order.x_original_confirmation_date || order.date_order;
          return confirmDate >= dateFilter && (!endDateFilter || confirmDate <= endDateFilter);
        });
      }

      if (!filteredOrders || filteredOrders.length === 0) {
        setSankeyData({ nodes: [], links: [] });
        return { nodes: [], links: [] };
      }

      // Calculate total revenue
      const totalRevenue = filteredOrders.reduce((sum: number, o: any) => sum + (o.amount_total || 0), 0);

      // Get order IDs and fetch lines
      const orderIds = filteredOrders.map((o: any) => o.id);
      const { data: orderLines, error: lineError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order.line',
          method: 'search_read',
          args: [
            [['order_id', 'in', orderIds]],
            ['order_id', 'product_id', 'price_subtotal', 'product_uom_qty']
          ]
        }
      });

      if (lineError) throw lineError;

      // Aggregate by sales rep
      const repRevenue = new Map<string, number>();
      filteredOrders.forEach((order: any) => {
        const rep = order.user_id ? order.user_id[1] : "Unassigned";
        repRevenue.set(rep, (repRevenue.get(rep) || 0) + order.amount_total);
      });

      // Get top 5 reps
      const topReps = Array.from(repRevenue.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Aggregate by product category (using product names for now)
      const productRevenue = new Map<string, number>();
      orderLines?.forEach((line: any) => {
        const product = line.product_id ? line.product_id[1] : "Unknown";
        productRevenue.set(product, (productRevenue.get(product) || 0) + line.price_subtotal);
      });

      // Get top 5 products
      const topProducts = Array.from(productRevenue.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      // Calculate metrics for funnel
      const totalOrders = filteredOrders.length;
      const avgOrderValue = totalRevenue / totalOrders;

      // Build multi-stage Sankey: Total Revenue → Sales Reps → Products
      const nodes: SankeyNode[] = [
        { name: `Total Revenue\n$${(totalRevenue / 1000000).toFixed(2)}M` },
        ...topReps.map(([rep, value]) => ({ 
          name: `${rep}\n$${(value / 1000).toFixed(0)}K` 
        })),
        ...topProducts.map(([prod, value]) => ({ 
          name: `${prod.length > 30 ? prod.substring(0, 30) + '...' : prod}\n$${(value / 1000).toFixed(0)}K` 
        }))
      ];

      const links: SankeyLink[] = [];

      // Total Revenue → Top Sales Reps
      topReps.forEach(([rep], idx) => {
        links.push({
          source: 0,
          target: idx + 1,
          value: repRevenue.get(rep)!
        });
      });

      // Sales Reps → Products (map products to reps)
      const repToProducts = new Map<string, Map<string, number>>();
      orderLines?.forEach((line: any) => {
        const orderId = line.order_id?.[0];
        const order = filteredOrders.find((o: any) => o.id === orderId);
        if (!order) return;

        const rep = order.user_id ? order.user_id[1] : "Unassigned";
        const product = line.product_id ? line.product_id[1] : "Unknown";
        
        if (!repToProducts.has(rep)) {
          repToProducts.set(rep, new Map());
        }
        const prodMap = repToProducts.get(rep)!;
        prodMap.set(product, (prodMap.get(product) || 0) + line.price_subtotal);
      });

      // Create links from top reps to top products
      topReps.forEach(([rep], repIdx) => {
        const products = repToProducts.get(rep);
        if (!products) return;

        topProducts.forEach(([prod], prodIdx) => {
          const value = products.get(prod) || 0;
          if (value > 0) {
            links.push({
              source: repIdx + 1,
              target: topReps.length + 1 + prodIdx,
              value: value
            });
          }
        });
      });

      setSankeyData({ nodes, links });
      return { nodes, links };
    } catch (error) {
      console.error('Sankey data fetch error:', error);
      // Don't show toast on every error, just log it
      setSankeyData({ nodes: [], links: [] });
      return { nodes: [], links: [] };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSankeyData();
  }, [filters.dateRange]);

  return { sankeyData, isLoading, refetch: fetchSankeyData };
};
