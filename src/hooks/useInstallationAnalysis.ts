import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PerM2Rate {
  platforms: number;
  avg_install_units_per_plat: number;
  avg_install_cost_per_plat: number;
  avg_install_per_m2: number;
  avg_units_per_m2: number;
}

export interface StateBreakdown {
  order_count: number;
  total_qty: number;
  avg_qty: number;
  avg_price: number;
}

export interface ProductTypeStats {
  order_count: number;
  total_install_qty: number;
  total_install_revenue: number;
  avg_qty_per_order: number;
  avg_price_per_unit: number;
  avg_area_m2: number | null;
  by_state: Record<string, StateBreakdown>;
}

export interface SoPoRow {
  analytic_account_id: number | null;
  so_ref: string;
  customer: string;
  product_types: string[];
  state: string | null;
  platform_area_m2: number | null;
  so_qty: number;
  so_rate: number;
  so_revenue: number;
  po_refs: string[];
  vendors: string[];
  po_qty: number;
  po_rate: number;
  po_cost: number;
  overquote_ratio: number | null;
  overquote_days: number | null;
  margin: number;
  margin_pct: number | null;
  match_method?: string;
  lump_sum_inferred?: boolean;
}

export interface OverquoteSummary {
  total_matched_orders: number;
  avg_overquote_ratio: number | null;
  pct_overquoted: number | null;
  total_overquoted_days: number;
  avg_overquote_by_type: Record<string, number>;
  avg_overquote_by_state: Record<string, number>;
}

export interface VendorRow {
  vendor: string;
  po_count: number;
  total_units: number;
  total_cost: number;
  avg_rate: number;
  states_worked: string[];
}

export interface InstallationAnalysisData {
  per_m2_rates: Record<string, PerM2Rate>;
  by_product_type: Record<string, ProductTypeStats>;
  so_po_comparison: SoPoRow[];
  overquote_summary: OverquoteSummary;
  vendor_analysis: VendorRow[];
  generated_at: string;
  total_so_install_lines: number;
  total_po_install_lines: number;
  total_orders_analysed: number;
  total_matched_pairs: number;
  matched_by_analytic: number;
  matched_by_project_name: number;
  lump_sum_so_lines: number;
  lump_sum_po_lines: number;
  variant_prices_by_state: Record<string, number>;
  analytic_field_used: string;
}

async function fetchInstallationAnalysis(
  forceRefresh: boolean = false
): Promise<InstallationAnalysisData | null> {
  const predictionType = forceRefresh
    ? "installation-analysis-refresh"
    : "installation-analysis";

  const { data, error } = await supabase.functions.invoke("ml-predict", {
    body: { prediction_type: predictionType, force_refresh: forceRefresh },
  });

  if (error) {
    console.warn("Installation analysis unavailable:", error);
    return null;
  }

  if (!data || data.source === "error" || data.error || !data.per_m2_rates) {
    console.warn(
      "Installation analysis returned invalid data:",
      data?.error || data?.ml_service_error || "missing expected fields"
    );
    return null;
  }

  return data as InstallationAnalysisData;
}

export function useInstallationAnalysis() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["installation-analysis"],
    queryFn: () => fetchInstallationAnalysis(false),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const refresh = useMutation({
    mutationFn: () => fetchInstallationAnalysis(true),
    onSuccess: (data) => {
      queryClient.setQueryData(["installation-analysis"], data);
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
