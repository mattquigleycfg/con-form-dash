import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BOMLine {
  id: string;
  job_id: string;
  odoo_product_id?: number;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const useJobBOM = (jobId?: string) => {
  const queryClient = useQueryClient();

  const { data: bomLines, isLoading } = useQuery({
    queryKey: ["job-bom", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_bom_lines")
        .select("*")
        .eq("job_id", jobId!)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as BOMLine[];
    },
    enabled: !!jobId,
  });

  const createBOMLine = useMutation({
    mutationFn: async (line: Omit<BOMLine, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("job_bom_lines")
        .insert([line])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-bom"] });
    },
  });

  const updateBOMLine = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BOMLine> & { id: string }) => {
      const { data, error } = await supabase
        .from("job_bom_lines")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-bom"] });
    },
  });

  const deleteBOMLine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("job_bom_lines")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-bom"] });
    },
  });

  const importBOMFromCSV = useMutation({
    mutationFn: async ({ jobId, lines }: { jobId: string; lines: Omit<BOMLine, "id" | "job_id" | "created_at" | "updated_at">[] }) => {
      const { data, error } = await supabase
        .from("job_bom_lines")
        .insert(lines.map(line => ({ ...line, job_id: jobId })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-bom"] });
    },
  });

  return {
    bomLines,
    isLoading,
    createBOMLine: createBOMLine.mutate,
    updateBOMLine: updateBOMLine.mutate,
    deleteBOMLine: deleteBOMLine.mutate,
    importBOMFromCSV: importBOMFromCSV.mutate,
  };
};
