import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PurchaseOrder {
  id: number;
  name: string;
  partner_id: [number, string];
  date_order: string;
  amount_total: number;
  state: string;
  currency_id: [number, string];
}

export const useOdooPurchase = () => {
  return useQuery({
    queryKey: ["odoo-purchase"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "purchase.order",
          method: "search_read",
          args: [
            [["state", "in", ["draft", "sent", "to approve", "purchase"]]],
            ["id", "name", "partner_id", "date_order", "amount_total", "state", "currency_id"],
          ],
        },
      });

      if (error) throw error;
      return data as PurchaseOrder[];
    },
    refetchInterval: 30000,
  });
};
