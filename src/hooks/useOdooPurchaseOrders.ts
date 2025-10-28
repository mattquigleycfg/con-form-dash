import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PurchaseOrder {
  id: number;
  name: string;
  partner_id: [number, string];
  amount_total: number;
  state: string;
  analytic_account_id: number | false;
  date_order: string;
}

export const useOdooPurchaseOrders = (analyticAccountId?: number) => {
  return useQuery({
    queryKey: ["odoo-purchase-orders", analyticAccountId],
    queryFn: async () => {
      const filters: any[] = [["state", "in", ["purchase", "done"]]];
      
      if (analyticAccountId) {
        filters.push(["analytic_account_id", "=", analyticAccountId]);
      }

      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "purchase.order",
          method: "search_read",
          args: [
            filters,
            ["id", "name", "partner_id", "amount_total", "state", "analytic_account_id", "date_order"],
          ],
        },
      });

      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!analyticAccountId,
    refetchInterval: 30000,
  });
};
