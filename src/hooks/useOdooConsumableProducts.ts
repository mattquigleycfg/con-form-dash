import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OdooConsumableProduct {
  id: number;
  name: string;
  default_code: string | false;
  standard_price: number;
  detailed_type: string;
  uom_id: [number, string];
  categ_id: [number, string];
}

export const useOdooConsumableProducts = (searchTerm: string = "") => {
  return useQuery({
    queryKey: ["odoo-consumable-products", searchTerm],
    queryFn: async () => {
      // Filter for consumable products (detailed_type = 'consu')
      const filters: any[] = [
        ["detailed_type", "=", "consu"],
        ["active", "=", true]
      ];
      
      if (searchTerm) {
        filters.push("|", ["name", "ilike", searchTerm], ["default_code", "ilike", searchTerm]);
      }

      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "product.product",
          method: "search_read",
          args: [
            filters,
            ["id", "name", "default_code", "standard_price", "detailed_type", "uom_id", "categ_id"],
            0,
            50, // limit to 50 results
          ],
        },
      });

      if (error) throw error;
      return data as OdooConsumableProduct[];
    },
    enabled: searchTerm.length >= 2,
  });
};

