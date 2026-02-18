import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CostPrediction {
  job_id: string;
  prediction_type: "cost_prediction";
  predicted_value: number;
  confidence_lower: number;
  confidence_upper: number;
  confidence_level: number;
  current_actual: number;
  budget: number;
  predicted_overrun: number;
  predicted_overrun_pct: number;
  sale_order_name?: string;
  model_version: string;
  generated_at: string;
}

export interface AnomalyScore {
  job_id: string;
  prediction_type: "anomaly_score";
  anomaly_score: number;
  is_anomaly: boolean;
  severity: "info" | "warning" | "critical";
  raw_score: number;
  contributing_factors: Array<{
    feature: string;
    value: number;
    mean: number;
    z_score: number;
    direction: "above" | "below";
  }>;
  sale_order_name: string;
  total_budget: number;
  total_actual: number;
}

export interface WasteRisk {
  job_id: string;
  prediction_type: "waste_risk";
  waste_probability: number;
  risk_level: "low" | "medium" | "high";
  severity: "info" | "warning" | "critical";
  feature_explanations: Array<{
    feature: string;
    shap_value?: number;
    importance?: number;
    feature_value: number;
    direction?: string;
  }>;
  recommendations: Array<{
    action: string;
    impact: string;
    description: string;
    expected_savings?: number;
  }>;
  sale_order_name: string;
  material_budget: number;
  material_actual: number;
}

export interface OverrunWarning {
  job_id: string;
  prediction_type: "overrun_warning";
  overrun_probability: number;
  risk_level: "low" | "medium" | "high";
  milestone: string;
  budget_utilization: number;
  budget: number;
  actual: number;
  recommendations: Array<{
    action: string;
    impact: string;
    description: string;
  }>;
  sale_order_name: string;
}

export interface MLInsights {
  cost_predictions: CostPrediction[];
  anomaly_scores: AnomalyScore[];
  waste_risks: WasteRisk[];
  overrun_warnings: OverrunWarning[];
  generated_at: string;
  total_insights: number;
  source?: "ml_service" | "cache" | "error";
  ml_service_error?: string;
}

async function fetchMLPrediction(predictionType: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("ml-predict", {
    body: { prediction_type: predictionType, ...params },
  });

  if (error) {
    console.warn(`ML prediction (${predictionType}) unavailable:`, error);
    return null;
  }

  return data;
}

