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
  purchase_price?: number;  // Unit cost from sale_margin module
  standard_price: number;   // Fallback cost from product
  actual_cost: number;      // Computed: best available cost
  total_cost: number;       // Computed: actual_cost * quantity

  // Product info
  detailed_type: 'service' | 'consu' | 'product';
  is_material: boolean;
  default_code: string | false;
  display_type?: string;

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
              "purchase_price", "display_type",
              "margin", "margin_percent"
            ],
          ],
        },
      });

      if (error) {
        console.error('❌ Odoo Sale Order Lines Error:', {
          orderId: saleOrderId,
          error,
          errorData: data,
          errorDetails: (data as any)?.details,
          message: error.message
        });
        throw error;
      }

      const lines = data as any[];
      if (!lines || lines.length === 0) return [];

      // Debug: Log first line to verify fields are present
      if (lines.length > 0) {
        console.log('Sale order line sample:', {
          id: lines[0].id,
          has_purchase_price: lines[0].purchase_price !== undefined,
          has_margin: lines[0].margin !== undefined,
          has_margin_percent: lines[0].margin_percent !== undefined
        });
      }

      const productIds = lines
        .map((line: any) => line.product_id && line.product_id[0])
        .filter(Boolean);

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

      const enrichedLines: SaleOrderLine[] = (
        lines.map((line: any) => {
          // Skip non-product lines (sections/notes) or missing product
          if (!line.product_id || !line.product_id[0] || line.display_type) {
            return null as any;
          }

          const product = productMap.get(line.product_id[0]);

          const detailedTypeRaw = (product?.detailed_type || product?.type || 'product') as string;
          const detailedType = detailedTypeRaw?.toLowerCase?.() as 'service' | 'consu' | 'product';
          const isMaterial = detailedType === 'consu' || detailedType === 'product';

          // COST FALLBACK LOGIC (priority): purchase_price → margin calculation → product.standard_price → 0
          let actualCost = 0;

          const valPurchase = line.purchase_price;

          // First try purchase_price (from sale_margin module)
          if (valPurchase !== undefined && valPurchase !== null && valPurchase !== false) {
            actualCost = Number(valPurchase) || 0;
          }

          const quantity = Number(line.product_uom_qty || 0);

          if ((!actualCost || actualCost <= 0) && line.margin !== undefined && line.margin !== null) {
            const marginValue = Number(line.margin);
            const subtotal = Number(line.price_subtotal || 0);
            const totalCostFromMargin = subtotal - marginValue;
            const perUnit = quantity > 0 ? totalCostFromMargin / quantity : 0;
            if (perUnit > 0) {
              actualCost = perUnit;
            }
          }

          if ((!actualCost || actualCost <= 0) && line.margin_percent !== undefined && line.margin_percent !== null) {
            const marginPercent = Number(line.margin_percent);
            if (marginPercent > 0 && marginPercent < 100) {
              const perUnit = Number(line.price_unit || 0) * (1 - marginPercent / 100);
              if (perUnit > 0) {
                actualCost = perUnit;
              }
            }
          }

          if ((!actualCost || actualCost <= 0)) {
            const dynamicKeys = Object.keys(line).filter((k) =>
              k.startsWith('x_') && /(purchase.*price|cost.*price|purchase_price|cost)/i.test(k)
            );
            for (const k of dynamicKeys) {
              const v = Number((line as any)[k]);
              if (!isNaN(v) && v > 0) {
                actualCost = v;
                break;
              }
            }
          }

          if ((!actualCost || actualCost <= 0) && product?.standard_price !== undefined && product?.standard_price !== null) {
            actualCost = Number(product.standard_price) || 0;
          }

          if ((!actualCost || actualCost <= 0) && line.price_subtotal) {
            const subtotal = Number(line.price_subtotal || 0);
            actualCost = quantity > 0 ? subtotal / quantity : subtotal;
          }

          // Ensure actualCost is non-negative
          actualCost = Math.max(0, actualCost);
          
          // Calculate total cost
          let totalCost = actualCost * (line.product_uom_qty || 0);

          let lineMargin = Number(line.margin ?? 0);
          if (!lineMargin && line.margin !== 0) {
            lineMargin = (Number(line.price_subtotal || 0)) - totalCost;
          }
          const marginPercent = line.margin_percent !== undefined && line.margin_percent !== null
            ? Number(line.margin_percent)
            : (Number(line.price_subtotal || 0) > 0 ? (lineMargin / Number(line.price_subtotal || 0)) * 100 : 0);

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
            purchase_price: (line.purchase_price !== false && line.purchase_price !== null) ? Number(line.purchase_price) : undefined,
            standard_price: product?.standard_price || 0,
            actual_cost: actualCost,
            total_cost: totalCost,
            detailed_type: detailedType,
            is_material: isMaterial,
            default_code: product?.default_code || false,
            display_type: line.display_type,
            line_margin: lineMargin,
            margin_percent: marginPercent,
          } as SaleOrderLine;
        }).filter(Boolean) as SaleOrderLine[]
      );

      return enrichedLines;
    },
    enabled: !!saleOrderId,
    refetchInterval: 30000,
  });
};
