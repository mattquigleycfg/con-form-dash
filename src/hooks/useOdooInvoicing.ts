import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Invoice {
  id: number;
  name: string;
  partner_id: [number, string];
  invoice_date: string | false;
  invoice_date_due: string | false;
  amount_total: number;
  amount_residual: number;
  state: string;
  move_type: string;
  currency_id: [number, string];
}

export const useOdooInvoicing = () => {
  return useQuery({
    queryKey: ["odoo-invoicing"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "account.move",
          method: "search_read",
          args: [
            [["move_type", "in", ["out_invoice", "out_refund"]], ["state", "in", ["draft", "posted"]]],
            ["id", "name", "partner_id", "invoice_date", "invoice_date_due", "amount_total", "amount_residual", "state", "move_type", "currency_id"],
          ],
        },
      });

      if (error) throw error;
      return data as Invoice[];
    },
    refetchInterval: 30000,
  });
};