export function useMLInsights(jobId?: string) {
  return useQuery({
    queryKey: ["ml-insights", jobId],
    queryFn: async (): Promise<MLInsights> => {
      const data = await fetchMLPrediction("insights", { job_id: jobId });
      if (!data) {
        return {
          cost_predictions: [],
          anomaly_scores: [],
          waste_risks: [],
          overrun_warnings: [],
          generated_at: new Date().toISOString(),
          total_insights: 0,
          source: "error",
        };
      }
      return {
        cost_predictions: Array.isArray(data.cost_predictions) ? data.cost_predictions : [],
        anomaly_scores: Array.isArray(data.anomaly_scores) ? data.anomaly_scores : [],
        waste_risks: Array.isArray(data.waste_risks) ? data.waste_risks : [],
        overrun_warnings: Array.isArray(data.overrun_warnings) ? data.overrun_warnings : [],
        generated_at: data.generated_at || new Date().toISOString(),
        total_insights: data.total_insights || 0,
        source: data.source,
        ml_service_error: data.ml_service_error,
      } as MLInsights;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useCostPrediction(jobId: string) {
  return useQuery({
    queryKey: ["ml-cost-prediction", jobId],
    queryFn: async (): Promise<CostPrediction | null> => {
      return fetchMLPrediction("cost", { job_id: jobId });
    },
    enabled: !!jobId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useAnomalyScore(jobId: string) {
  return useQuery({
    queryKey: ["ml-anomaly-score", jobId],
    queryFn: async (): Promise<AnomalyScore | null> => {
      return fetchMLPrediction("anomaly", { job_id: jobId });
    },
    enabled: !!jobId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useWasteRisk(jobId: string) {
  return useQuery({
    queryKey: ["ml-waste-risk", jobId],
    queryFn: async (): Promise<WasteRisk | null> => {
      return fetchMLPrediction("waste", { job_id: jobId });
    },
    enabled: !!jobId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useOverrunWarning(jobId: string) {
  return useQuery({
    queryKey: ["ml-overrun-warning", jobId],
    queryFn: async (): Promise<OverrunWarning | null> => {
      return fetchMLPrediction("overrun", { job_id: jobId });
    },
    enabled: !!jobId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useBatchMLPredictions() {
  const queryClient = useQueryClient();

  const refreshAll = useMutation({
    mutationFn: async () => {
      const [costs, anomalies, waste, overruns] = await Promise.allSettled([
        fetchMLPrediction("cost", { batch: true }),
        fetchMLPrediction("anomaly", { batch: true }),
        fetchMLPrediction("waste", { batch: true }),
        fetchMLPrediction("overrun", { batch: true }),
      ]);
      return {
        costs: costs.status === "fulfilled" ? costs.value : null,
        anomalies: anomalies.status === "fulfilled" ? anomalies.value : null,
        waste: waste.status === "fulfilled" ? waste.value : null,
        overruns: overruns.status === "fulfilled" ? overruns.value : null,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-insights"] });
      queryClient.invalidateQueries({ queryKey: ["ml-cost-prediction"] });
      queryClient.invalidateQueries({ queryKey: ["ml-anomaly-score"] });
      queryClient.invalidateQueries({ queryKey: ["ml-waste-risk"] });
      queryClient.invalidateQueries({ queryKey: ["ml-overrun-warning"] });
    },
  });

  return {
    refreshAll: refreshAll.mutate,
    isRefreshing: refreshAll.isPending,
  };
}

export function useMLTraining() {
  return useMutation({
    mutationFn: async (modelName?: string) => {
      const { data, error } = await supabase.functions.invoke("ml-predict", {
        body: { prediction_type: "train", model_name: modelName },
      });
      if (error) throw error;
      return data;
    },
  });
}

export interface MLSyncResult {
  success: boolean;
  results: {
    po_delivery?: { synced: number; total: number; error?: string };
    production?: { synced: number; total: number; error?: string };
    demand?: { synced: number; sale_orders?: number; error?: string };
    vendor_metrics?: { synced: number; vendors: number; error?: string };
    supplier_product_metrics?: { synced: number; total: number; error?: string };
    inventory?: { synced: number; total: number; error?: string };
    orderpoints?: { synced: number; total: number; error?: string };
  };
  error?: string;
}

export function useMLDataSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (syncType: string = "all"): Promise<MLSyncResult> => {
      const { data, error } = await supabase.functions.invoke("sync-ml-data", {
        body: { sync_type: syncType },
      });
      if (error) throw error;
      return data as MLSyncResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ml-supplier-scoring"] });
      queryClient.invalidateQueries({ queryKey: ["ml-supplier-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["ml-demand-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["ml-mrp-netting"] });
      queryClient.invalidateQueries({ queryKey: ["ml-reorder-rules"] });
      queryClient.invalidateQueries({ queryKey: ["ml-model-health"] });
    },
  });
}

export function useCachedMLPredictions(jobId: string) {
  return useQuery({
    queryKey: ["ml-cached-predictions", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ml_predictions")
        .select("*")
        .eq("job_id", jobId)
        .gt("expires_at", new Date().toISOString());

      if (error) {
        console.warn("Failed to fetch cached ML predictions:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000,
  });
}

export interface CustomerScore {
  prediction_type: "customer_reorder";
  customer_name: string;
  reorder_probability: number;
  total_jobs: number;
  total_revenue: number;
  recency_days: number;
  order_frequency_yearly: number;
  value_trend: number;
  segment: "high_value" | "medium_value" | "at_risk";
  generated_at: string;
}

export interface SupplierScore {
  prediction_type: "supplier_score";
  vendor_name: string;
  composite_score: number;
  delivery_score: number;
  reliability_score: number;
  pricing_score: number;
  volume_score: number;
  on_time_rate: number;
  avg_delay_days: number;
  total_orders: number;
  total_value: number;
  tier: "preferred" | "standard" | "review";
  generated_at: string;
}

export interface ModelHealthInfo {
  model_name: string;
  model_version: string;
  trained_at: string;
  training_samples: number;
  metrics: Record<string, any>;
  top_features: Array<{ name: string; importance: number }>;
  status: string;
}

export function useCustomerScoring() {
  return useQuery({
    queryKey: ["ml-customer-scoring"],
    queryFn: async (): Promise<CustomerScore[]> => {
      const data = await fetchMLPrediction("customers");
      return data?.customers || [];
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useSupplierScoring() {
  return useQuery({
    queryKey: ["ml-supplier-scoring"],
    queryFn: async (): Promise<SupplierScore[]> => {
      const data = await fetchMLPrediction("suppliers");
      return data?.vendors || [];
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

// ── Supply Chain Analytics Hooks ──────────────────────────────────────────

export interface SupplierDetail {
  vendor_name: string;
  product_count: number;
  total_spend: number;
  avg_on_time_rate: number;
  products: Array<{
    product_id: string;
    product_name: string;
    avg_lead_time: number;
    lead_time_stddev: number;
    on_time_rate: number;
    avg_delay_days: number;
    avg_unit_price: number;
    price_trend_pct: number;
    total_orders: number;
    total_qty: number;
    total_spend: number;
  }>;
  generated_at: string;
}

export interface LeadTimeDistribution {
  vendor_name: string;
  mean: number;
  std: number;
  median: number;
  min: number;
  max: number;
  p90: number;
  sample_count: number;
  histogram: Array<{ bin_start: number; bin_end: number; count: number }>;
}

export interface PriceTrend {
  vendor_name: string;
  data_points: Array<{ date: string; avg_price: number }>;
  overall_avg: number;
  trend_pct: number;
  months_of_data: number;
}

export interface SingleSourceRisk {
  product_id: string;
  product_name: string;
  sole_vendor: string;
  total_spend: number;
  risk_level: "high" | "medium";
}

export interface DemandAnalytics {
  prediction_type: string;
  product_id: string;
  product_name: string;
  method: string;
  granularity: string;
  forecast: Array<{ date: string; predicted_quantity: number; lower_bound: number; upper_bound: number }>;
  history: Array<{ date: string; quantity: number }>;
  total_forecasted: number;
  avg_historical: number;
  cv: number;
  high_variability: boolean;
  seasonality: { is_seasonal: boolean; period: number | null; strength: number };
  trend_direction: string;
  recommended_method: string;
  generated_at: string;
}

export interface MRPNettingResult {
  product_id: string;
  product_name: string;
  on_hand: number;
  safety_stock: number;
  weeks: Array<{
    week_start: string;
    gross_requirement: number;
    scheduled_receipts: number;
    projected_on_hand: number;
    net_requirement: number;
    planned_order_release: number;
  }>;
  generated_at: string;
}

export interface ReorderRule {
  product_id: string;
  product_name: string;
  warehouse_name: string;
  service_level: number;
  reorder_model: string;
  safety_stock: number;
  reorder_point: number;
  order_quantity: number;
  max_quantity: number;
  on_hand: number;
  odoo_min_qty: number;
  odoo_max_qty: number;
  min_qty_delta: number;
  max_qty_delta: number;
  is_discrepant: boolean;
  is_below_rop: boolean;
  urgency: "critical" | "warning" | "ok";
  demand_stats: { avg_daily: number; std_daily: number; annual: number; cv: number };
  lead_time_stats: { avg_days: number; std_days: number; primary_vendor: string };
}

export function useSupplierDetail(vendorName: string) {
  return useQuery({
    queryKey: ["ml-supplier-detail", vendorName],
    queryFn: async (): Promise<SupplierDetail | null> => {
      return fetchMLPrediction("supplier-detail", { vendor_name: vendorName });
    },
    enabled: !!vendorName,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useSupplierAnalytics() {
  return useQuery({
    queryKey: ["ml-supplier-analytics"],
    queryFn: async () => {
      const data = await fetchMLPrediction("supplier-analytics");
      return {
        leadTimeDistributions: (data?.lead_time_distributions || []) as LeadTimeDistribution[],
        priceTrends: (data?.price_trends || []) as PriceTrend[],
        singleSourceRisks: (data?.single_source_risks || []) as SingleSourceRisk[],
      };
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useDemandAnalytics() {
  return useQuery({
    queryKey: ["ml-demand-analytics"],
    queryFn: async (): Promise<DemandAnalytics[]> => {
      const data = await fetchMLPrediction("demand/analytics");
      return data?.forecasts || [];
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useMRPNetting() {
  return useQuery({
    queryKey: ["ml-mrp-netting"],
    queryFn: async (): Promise<MRPNettingResult[]> => {
      const data = await fetchMLPrediction("mrp-netting");
      return data?.products || [];
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useReorderRules(serviceLevel: number = 0.95) {
  return useQuery({
    queryKey: ["ml-reorder-rules", serviceLevel],
    queryFn: async (): Promise<ReorderRule[]> => {
      const data = await fetchMLPrediction("reorder-rules", { service_level: serviceLevel });
      return data?.rules || [];
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });
}

export function useModelHealth() {
  return useQuery({
    queryKey: ["ml-model-health"],
    queryFn: async (): Promise<ModelHealthInfo[]> => {
      const { data, error } = await supabase
        .from("ml_model_metadata")
        .select("*")
        .order("trained_at", { ascending: false });

      if (error) {
        console.warn("Failed to fetch model health:", error);
        return [];
      }

      const seen = new Set<string>();
      const latest: ModelHealthInfo[] = [];
      for (const row of data || []) {
        if (!seen.has(row.model_name)) {
          seen.add(row.model_name);
          latest.push({
            model_name: row.model_name,
            model_version: row.model_version || "",
            trained_at: row.trained_at,
            training_samples: row.training_samples || 0,
            metrics: row.metrics || {},
            top_features: row.top_features || [],
            status: row.status || "active",
          });
        }
      }
      return latest;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
