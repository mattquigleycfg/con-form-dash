import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MrpProduction {
  id: number;
  name: string;
  origin: string;
  product_id: [number, string];
  bom_id: [number, string] | false;
  product_qty: number;
  date_planned_start: string;
  state: string;
}

export interface MrpBom {
  id: number;
  code: string;
  product_tmpl_id: [number, string];
  product_id: [number, string] | false;
  product_qty: number;
  type: string;
}

export interface MrpBomLine {
  id: number;
  bom_id: [number, string];
  product_id: [number, string];
  product_qty: number;
  product_uom_id: [number, string];
  sequence: number;
}

export interface ProductCost {
  id: number;
  name: string;
  default_code: string;
  standard_price: number;
  list_price: number;
  uom_id: [number, string];
}

export const useOdooMRP = (saleOrderName?: string) => {
  // Fetch manufacturing orders for this sale order
  const { data: manufacturingOrders, isLoading: loadingMOs } = useQuery({
    queryKey: ["odoo-mrp-production", saleOrderName],
    queryFn: async () => {
      if (!saleOrderName) return [];

      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "mrp.production",
          method: "search_read",
          args: [
            [
              ["origin", "=", saleOrderName],
              ["state", "not in", ["cancel"]],
            ],
            [
              "id",
              "name",
              "origin",
              "product_id",
              "bom_id",
              "product_qty",
              "date_planned_start",
              "state",
            ],
          ],
        },
      });

      if (error) throw error;
      return data as MrpProduction[];
    },
    enabled: !!saleOrderName,
    refetchInterval: 60000,
  });

  // Fetch BoM details for all manufacturing orders
  const bomIds = manufacturingOrders
    ?.filter((mo) => mo.bom_id)
    .map((mo) => mo.bom_id[0]) || [];

  const { data: boms, isLoading: loadingBoms } = useQuery({
    queryKey: ["odoo-mrp-bom", bomIds],
    queryFn: async () => {
      if (bomIds.length === 0) return [];

      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "mrp.bom",
          method: "search_read",
          args: [
            [["id", "in", bomIds]],
            ["id", "code", "product_tmpl_id", "product_id", "product_qty", "type"],
          ],
        },
      });

      if (error) throw error;
      return data as MrpBom[];
    },
    enabled: bomIds.length > 0,
    refetchInterval: 120000,
  });

  // Fetch BoM lines (components)
  const { data: bomLines, isLoading: loadingBomLines } = useQuery({
    queryKey: ["odoo-mrp-bom-lines", bomIds],
    queryFn: async () => {
      if (bomIds.length === 0) return [];

      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "mrp.bom.line",
          method: "search_read",
          args: [
            [["bom_id", "in", bomIds]],
            ["id", "bom_id", "product_id", "product_qty", "product_uom_id", "sequence"],
          ],
        },
      });

      if (error) throw error;
      return data as MrpBomLine[];
    },
    enabled: bomIds.length > 0,
    refetchInterval: 120000,
  });

  // Fetch product costs for all components
  const productIds = bomLines?.map((line) => line.product_id[0]) || [];

  const { data: productCosts, isLoading: loadingProducts } = useQuery({
    queryKey: ["odoo-product-costs", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];

      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "product.product",
          method: "search_read",
          args: [
            [["id", "in", productIds]],
            ["id", "name", "default_code", "standard_price", "list_price", "uom_id"],
          ],
        },
      });

      if (error) throw error;
      return data as ProductCost[];
    },
    enabled: productIds.length > 0,
    refetchInterval: 120000,
  });

  return {
    manufacturingOrders,
    boms,
    bomLines,
    productCosts,
    isLoading: loadingMOs || loadingBoms || loadingBomLines || loadingProducts,
  };
};
