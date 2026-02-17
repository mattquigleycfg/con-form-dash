import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useMLTraining, useModelHealth } from "@/hooks/useMLPredictions";
import { useToast } from "@/hooks/use-toast";

const MODEL_DISPLAY: Record<string, { label: string; metric: string }> = {
  cost_predictor: { label: "Cost Predictor", metric: "MAE" },
  anomaly_detector: { label: "Anomaly Detector", metric: "Contamination" },
  waste_scorer: { label: "Waste Scorer", metric: "F1 Score" },
  overrun_classifier: { label: "Overrun Classifier", metric: "AUC" },
  lead_time_predictor: { label: "Lead Time", metric: "MAE" },
  demand_forecaster: { label: "Demand Forecast", metric: "Status" },
  customer_scorer: { label: "Customer Scorer", metric: "Active Rate" },
  supplier_scorer: { label: "Supplier Scorer", metric: "Vendors" },
};

function getMetricValue(model: any): string {
  const m = model.metrics || {};
  switch (model.model_name) {
    case "cost_predictor": return m.mae ? `$${Number(m.mae).toLocaleString()}` : "N/A";
    case "anomaly_detector": return m.contamination_rate ? `${(m.contamination_rate * 100).toFixed(1)}%` : "N/A";
    case "waste_scorer": return m.f1_score !== undefined ? m.f1_score.toFixed(3) : "N/A";
    case "overrun_classifier": return m.auc_score !== undefined ? m.auc_score.toFixed(3) : "N/A";
    case "customer_scorer": return m.active_customer_rate != null ? `${(m.active_customer_rate * 100).toFixed(0)}%` : "N/A";
    case "supplier_scorer": return m.vendors_scored !== undefined ? String(m.vendors_scored) : "N/A";
    default: return "N/A";
  }
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ModelHealthPanel() {
  const { data: models = [], isLoading } = useModelHealth();
  const training = useMLTraining();
  const { toast } = useToast();

  const handleRetrain = () => {
    training.mutate(undefined, {
      onSuccess: (data) => {
        if (data?.error) {
          toast({ title: "Training Issue", description: data.error, variant: "destructive" });
        } else {
          toast({ title: "Training Complete", description: "All models have been retrained." });
        }
      },
      onError: (e) => {
        const msg = String(e);
        if (msg.includes("non-2xx") || msg.includes("FunctionsHttpError")) {
          toast({
            title: "Training Failed",
            description: "The ML service is unreachable. Ensure the ML service is running and ML_SERVICE_URL is configured in your Supabase Edge Function secrets.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Training Failed", description: msg, variant: "destructive" });
        }
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Model Health</CardTitle>
        <Button size="sm" variant="outline" onClick={handleRetrain} disabled={training.isPending} className="h-7 text-xs">
          <RefreshCw className={`h-3 w-3 mr-1 ${training.isPending ? "animate-spin" : ""}`} />
          {training.isPending ? "Training..." : "Retrain All"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : models.length === 0 ? (
          <div className="text-muted-foreground text-sm">No models trained yet</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {models.map((m) => {
              const display = MODEL_DISPLAY[m.model_name] || { label: m.model_name, metric: "Metric" };
              return (
                <div key={m.model_name} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{display.label}</span>
                    <Badge variant={m.status === "active" ? "default" : "secondary"} className="text-[10px] h-4">
                      {m.status}
                    </Badge>
                  </div>
                  <div className="text-lg font-bold">{getMetricValue(m)}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {display.metric} | {m.training_samples} samples | {timeSince(m.trained_at)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
