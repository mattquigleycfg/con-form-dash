import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InstallationDayRecord {
  id: string;
  sale_order_ref: string;
  sale_order_id: number | null;
  customer_name: string | null;
  product_type: string;
  state: string | null;
  platform_area_m2: number | null;
  quoted_days: number;
  actual_days: number;
  po_days: number | null;
  variance: number | null;
  overquote_ratio: number | null;
  vendor: string | null;
  notes: string | null;
  tracked_by: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type InstallationDayInsert = Omit<
  InstallationDayRecord,
  "id" | "user_id" | "created_at" | "updated_at"
>;

const QUERY_KEY = "installation-day-tracking";

export function useInstallationDayTracking() {
  const queryClient = useQueryClient();

  const { data: records, isLoading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("installation_day_tracking")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InstallationDayRecord[];
    },
  });

  const createRecord = useMutation({
    mutationFn: async (record: InstallationDayInsert) => {
      const { data, error } = await supabase
        .from("installation_day_tracking")
        .insert([record])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updateRecord = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<InstallationDayRecord> & { id: string }) => {
      const { data, error } = await supabase
        .from("installation_day_tracking")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const deleteRecord = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("installation_day_tracking")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  return {
    records,
    isLoading,
    createRecord: createRecord.mutate,
    createRecordAsync: createRecord.mutateAsync,
    updateRecord: updateRecord.mutate,
    deleteRecord: deleteRecord.mutate,
    isCreating: createRecord.isPending,
    isUpdating: updateRecord.isPending,
  };
}
