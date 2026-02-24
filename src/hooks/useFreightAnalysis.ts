import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FreightSoPoRow {
  so_ref: string;
  customer: string;
  product_types: string[];
  state: string | null;
  so_freight: number;
  po_freight: number;
  gap: number;
  gap_pct: number | null;
  po_refs: string[];
  vendors: string[];
  match_method: string;
}

export interface FreightTypeBreakdown {
  so_total: number;
  po_total: number;
  gap: number;
  count: number;
}

export interface FreightSummary {
  total_so_freight_lines: number;
  total_po_freight_lines: number;
  total_so_freight_orders: number;
  total_matched_pairs: number;
  total_so_freight_value: number;
  total_po_freight_value: number;
  total_gap: number;
  avg_gap_pct: number | null;
  pct_overquoted: number | null;
  by_product_type: Record<string, FreightTypeBreakdown>;
  by_state: Record<string, FreightTypeBreakdown>;
}

export interface FreightVendorRow {
  vendor: string;
  po_count: number;
  total_cost: number;
  avg_cost: number;
  line_count: number;
}

export interface FreightAnalysisData {
  so_po_comparison: FreightSoPoRow[];
  summary: FreightSummary;
  vendor_analysis: FreightVendorRow[];
  generated_at: string;
  matched_by_analytic: number;
  matched_by_project_name: number;
  analytic_field_used: string;
}

async function fetchFreightAnalysis(
  forceRefresh: boolean = false
): Promise<FreightAnalysisData | null> {
  const predictionType = forceRefresh
    ? "freight-analysis-refresh"
    : "freight-analysis";

  const { data, error } = await supabase.functions.invoke("ml-predict", {
    body: { prediction_type: predictionType, force_refresh: forceRefresh },
  });

  if (error) {
    console.warn("Freight analysis unavailable:", error);
    return null;
  }

  if (!data || data.source === "error" || data.error || !data.summary) {
    console.warn(
      "Freight analysis returned invalid data:",
      data?.error || data?.ml_service_error || "missing expected fields"
    );
    return null;
  }

  return data as FreightAnalysisData;
}

export function useFreightAnalysis() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["freight-analysis"],
    queryFn: () => fetchFreightAnalysis(false),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const refresh = useMutation({
    mutationFn: () => fetchFreightAnalysis(true),
    onSuccess: (data) => {
      queryClient.setQueryData(["freight-analysis"], data);
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
