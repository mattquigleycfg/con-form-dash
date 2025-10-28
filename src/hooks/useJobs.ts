import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Job {
  id: string;
  user_id: string;
  odoo_sale_order_id: number;
  sale_order_name: string;
  analytic_account_id?: number;
  analytic_account_name?: string;
  customer_name: string;
  total_budget: number;
  material_budget: number;
  non_material_budget: number;
  total_actual: number;
  material_actual: number;
  non_material_actual: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useJobs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Job[];
    },
    enabled: !!user,
  });

  const createJob = useMutation({
    mutationFn: async (job: Omit<Job, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("jobs")
        .insert([{ ...job, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const updateJob = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Job> & { id: string }) => {
      const { data, error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  return {
    jobs,
    isLoading,
    createJob: createJob.mutate,
    updateJob: updateJob.mutate,
  };
};
