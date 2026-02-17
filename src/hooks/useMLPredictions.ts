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
