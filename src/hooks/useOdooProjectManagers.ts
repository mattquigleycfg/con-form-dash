import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OdooUser {
  id: number;
  name: string;
  login: string;
  email: string | false;
  phone: string | false;
}

export const useOdooProjectManagers = (searchTerm: string = "") => {
  return useQuery({
    queryKey: ["odoo-project-managers", searchTerm],
    queryFn: async () => {
      // Based on the screenshot, we need to query res.users with specific domain filters
      // Field: user_id, Model: project.project, Type: many2one, Relationship: res.users
      const filters: any[] = [
        ["share", "=", false], // Only internal users (not portal/public)
        ["active", "=", true]
      ];
      
      if (searchTerm) {
        filters.push("|", ["name", "ilike", searchTerm], ["email", "ilike", searchTerm]);
      }

      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "res.users",
          method: "search_read",
          args: [
            filters,
            ["id", "name", "login", "email", "phone"],
            0,
            50, // limit to 50 results
          ],
        },
      });

      if (error) throw error;
      return data as OdooUser[];
    },
    enabled: searchTerm.length >= 2,
  });
};

