import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SaleOrderLine {
  id: number;
  order_id: [number, string];
  product_id: [number, string];
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
  detailed_type: string; // 'service', 'consu', 'product'
  standard_price: number; // product cost
  default_code: string | false; // product SKU
}

export const useOdooSaleOrderLines = (saleOrderId?: number) => {
  return useQuery({
    queryKey: ["odoo-sale-order-lines", saleOrderId],
    queryFn: async () => {
      if (!saleOrderId) return [];

      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "sale.order.line",
          method: "search_read",
          args: [
            [["order_id", "=", saleOrderId]],
            ["id", "order_id", "product_id", "product_uom_qty", "price_unit", "price_subtotal"],
          ],
        },
      });

      if (error) throw error;

      // Fetch product details for each line to get type and cost
      const lines = data as any[];
      const productIds = lines.map(line => line.product_id[0]);

      const { data: products, error: productError } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "product.product",
          method: "search_read",
          args: [
            [["id", "in", productIds]],
            ["id", "detailed_type", "standard_price", "default_code"],
          ],
        },
      });

      if (productError) throw productError;

      const productMap = new Map((products as any[]).map(p => [p.id, p]));

      return lines.map(line => {
        const product = productMap.get(line.product_id[0]);
        return {
          ...line,
          detailed_type: product?.detailed_type || 'product',
          standard_price: product?.standard_price || 0,
          default_code: product?.default_code || false,
        };
      }) as SaleOrderLine[];
    },
    enabled: !!saleOrderId,
    refetchInterval: 30000,
  });
};
