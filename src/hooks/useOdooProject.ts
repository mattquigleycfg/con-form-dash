import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Project {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  date_start: string | false;
  date: string | false;
  user_id: [number, string] | false;
  task_count: number;
  analytic_account_id: [number, string] | false;
}

export interface Task {
  id: number;
  name: string;
  project_id: [number, string] | false;
  user_ids: Array<[number, string]>;
  date_deadline: string | false;
  stage_id: [number, string];
  priority: string;
}

export const useOdooProjects = () => {
  return useQuery({
    queryKey: ["odoo-projects"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "project.project",
          method: "search_read",
          args: [
            [["active", "=", true]],
            ["id", "name", "partner_id", "date_start", "date", "user_id", "task_count", "analytic_account_id"],
          ],
        },
      });

      if (error) throw error;
      return data as Project[];
    },
    refetchInterval: 30000,
  });
};

export const useOdooTasks = () => {
  return useQuery({
    queryKey: ["odoo-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "project.task",
          method: "search_read",
          args: [
            [["active", "=", true], ["stage_id.fold", "=", false]],
            ["id", "name", "project_id", "user_ids", "date_deadline", "stage_id", "priority"],
          ],
        },
      });

      if (error) throw error;
      return data as Task[];
    },
    refetchInterval: 30000,
  });
};
