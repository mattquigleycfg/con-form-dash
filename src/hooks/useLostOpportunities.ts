import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LostLead {
  id: number;
  name: string;
  customer: string;
  salesperson: string;
  stage: string;
  lost_reason: string;
  revenue: number;
  date_lost: string;
  has_quote: boolean;
  quote_total: number;
  quote_labour: number;
  quote_freight: number;
  quote_product: number;
  labour_qty: number;
  margin_pct: number;
  quote_state: string | null;
  flags: string[];
}

export interface ReasonBreakdown {
  reason: string;
  count: number;
  value: number;
}

export interface StageBreakdown {
  stage: string;
  count: number;
  value: number;
}

export interface SalespersonBreakdown {
  salesperson: string;
  count: number;
  value: number;
}

export interface LostOppSummary {
  total_lost: number;
  total_value: number;
  avg_deal_size: number;
  with_quotes: number;
  flagged_overinflated: number;
  top_reason: string;
  top_reason_count: number;
  gp_threshold: number;
}

export interface FilterOptions {
  salespersons: string[];
  reasons: string[];
  stages: string[];
}

export interface LostOpportunitiesData {
  leads: LostLead[];
  summary: LostOppSummary;
  by_reason: ReasonBreakdown[];
  by_stage: StageBreakdown[];
  by_salesperson: SalespersonBreakdown[];
  filter_options: FilterOptions;
  generated_at: string;
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
