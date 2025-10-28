import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticLine {
  id: number;
  name: string;
  amount: number;
  unit_amount: number;
  date: string;
  account_id: [number, string];
  product_id: [number, string] | false;
  employee_id: [number, string] | false;
  category: string;
}

export const useOdooAnalyticLines = (analyticAccountId?: number) => {
  return useQuery({
    queryKey: ["odoo-analytic-lines", analyticAccountId],
    queryFn: async () => {
      if (!analyticAccountId) return [];

      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "account.analytic.line",
          method: "search_read",
          args: [
            [["account_id", "=", analyticAccountId]],
            ["id", "name", "amount", "unit_amount", "date", "account_id", "product_id", "employee_id", "category"],
          ],
        },
      });

      if (error) throw error;
      return data as AnalyticLine[];
    },
    enabled: !!analyticAccountId,
    refetchInterval: 30000,
  });
};
