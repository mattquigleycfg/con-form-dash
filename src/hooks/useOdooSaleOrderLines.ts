import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SaleOrderLine {
  id: number;
  order_id: [number, string];
  product_id: [number, string];
  name: string;
  product_uom_qty: number;
  qty_delivered: number;
  price_unit: number;
  price_subtotal: number;
  product_uom: [number, string];
  
  // Cost fields
  purchase_price?: number;
  actual_cost: number;
  total_cost: number;
  
  // Product info
  detailed_type: 'service' | 'consu' | 'product';
  is_material: boolean;
  standard_price: number;
  default_code: string | false;
  
  // Margin
  line_margin: number;
  margin_percent: number;
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
            [
              "id", "order_id", "product_id", "name",
              "product_uom_qty", "qty_delivered", "price_unit", 
              "price_subtotal", "discount", "product_uom", "sequence",
              "purchase_price"
            ],
          ],
        },
      });

      if (error) throw error;

      const lines = data as any[];
      if (!lines || lines.length === 0) return [];

      const productIds = lines.map(line => line.product_id[0]);

      const { data: products, error: productError } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "product.product",
          method: "search_read",
          args: [
            [["id", "in", productIds]],
            ["id", "detailed_type", "type", "standard_price", "default_code"],
          ],
        },
      });

      if (productError) throw productError;

      const productMap = new Map((products as any[]).map(p => [p.id, p]));

      const enrichedLines: SaleOrderLine[] = lines.map(line => {
        const product = productMap.get(line.product_id[0]);
        
        const detailedType = (product?.detailed_type || product?.type || 'product') as 'service' | 'consu' | 'product';
        const isMaterial = detailedType === 'consu' || detailedType === 'product';
        
        // Cost fallback: purchase_price → standard_price → 0
        let actualCost = 0;
        if (line.purchase_price !== undefined && line.purchase_price !== null && line.purchase_price !== false) {
          actualCost = line.purchase_price;
          console.log(`Line ${line.id} (${line.product_id[1]}): Using purchase_price = ${actualCost}`);
        } else if (product?.standard_price !== undefined && product?.standard_price !== null) {
          actualCost = product.standard_price;
          console.log(`Line ${line.id} (${line.product_id[1]}): Using standard_price = ${actualCost}`);
        } else {
          console.warn(`Line ${line.id} (${line.product_id[1]}): No cost found!`);
        }
        
        const totalCost = actualCost * line.product_uom_qty;
        const lineMargin = line.price_subtotal - totalCost;
        const marginPercent = line.price_subtotal > 0 ? (lineMargin / line.price_subtotal) * 100 : 0;
        
        return {
          id: line.id,
          order_id: line.order_id,
          product_id: line.product_id,
          name: line.name,
          product_uom_qty: line.product_uom_qty,
          qty_delivered: line.qty_delivered || 0,
          price_unit: line.price_unit,
          price_subtotal: line.price_subtotal,
          product_uom: line.product_uom,
          purchase_price: line.purchase_price || undefined,
          actual_cost: actualCost,
          total_cost: totalCost,
          detailed_type: detailedType,
          is_material: isMaterial,
          standard_price: product?.standard_price || 0,
          default_code: product?.default_code || false,
          line_margin: lineMargin,
          margin_percent: marginPercent,
        };
      });

      const linesWithCost = enrichedLines.filter(l => l.actual_cost > 0).length;
      console.log(`SO ${saleOrderId}: ${enrichedLines.length} lines, ${linesWithCost} with cost, ${enrichedLines.length - linesWithCost} without cost`);

      return enrichedLines;
    },
    enabled: !!saleOrderId,
    refetchInterval: 30000,
  });
};
