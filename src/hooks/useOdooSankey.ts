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
      // Calculate date filters based on filter context
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

      // Fetch sales orders
      const orderFilters: any[] = [['state', 'in', ['sale', 'done']]];
      if (dateFilter) orderFilters.push(['date_order', '>=', dateFilter]);
      if (endDateFilter) orderFilters.push(['date_order', '<=', endDateFilter]);

      const { data: orders, error: orderError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            orderFilters,
            ['id', 'name', 'user_id', 'amount_total']
          ]
        }
      });

      if (orderError) throw orderError;

      if (!orders || orders.length === 0) {
        setSankeyData({ nodes: [], links: [] });
        return { nodes: [], links: [] };
      }

      // Get order IDs
      const orderIds = orders.map((o: any) => o.id);

      // Fetch order lines for these orders
      const { data: orderLines, error: lineError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order.line',
          method: 'search_read',
          args: [
            [['order_id', 'in', orderIds]],
            ['order_id', 'product_id', 'price_subtotal']
          ]
        }
      });

      if (lineError) throw lineError;

      // Create order ID to salesperson map
      const orderToSalesperson = new Map<number, string>();
      orders.forEach((order: any) => {
        const salesRep = order.user_id ? order.user_id[1] : "Unassigned";
        orderToSalesperson.set(order.id, salesRep);
      });

      // Build Salesperson -> Product flow
      const salesReps = new Set<string>();
      const products = new Set<string>();
      const repToProduct = new Map<string, Map<string, number>>();

      orderLines?.forEach((line: any) => {
        const orderId = line.order_id ? line.order_id[0] : null;
        if (!orderId) return;

        const salesRep = orderToSalesperson.get(orderId) || "Unassigned";
        const product = line.product_id ? line.product_id[1] : "Unknown Product";
        const value = line.price_subtotal || 0;

        salesReps.add(salesRep);
        products.add(product);

        if (!repToProduct.has(salesRep)) repToProduct.set(salesRep, new Map());
        const productMap = repToProduct.get(salesRep)!;
        productMap.set(product, (productMap.get(product) || 0) + value);
      });

      // Limit to top 5 salespeople and top 10 products for readability
      const repTotals = new Map<string, number>();
      repToProduct.forEach((products, rep) => {
        let total = 0;
        products.forEach(value => total += value);
        repTotals.set(rep, total);
      });

      const topReps = Array.from(repTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([rep]) => rep);

      // Get top products across all top reps
      const productTotals = new Map<string, number>();
      repToProduct.forEach((products, rep) => {
        if (!topReps.includes(rep)) return;
        products.forEach((value, product) => {
          productTotals.set(product, (productTotals.get(product) || 0) + value);
        });
      });

      const topProducts = Array.from(productTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([product]) => product);

      // Build nodes array
      const nodes: SankeyNode[] = [
        ...topReps.map(s => ({ name: s })),
        ...topProducts.map(p => ({ name: p }))
      ];

      // Build links array
      const links: SankeyLink[] = [];
      const nodeIndex = (name: string) => nodes.findIndex(n => n.name === name);

      // Salesperson -> Product links
      repToProduct.forEach((products, rep) => {
        if (!topReps.includes(rep)) return;
        products.forEach((value, product) => {
          if (!topProducts.includes(product)) return;
          const sourceIdx = nodeIndex(rep);
          const targetIdx = nodeIndex(product);
          if (sourceIdx >= 0 && targetIdx >= 0) {
            links.push({
              source: sourceIdx,
              target: targetIdx,
              value: Math.round(value)
            });
          }
        });
      });

      setSankeyData({ nodes, links });
      return { nodes, links };
    } catch (error) {
      console.error('Sankey data fetch error:', error);
      toast({
        title: "Failed to fetch Sankey data",
        description: error instanceof Error ? error.message : "Failed to fetch Sankey data",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSankeyData();
  }, [filters.dateRange]);

  return { sankeyData, isLoading, refetch: fetchSankeyData };
};
