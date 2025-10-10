import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HelpdeskTicket {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  user_id: [number, string] | false;
  team_id: [number, string] | false;
  stage_id: [number, string];
  priority: string;
  create_date: string;
  ticket_type_id: [number, string] | false;
}

export const useOdooHelpdesk = () => {
  return useQuery({
    queryKey: ["odoo-helpdesk"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "helpdesk.ticket",
          method: "search_read",
          args: [
            [["active", "=", true], ["stage_id.fold", "=", false]],
            ["id", "name", "partner_id", "user_id", "team_id", "stage_id", "priority", "create_date", "ticket_type_id"],
          ],
        },
      });

      if (error) throw error;
      return data as HelpdeskTicket[];
    },
    refetchInterval: 30000,
  });
};
