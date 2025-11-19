import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OdooVendor {
  id: number;
  name: string;
  email: string | false;
  phone: string | false;
  city: string | false;
  supplier_rank: number;
}

export const useOdooVendors = (searchTerm: string = "") => {
  return useQuery({
    queryKey: ["odoo-vendors", searchTerm],
    queryFn: async () => {
      const filters: any[] = [["supplier_rank", ">", 0]];
      
      if (searchTerm) {
        filters.push("|", ["name", "ilike", searchTerm], ["email", "ilike", searchTerm]);
      }

      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "res.partner",
          method: "search_read",
          args: [
            filters,
            ["id", "name", "email", "phone", "city", "supplier_rank"],
            0,
            50, // limit to 50 results
          ],
        },
      });

      if (error) throw error;
      return data as OdooVendor[];
    },
    enabled: searchTerm.length >= 2,
  });
};

