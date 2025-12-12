import { useState } from "react";
import { Megaphone, ThumbsUp, Linkedin, Facebook, Instagram, Globe, Users, DollarSign } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AICopilot } from "@/components/AICopilot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  KPICard,
  KPIGrid,
  KPISection,
  KPITable,
  DepartmentHeader,
  ManualEntryDialog,
  type KPITableColumn,
  type KPITableRow,
  type DatePeriod,
  type ManualEntryData,
} from "@/components/kpi";
import { useKPIData } from "@/hooks/useKPIData";
import { useManualKPIs } from "@/hooks/useManualKPIs";
import { getDateRange } from "@/utils/dateHelpers";

export default function MarketingKPIs() {
  const [period, setPeriod] = useState<DatePeriod>("month");
  const [editingMetric, setEditingMetric] = useState<{ key: string; label: string } | null>(null);
  
  const { metrics, isLoading } = useKPIData({ department: "marketing", period });
  const { start, end } = getDateRange(period);
  const { saveEntry, isSaving, getLatestEntry, refetch } = useManualKPIs("marketing", start, end);

  const handleSaveManual = async (data: ManualEntryData) => {
    await saveEntry({
      department: "marketing",
      metricKey: data.metricKey,
      value: data.value,
      target: data.target,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      notes: data.notes,
    });
    setEditingMetric(null);
  };

  const getMetric = (key: string) => metrics.find((m) => m.key === key);

  // Social media followers table
  const socialColumns: KPITableColumn[] = [
    { key: "week", label: "Week", align: "right" },
    { key: "month", label: "Month", align: "right" },
    { key: "ytd", label: "YTD", align: "right" },
  ];

  const socialRows: KPITableRow[] = [
    {
      id: "linkedin",
      label: "LinkedIn Followers",
      values: {
        week: getLatestEntry("linkedin_week")?.value ?? 0,
        month: getLatestEntry("linkedin_month")?.value ?? 0,
        ytd: getLatestEntry("linkedin_ytd")?.value ?? 0,
      },
      editable: true,
      status: "neutral",
    },
    {
      id: "facebook",
      label: "Facebook Followers",
      values: {
        week: getLatestEntry("facebook_week")?.value ?? 0,
        month: getLatestEntry("facebook_month")?.value ?? 0,
        ytd: getLatestEntry("facebook_ytd")?.value ?? 0,
      },
      editable: true,
      status: "neutral",
    },
    {
      id: "instagram",
      label: "Instagram Followers",
      values: {
        week: getLatestEntry("instagram_week")?.value ?? 0,
        month: getLatestEntry("instagram_month")?.value ?? 0,
        ytd: getLatestEntry("instagram_ytd")?.value ?? 0,
      },
      editable: true,
      status: "neutral",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <DepartmentHeader
          title="Marketing KPIs"
          description="Lead generation, brand awareness, and campaign metrics"
          icon={Megaphone}
          period={period}
          onPeriodChange={setPeriod}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
        />

        {/* Brand Section */}
        <KPISection title="Brand & Sentiment" description="Brand perception metrics">
          <KPIGrid columns={2}>
            <KPICard
              title="NPS Score"
              value={getMetric("nps_score")?.value ?? 0}
              status={getMetric("nps_score")?.status ?? "neutral"}
              source="manual"
              icon={ThumbsUp}
              footer={<p className="text-xs text-muted-foreground">Net Promoter Score (-100 to +100)</p>}
              onEdit={() => setEditingMetric({ key: "nps_score", label: "NPS Score" })}
            />
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Brand Health</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Track NPS, social sentiment, and brand mentions to monitor overall brand health.
                </p>
              </CardContent>
            </Card>
          </KPIGrid>
        </KPISection>

        {/* Social Media Section */}
        <KPISection title="Social Media Followers" description="Growth across social platforms">
          <KPIGrid columns={3}>
            <KPICard
              title="LinkedIn"
              value={getMetric("linkedin_followers")?.value ?? 0}
              status="neutral"
              source="manual"
              icon={Linkedin}
              onEdit={() => setEditingMetric({ key: "linkedin_followers", label: "LinkedIn Followers" })}
            />
            <KPICard
              title="Facebook"
              value={getMetric("facebook_followers")?.value ?? 0}
              status="neutral"
              source="manual"
              icon={Facebook}
              onEdit={() => setEditingMetric({ key: "facebook_followers", label: "Facebook Followers" })}
            />
            <KPICard
              title="Instagram"
              value={getMetric("instagram_followers")?.value ?? 0}
              status="neutral"
              source="manual"
              icon={Instagram}
              onEdit={() => setEditingMetric({ key: "instagram_followers", label: "Instagram Followers" })}
            />
          </KPIGrid>

          <KPITable
            title="Follower Growth"
            columns={socialColumns}
            rows={socialRows}
            onEdit={(rowId, columnKey, value) => {
              saveEntry({
                department: "marketing",
                metricKey: `${rowId}_${columnKey}`,
                value,
                periodStart: start,
                periodEnd: end,
              });
            }}
          />
        </KPISection>

        {/* Website Section */}
        <KPISection title="Website" description="Traffic and engagement metrics">
          <KPIGrid columns={2}>
            <KPICard
              title="Website Sessions (Week)"
              value={getMetric("website_sessions_week")?.value ?? 0}
              status="neutral"
              source="manual"
              icon={Globe}
              onEdit={() => setEditingMetric({ key: "website_sessions_week", label: "Website Sessions (Week)" })}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Google Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Connect Google Analytics API for automated session tracking. Currently using manual entry.
                </p>
              </CardContent>
            </Card>
          </KPIGrid>
        </KPISection>

        {/* Lead Generation Section */}
        <KPISection title="Lead Generation" description="Leads and pipeline metrics from CRM">
          <KPIGrid columns={4}>
            <KPICard
              title="Leads This Week"
              value={getMetric("leads_this_week")?.value ?? 0}
              status={getMetric("leads_this_week")?.status ?? "neutral"}
              source={getMetric("leads_this_week")?.source}
              icon={Users}
              onEdit={() => setEditingMetric({ key: "leads_this_week", label: "Leads This Week" })}
            />
            <KPICard
              title="Leads This Month"
              value={getMetric("leads_this_month")?.value ?? 0}
              status={getMetric("leads_this_month")?.status ?? "neutral"}
              source={getMetric("leads_this_month")?.source}
              icon={Users}
              onEdit={() => setEditingMetric({ key: "leads_this_month", label: "Leads This Month" })}
            />
            <KPICard
              title="Pipeline Value"
              value={getMetric("total_pipeline_value")?.value ?? 0}
              prefix="$"
              status={getMetric("total_pipeline_value")?.status ?? "neutral"}
              source={getMetric("total_pipeline_value")?.source}
              icon={DollarSign}
              onEdit={() => setEditingMetric({ key: "total_pipeline_value", label: "Total Pipeline Value" })}
            />
            <KPICard
              title="Cost Per Lead"
              value={getMetric("cost_per_lead")?.value ?? 0}
              prefix="$"
              status={getMetric("cost_per_lead")?.status ?? "neutral"}
              source="manual"
              icon={DollarSign}
              trendInverse
              onEdit={() => setEditingMetric({ key: "cost_per_lead", label: "Cost Per Lead" })}
            />
          </KPIGrid>
        </KPISection>
      </div>

      <ManualEntryDialog
        open={!!editingMetric}
        onOpenChange={(open) => !open && setEditingMetric(null)}
        metricKey={editingMetric?.key}
        metricLabel={editingMetric?.label}
        currentValue={editingMetric ? getMetric(editingMetric.key)?.value : undefined}
        onSave={handleSaveManual}
        isSaving={isSaving}
      />

      <AICopilot />
    </DashboardLayout>
  );
}
