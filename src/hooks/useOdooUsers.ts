import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OdooUser {
  id: number;
  name: string;
  login: string;
  active: boolean;
}

export const useOdooUsers = () => {
  return useQuery({
    queryKey: ["odoo-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "res.users",
          method: "search_read",
          args: [
            [["active", "=", true]],
            ["id", "name", "login"],
          ],
          kwargs: {
            order: "name asc",
          },
        },
      });

      if (error) throw error;
      return (data as OdooUser[]).filter((user) => user.id > 1); // Filter out system user
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

