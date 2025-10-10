import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Target {
  id: string;
  name: string;
  metric: string;
  period: string;
  target_value: number;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useTargets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ["targets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_targets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Target[];
    },
  });

  const createTarget = useMutation({
    mutationFn: async (target: Omit<Target, "id" | "created_at" | "updated_at" | "user_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("sales_targets")
        .insert([{ ...target, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      toast({
        title: "Target created",
        description: "Your target has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTarget = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Target> & { id: string }) => {
      const { data, error } = await supabase
        .from("sales_targets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      toast({
        title: "Target updated",
        description: "Your target has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTarget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sales_targets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets"] });
      toast({
        title: "Target deleted",
        description: "Your target has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    targets,
    isLoading,
    createTarget: createTarget.mutate,
    updateTarget: updateTarget.mutate,
    deleteTarget: deleteTarget.mutate,
  };
}
