import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SafeSection } from "@/components/SafeSection";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ShieldAlert, Trash2, Target, RefreshCw, CheckCircle2, XCircle, Download } from "lucide-react";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { formatCurrency } from "@/lib/utils";
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
  useMLDataSync,
  type MLSyncResult,
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
  const { data: suppliers = [], isLoading: suppliersLoading, refetch: refetchSuppliers } = useSupplierScoring();
  const { data: models = [], isLoading: modelsLoading } = useModelHealth();
  const { jobs: jobsList } = useJobs();
  const jobs = jobsList ?? [];

  const dataSync = useMLDataSync();
  const [syncResult, setSyncResult] = useState<MLSyncResult | null>(null);

  const handleSyncSuppliers = () => {
    setSyncResult(null);
    dataSync.mutate("po_delivery", {
      onSuccess: async (result) => {
        setSyncResult(result);
        // After PO sync, aggregate vendor metrics
        dataSync.mutate("vendor_metrics", {
          onSuccess: (metricsResult) => {
            setSyncResult(prev => prev ? {
              ...prev,
              results: { ...prev.results, vendor_metrics: metricsResult.results.vendor_metrics }
            } : metricsResult);
            refetchSuppliers();
          },
        });
      },
    });
  };

  // Multi-key lookup: by Supabase UUID, sale_order_name, and odoo_sale_order_id
  const jobLookup = useMemo(() => {
    const map = new Map<string, Job>();
    jobs.forEach(j => {
      map.set(j.id, j);
      if (j.sale_order_name) map.set(j.sale_order_name, j);
      if (j.odoo_sale_order_id) map.set(String(j.odoo_sale_order_id), j);
    });
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

        {/* Risk Overview KPI Strip with Hover Cards */}
        {insightsLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[90px]" />
            ))}
          </div>
        ) : (() => {
          const resolveJob = (jobId: string, soName?: string) => {
            const j = jobLookup.get(jobId) || (soName ? jobLookup.get(soName) : undefined);
            return j?.sale_order_name || soName || "Unknown";
          };
          const overrunJobs = (insights?.overrun_warnings || []).filter(o => o.risk_level === "high" || o.risk_level === "medium");
          const anomalyJobs = (insights?.anomaly_scores || []).filter(a => a.is_anomaly);
          const wasteJobs = (insights?.waste_risks || []).filter(w => w.risk_level === "high" || w.risk_level === "medium");

          return (
            <div className="grid gap-4 md:grid-cols-4">
              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div>
                    <RiskKPICard title="Overrun Risk" value={overrunCount} subtitle="jobs at medium/high risk" icon={AlertTriangle} color={overrunCount > 10 ? "red" : overrunCount > 0 ? "amber" : "emerald"} />
                  </div>
                </HoverCardTrigger>
                {overrunJobs.length > 0 && (
                  <HoverCardContent side="bottom" className="w-80">
                    <p className="font-semibold text-sm mb-2">Overrun Risk Jobs</p>
                    <ul className="space-y-1.5">
                      {overrunJobs.slice(0, 6).map((o, i) => {
                        const job = jobLookup.get(o.job_id) || (o.sale_order_name ? jobLookup.get(o.sale_order_name) : undefined);
                        return (
                          <li key={i} className="flex justify-between text-xs gap-2">
                            <span className="truncate">{resolveJob(o.job_id, o.sale_order_name)}{job?.customer_name ? ` — ${job.customer_name}` : ""}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant={o.risk_level === "high" ? "destructive" : "default"} className="text-[10px] px-1 py-0">{o.risk_level}</Badge>
                              <span className="text-muted-foreground">{Math.round(o.overrun_probability * 100)}%</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {overrunJobs.length > 6 && <p className="text-[10px] text-muted-foreground mt-1">+{overrunJobs.length - 6} more...</p>}
                  </HoverCardContent>
                )}
              </HoverCard>

              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div>
                    <RiskKPICard title="Anomalies" value={anomalyCount} subtitle="anomalous cost patterns" icon={ShieldAlert} color={anomalyCount > 5 ? "red" : anomalyCount > 0 ? "amber" : "emerald"} />
                  </div>
                </HoverCardTrigger>
                {anomalyJobs.length > 0 && (
                  <HoverCardContent side="bottom" className="w-80">
                    <p className="font-semibold text-sm mb-2">Anomalous Jobs</p>
                    <ul className="space-y-1.5">
                      {anomalyJobs.slice(0, 6).map((a, i) => {
                        const job = jobLookup.get(a.job_id) || (a.sale_order_name ? jobLookup.get(a.sale_order_name) : undefined);
                        return (
                          <li key={i} className="flex justify-between text-xs gap-2">
                            <span className="truncate">{resolveJob(a.job_id, a.sale_order_name)}{job?.customer_name ? ` — ${job.customer_name}` : ""}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant={a.severity === "critical" ? "destructive" : "default"} className="text-[10px] px-1 py-0">{a.severity}</Badge>
                              <span className="text-muted-foreground">{Math.round(a.anomaly_score * 100)}%</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {anomalyJobs.length > 6 && <p className="text-[10px] text-muted-foreground mt-1">+{anomalyJobs.length - 6} more...</p>}
                  </HoverCardContent>
                )}
              </HoverCard>

              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div>
                    <RiskKPICard title="Waste Risk" value={wasteCount} subtitle="high material waste risk" icon={Trash2} color={wasteCount > 5 ? "red" : wasteCount > 0 ? "amber" : "emerald"} />
                  </div>
                </HoverCardTrigger>
                {wasteJobs.length > 0 && (
                  <HoverCardContent side="bottom" className="w-80">
                    <p className="font-semibold text-sm mb-2">Waste Risk Jobs</p>
                    <ul className="space-y-1.5">
                      {wasteJobs.slice(0, 6).map((w, i) => {
                        const job = jobLookup.get(w.job_id) || (w.sale_order_name ? jobLookup.get(w.sale_order_name) : undefined);
                        return (
                          <li key={i} className="flex justify-between text-xs gap-2">
                            <span className="truncate">{resolveJob(w.job_id, w.sale_order_name)}{job?.customer_name ? ` — ${job.customer_name}` : ""}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant={w.risk_level === "high" ? "destructive" : "default"} className="text-[10px] px-1 py-0">{w.risk_level}</Badge>
                              <span className="text-muted-foreground">{Math.round(w.waste_probability * 100)}%</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {wasteJobs.length > 6 && <p className="text-[10px] text-muted-foreground mt-1">+{wasteJobs.length - 6} more...</p>}
                  </HoverCardContent>
                )}
              </HoverCard>

              <HoverCard openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <div>
                    <RiskKPICard title="Total Insights" value={totalInsights} subtitle="ML predictions generated" icon={Target} color="blue" />
                  </div>
                </HoverCardTrigger>
                <HoverCardContent side="bottom" className="w-72">
                  <p className="font-semibold text-sm mb-2">Prediction Breakdown</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Cost Predictions</span><span className="font-medium">{insights?.cost_predictions?.length ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Anomaly Scores</span><span className="font-medium">{insights?.anomaly_scores?.length ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Overrun Warnings</span><span className="font-medium">{insights?.overrun_warnings?.length ?? 0}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Waste Risks</span><span className="font-medium">{insights?.waste_risks?.length ?? 0}</span></div>
                  </div>
                  {insights?.generated_at && (
                    <p className="text-[10px] text-muted-foreground mt-2 pt-1 border-t">Generated: {new Date(insights.generated_at).toLocaleString()}</p>
                  )}
                </HoverCardContent>
              </HoverCard>
            </div>
          );
        })()}

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
              <SafeSection name="Feature Importance"><FeatureImportanceChart models={models} modelName="overrun_classifier" jobs={jobs} /></SafeSection>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-4">
            <SafeSection name="Prediction Accuracy"><PredictionAccuracyChart data={insights?.cost_predictions || []} jobLookup={jobLookup} /></SafeSection>
            <div className="grid gap-4 lg:grid-cols-2">
              <SafeSection name="Cost Features"><FeatureImportanceChart models={models} modelName="cost_predictor" jobs={jobs} /></SafeSection>
              <SafeSection name="Waste Features"><FeatureImportanceChart models={models} modelName="waste_scorer" jobs={jobs} /></SafeSection>
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
            {/* Sync Controls */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">Odoo PO Data Sync</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Sync purchase order delivery history from Odoo to generate supplier scores
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSyncSuppliers}
                    disabled={dataSync.isPending}
                  >
                    {dataSync.isPending ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Sync from Odoo
                      </>
                    )}
                  </Button>
                </div>

                {/* Sync Result Feedback */}
                {syncResult && (
                  <div className="mt-3 pt-3 border-t space-y-1.5">
                    {syncResult.results.po_delivery && !syncResult.results.po_delivery.error && (
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        <span>
                          Synced <strong>{syncResult.results.po_delivery.synced}</strong> of{" "}
                          {syncResult.results.po_delivery.total} purchase orders
                        </span>
                      </div>
                    )}
                    {syncResult.results.vendor_metrics && !syncResult.results.vendor_metrics.error && (
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        <span>
                          Aggregated metrics for <strong>{syncResult.results.vendor_metrics.vendors}</strong> vendors
                        </span>
                      </div>
                    )}
                    {syncResult.results.po_delivery?.error && (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <XCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>PO sync error: {syncResult.results.po_delivery.error}</span>
                      </div>
                    )}
                  </div>
                )}

                {dataSync.error && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-xs text-destructive">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{String(dataSync.error)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supplier Table or Empty State */}
            {suppliersLoading ? (
              <Skeleton className="h-[400px]" />
            ) : suppliers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <RocketIcon size={48} className="p-2 mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No Supplier Scores Yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md">
                    Click "Sync from Odoo" above to import PO delivery history, then the ML model will score your vendors based on delivery performance, reliability, and volume.
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
