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
  product_cost?: number;
  cost_price?: number;
  standard_price: number;
  actual_cost: number;
  total_cost: number;

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
              "purchase_price", "product_cost", "cost_price", "display_type"
            ],
          ],
        },
      });

      if (error) throw error;

      const lines = data as any[];
      if (!lines || lines.length === 0) return [];

      // If no obvious cost fields are present, run a debug fetch to inspect available fields
      const needsDebug = lines.every((l: any) =>
        (l.purchase_price === undefined || l.purchase_price === null || l.purchase_price === false) &&
        (l.product_cost === undefined || l.product_cost === null) &&
        (l.cost_price === undefined || l.cost_price === null)
      );

      if (needsDebug) {
        const { data: debugLine } = await supabase.functions.invoke("odoo-query", {
          body: {
            model: "sale.order.line",
            method: "search_read",
            args: [
              [["order_id", "=", saleOrderId]],
              [] // Empty array returns all fields
            ],
            kwargs: {
              limit: 1
            }
          }
        });
        if (debugLine && (debugLine as any[]).length > 0) {
          const line0 = (debugLine as any[])[0];
          console.log("Available fields on sale.order.line:", Object.keys(line0));
          console.log("Full line data:", line0);
        }
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

          const detailedType = (product?.detailed_type || product?.type || 'product') as 'service' | 'consu' | 'product';
          const isMaterial = detailedType === 'consu' || detailedType === 'product';

          // COST FALLBACK LOGIC (priority): purchase_price → product_cost → cost_price → product.standard_price → 0
          let actualCost = 0;
          let costSource = '';

          const valPurchase = line.purchase_price;
          const valProductCost = line.product_cost;
          const valCostPrice = line.cost_price;

          if (valPurchase !== undefined && valPurchase !== null && valPurchase !== false) {
            actualCost = Number(valPurchase) || 0;
            costSource = 'purchase_price';
          } else if (valProductCost !== undefined && valProductCost !== null) {
            actualCost = Number(valProductCost) || 0;
            costSource = 'product_cost';
          } else if (valCostPrice !== undefined && valCostPrice !== null) {
            actualCost = Number(valCostPrice) || 0;
            costSource = 'cost_price';
          } else {
            // Try to detect custom fields like x_purchase_price or x_cost
            const dynamicKeys = Object.keys(line).filter(k =>
              k.startsWith('x_') && /(purchase.*price|cost.*price|purchase_price|cost)/i.test(k)
            );
            for (const k of dynamicKeys) {
              const v = Number((line as any)[k]);
              if (!isNaN(v) && v > 0) {
                actualCost = v;
                costSource = k;
                break;
              }
            }
            if (!actualCost && product?.standard_price !== undefined && product?.standard_price !== null) {
              actualCost = Number(product.standard_price) || 0;
              costSource = 'standard_price';
            }
          }

          if (!actualCost) {
            console.warn(`Line ${line.id} (${line.product_id?.[1]}): No cost found!`);
          } else {
            console.log(`Line ${line.id} (${line.product_id?.[1]}): Using ${costSource} = ${actualCost}`);
          }

          const totalCost = actualCost * (line.product_uom_qty || 0);
          const lineMargin = (line.price_subtotal || 0) - totalCost;
          const marginPercent = (line.price_subtotal || 0) > 0 ? (lineMargin / line.price_subtotal) * 100 : 0;

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
            product_cost: (line.product_cost !== undefined && line.product_cost !== null) ? Number(line.product_cost) : undefined,
            cost_price: (line.cost_price !== undefined && line.cost_price !== null) ? Number(line.cost_price) : undefined,
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

      const linesWithCost = enrichedLines.filter(l => l.actual_cost > 0).length;
      console.log(`SO ${saleOrderId}: ${enrichedLines.length} lines, ${linesWithCost} with cost, ${enrichedLines.length - linesWithCost} without cost`);

      return enrichedLines;
    },
    enabled: !!saleOrderId,
    refetchInterval: 30000,
  });
};
