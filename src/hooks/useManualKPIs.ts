import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Department } from "@/utils/helpdeskTeamMapping";

export interface KPIEntry {
  id: string;
  user_id: string;
  department: string;
  metric_key: string;
  value: number;
  target: number | null;
  period_start: string;
  period_end: string;
  source: "manual" | "odoo" | "calculated";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface KPITarget {
  id: string;
  department: string;
  metric_key: string;
  target_value: number;
  green_threshold: number | null;
  amber_threshold: number | null;
  period_type: "week" | "month" | "quarter" | "year";
  comparison_type: "higher_better" | "lower_better";
  valid_from: string;
  valid_to: string | null;
}

export interface SaveKPIEntryParams {
  department: Department;
  metricKey: string;
  value: number;
  target?: number;
  periodStart: Date;
  periodEnd: Date;
  notes?: string;
}

export function useManualKPIs(department?: Department, periodStart?: Date, periodEnd?: Date) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch manual KPI entries
  const {
    data: entries = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["kpi-entries", department, periodStart?.toISOString(), periodEnd?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("kpi_entries")
        .select("*")
        .order("updated_at", { ascending: false });

      if (department) {
        query = query.eq("department", department);
      }

      if (periodStart) {
        query = query.gte("period_start", periodStart.toISOString().split("T")[0]);
      }

      if (periodEnd) {
        query = query.lte("period_end", periodEnd.toISOString().split("T")[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as KPIEntry[];
    },
    enabled: !!user,
  });

  // Save KPI entry mutation
  const saveMutation = useMutation({
    mutationFn: async (params: SaveKPIEntryParams) => {
      if (!user) throw new Error("Must be logged in");

      const entryData = {
        user_id: user.id,
        department: params.department,
        metric_key: params.metricKey,
        value: params.value,
        target: params.target ?? null,
        period_start: params.periodStart.toISOString().split("T")[0],
        period_end: params.periodEnd.toISOString().split("T")[0],
        source: "manual" as const,
        notes: params.notes ?? null,
      };

      // Use upsert to handle both insert and update
      const { data, error } = await supabase
        .from("kpi_entries")
        .upsert(entryData, {
          onConflict: "user_id,department,metric_key,period_start,period_end",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-entries"] });
      toast({
        title: "Saved",
        description: "KPI value has been saved successfully.",
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

  // Delete KPI entry mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kpi_entries").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-entries"] });
      toast({
        title: "Deleted",
        description: "KPI entry has been removed.",
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

  // Get entry for a specific metric
  const getEntry = (metricKey: string, periodStart: Date, periodEnd: Date): KPIEntry | undefined => {
    return entries.find(
      (e) =>
        e.metric_key === metricKey &&
        e.period_start === periodStart.toISOString().split("T")[0] &&
        e.period_end === periodEnd.toISOString().split("T")[0]
    );
  };

  // Get latest entry for a metric (regardless of period)
  const getLatestEntry = (metricKey: string): KPIEntry | undefined => {
    return entries
      .filter((e) => e.metric_key === metricKey)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
  };

  return {
    entries,
    isLoading,
    error,
    refetch,
    saveEntry: saveMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    getEntry,
    getLatestEntry,
  };
}

// Hook to fetch KPI targets
export function useKPITargets(department?: Department) {
  return useQuery({
    queryKey: ["kpi-targets", department],
    queryFn: async () => {
      let query = supabase
        .from("kpi_targets")
        .select("*")
        .order("metric_key");

      if (department) {
        query = query.eq("department", department);
      }

      // Only get currently valid targets
      const now = new Date().toISOString().split("T")[0];
      query = query.lte("valid_from", now);
      query = query.or(`valid_to.is.null,valid_to.gte.${now}`);

      const { data, error } = await query;

      if (error) throw error;
      return data as KPITarget[];
    },
  });
}

// Get target for a specific metric
export function useKPITarget(department: Department, metricKey: string) {
  const { data: targets = [] } = useKPITargets(department);
  return targets.find((t) => t.metric_key === metricKey);
}

