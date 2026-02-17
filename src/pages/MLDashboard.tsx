import { useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SafeSection } from "@/components/SafeSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ShieldAlert, Trash2, Target } from "lucide-react";
import { useJobs, type Job } from "@/hooks/useJobs";
import { BrainIcon } from "@/components/ui/animated-icons";
import { SparklesIcon } from "@/components/ui/animated-icons";
import { ActivityIcon } from "@/components/ui/animated-icons";
import { RocketIcon } from "@/components/ui/animated-icons";
import {
  useMLInsights,
  useCustomerScoring,
  useSupplierScoring,
  useModelHealth,
} from "@/hooks/useMLPredictions";
import {
  RiskHeatmapChart,
  PredictionAccuracyChart,
  FeatureImportanceChart,
  CustomerScoringTable,
  SupplierScoringTable,
  ModelHealthPanel,
} from "@/components/ml";

function RiskKPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  color: "red" | "amber" | "emerald" | "blue";
}) {
  const colors = {
    red: "border-red-200 bg-red-50 dark:bg-red-950/20",
    amber: "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
    emerald: "border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20",
    blue: "border-blue-200 bg-blue-50 dark:bg-blue-950/20",
  };
  const iconColors = {
    red: "text-red-500",
    amber: "text-amber-500",
    emerald: "text-emerald-500",
    blue: "text-blue-500",
  };

  return (
    <Card className={`${colors[color]} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
          </div>
          <Icon className={`h-8 w-8 ${iconColors[color]} opacity-80`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function MLDashboard() {
  const { data: insights, isLoading: insightsLoading } = useMLInsights();
  const { data: customers = [], isLoading: customersLoading } = useCustomerScoring();
  const { data: suppliers = [], isLoading: suppliersLoading } = useSupplierScoring();
  const { data: models = [], isLoading: modelsLoading } = useModelHealth();
  const { data: jobs = [] } = useJobs();

  const jobLookup = useMemo(() => {
    const map = new Map<string, Job>();
    jobs.forEach(j => map.set(j.id, j));
    return map;
  }, [jobs]);

  const overrunCount = insights?.overrun_warnings?.filter((o) => o.risk_level === "high" || o.risk_level === "medium").length ?? 0;
  const anomalyCount = insights?.anomaly_scores?.filter((a) => a.is_anomaly).length ?? 0;
  const wasteCount = insights?.waste_risks?.filter((w) => w.risk_level === "high" || w.risk_level === "medium").length ?? 0;
  const totalInsights = insights?.total_insights ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrainIcon size={24} className="p-1" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">ML Intelligence</h1>
              <p className="text-sm text-muted-foreground">
                Machine learning insights across {totalInsights} predictions
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <SparklesIcon size={12} className="p-0 mr-1" />
            Beta
          </Badge>
        </div>

        {/* Risk Overview KPI Strip */}
        {insightsLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[90px]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <RiskKPICard
              title="Overrun Risk"
              value={overrunCount}
              subtitle="jobs at medium/high risk"
              icon={AlertTriangle}
              color={overrunCount > 10 ? "red" : overrunCount > 0 ? "amber" : "emerald"}
            />
            <RiskKPICard
              title="Anomalies"
              value={anomalyCount}
              subtitle="anomalous cost patterns"
              icon={ShieldAlert}
              color={anomalyCount > 5 ? "red" : anomalyCount > 0 ? "amber" : "emerald"}
            />
            <RiskKPICard
              title="Waste Risk"
              value={wasteCount}
              subtitle="high material waste risk"
              icon={Trash2}
              color={wasteCount > 5 ? "red" : wasteCount > 0 ? "amber" : "emerald"}
            />
            <RiskKPICard
              title="Total Insights"
              value={totalInsights}
              subtitle="ML predictions generated"
              icon={Target}
              color="blue"
            />
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="risk" className="space-y-4">
          <TabsList>
            <TabsTrigger value="risk" className="text-xs">Risk Analysis</TabsTrigger>
            <TabsTrigger value="predictions" className="text-xs">Predictions</TabsTrigger>
            <TabsTrigger value="customers" className="text-xs">Customers</TabsTrigger>
            <TabsTrigger value="suppliers" className="text-xs">Suppliers</TabsTrigger>
            <TabsTrigger value="models" className="text-xs">
              <ActivityIcon size={12} className="p-0 mr-1 inline-flex" />
              Model Health
            </TabsTrigger>
          </TabsList>

          {/* Risk Analysis Tab */}
          <TabsContent value="risk" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <SafeSection name="Risk Heatmap"><RiskHeatmapChart data={insights?.overrun_warnings || []} jobLookup={jobLookup} /></SafeSection>
              <SafeSection name="Feature Importance"><FeatureImportanceChart models={models} modelName="overrun_classifier" /></SafeSection>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <SafeSection name="Prediction Accuracy"><PredictionAccuracyChart data={insights?.cost_predictions || []} jobLookup={jobLookup} /></SafeSection>
            <div className="grid gap-4 lg:grid-cols-2">
              <SafeSection name="Cost Features"><FeatureImportanceChart models={models} modelName="cost_predictor" /></SafeSection>
              <SafeSection name="Waste Features"><FeatureImportanceChart models={models} modelName="waste_scorer" /></SafeSection>
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4">
            {customersLoading ? (
              <Skeleton className="h-[400px]" />
            ) : customers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <RocketIcon size={48} className="p-2 mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No Customer Data Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Customer scoring requires historical job data. Train the models from the Model Health tab to generate customer re-order predictions.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <CustomerScoringTable data={customers} />
            )}
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-4">
            {suppliersLoading ? (
              <Skeleton className="h-[400px]" />
            ) : suppliers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <RocketIcon size={48} className="p-2 mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No Supplier Data Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Supplier scoring requires PO delivery history. Run the data sync from Odoo to populate vendor metrics.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <SupplierScoringTable data={suppliers} />
            )}
          </TabsContent>

          {/* Model Health Tab */}
          <TabsContent value="models" className="space-y-4">
            {modelsLoading ? (
              <Skeleton className="h-[200px]" />
            ) : (
              <ModelHealthPanel />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
