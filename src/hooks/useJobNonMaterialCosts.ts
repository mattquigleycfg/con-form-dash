import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NonMaterialCost {
  id: string;
  job_id: string;
  cost_type: "installation" | "freight" | "cranage" | "travel" | "accommodation" | "other";
  description?: string;
  amount: number;
  odoo_purchase_order_id?: number;
  is_from_odoo: boolean;
  created_at: string;
  updated_at: string;
}

export const useJobNonMaterialCosts = (jobId?: string) => {
  const queryClient = useQueryClient();

  const { data: costs, isLoading } = useQuery({
    queryKey: ["job-non-material-costs", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_non_material_costs")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as NonMaterialCost[];
    },
    enabled: !!jobId,
  });

  const createCost = useMutation({
    mutationFn: async (cost: Omit<NonMaterialCost, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("job_non_material_costs")
        .insert([cost])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-non-material-costs"] });
    },
  });

  const updateCost = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NonMaterialCost> & { id: string }) => {
      const { data, error } = await supabase
        .from("job_non_material_costs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-non-material-costs"] });
    },
  });

  const deleteCost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("job_non_material_costs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-non-material-costs"] });
    },
  });

  return {
    costs,
    isLoading,
    createCost: createCost.mutate,
    createCostAsync: createCost.mutateAsync, // For async/await usage
    updateCost: updateCost.mutate,
    deleteCost: deleteCost.mutate,
  };
};
