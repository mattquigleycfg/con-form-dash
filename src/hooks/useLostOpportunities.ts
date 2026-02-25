import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LostOppOrder {
  so_ref: string;
  customer: string;
  product_types: string[];
  state: string | null;
  revenue: number;
  cogs_labour: number;
  cogs_freight: number;
  cogs_product: number;
  total_cogs: number;
  gp: number;
  gp_pct: number;
  is_over_estimate: boolean;
  excess_value: number;
  match_method: string;
}

export interface TypeBreakdown {
  count: number;
  revenue: number;
  cogs: number;
  gp: number;
  labour: number;
  freight: number;
  product: number;
}

export interface StateBreakdown {
  count: number;
  revenue: number;
  cogs: number;
  gp: number;
}

export interface LostOppSummary {
  total_orders_analysed: number;
  total_revenue: number;
  total_cogs: number;
  overall_gp: number;
  orders_above_threshold: number;
  pct_above_threshold: number;
  total_excess_value: number;
  total_labour_cost: number;
  total_freight_cost: number;
  total_product_cost: number;
  gp_threshold: number;
  by_product_type: Record<string, TypeBreakdown>;
  by_state: Record<string, StateBreakdown>;
}

export interface LostOpportunitiesData {
  orders: LostOppOrder[];
  summary: LostOppSummary;
  generated_at: string;
  analytic_field_used: string;
}

async function fetchLostOpportunities(
  forceRefresh: boolean = false
): Promise<LostOpportunitiesData | null> {
  const predictionType = forceRefresh
    ? "lost-opportunities-refresh"
    : "lost-opportunities";

  const { data, error } = await supabase.functions.invoke("ml-predict", {
    body: { prediction_type: predictionType, force_refresh: forceRefresh },
  });

  if (error) {
    console.warn("Lost opportunities analysis unavailable:", error);
    return null;
  }

  if (!data || data.source === "error" || data.error || !data.summary) {
    console.warn(
      "Lost opportunities returned invalid data:",
      data?.error || data?.ml_service_error || "missing expected fields"
    );
    return null;
  }

  return data as LostOpportunitiesData;
}

export function useLostOpportunities() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lost-opportunities"],
    queryFn: () => fetchLostOpportunities(false),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const refresh = useMutation({
    mutationFn: () => fetchLostOpportunities(true),
    onSuccess: (data) => {
      queryClient.setQueryData(["lost-opportunities"], data);
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    refresh: refresh.mutate,
    isRefreshing: refresh.isPending,
  };
}
