import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface Insight {
  insight_type: 'variance' | 'anomaly' | 'prediction' | 'optimization' | 'waste' | 'comparison';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  data: any;
  recommendations: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const { job_id, analysis_type = 'all' } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Analyzing job insights for job_id: ${job_id || 'all'}, type: ${analysis_type}`);

    const insights: Insight[] = [];

    // Fetch jobs to analyze
    let jobsQuery = supabase.from('jobs').select('*');
    if (job_id) {
      jobsQuery = jobsQuery.eq('id', job_id);
    }
    
    const { data: jobs, error: jobsError } = await jobsQuery;
    
    if (jobsError) throw jobsError;
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ insights: [], message: 'No jobs found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze each job
    for (const job of jobs) {
      // 1. BUDGET VARIANCE ANALYSIS
      if (analysis_type === 'all' || analysis_type === 'budget_variance') {
        const variance = job.total_actual - job.total_budget;
        const variancePercent = job.total_budget > 0 
          ? (variance / job.total_budget) * 100 
          : 0;

        if (Math.abs(variancePercent) > 10) {
          const isOverBudget = variance > 0;
          insights.push({
            insight_type: 'variance',
            severity: Math.abs(variancePercent) > 25 ? 'critical' : 'warning',
            title: isOverBudget 
              ? `Job ${job.sale_order_name} is ${variancePercent.toFixed(1)}% over budget`
              : `Job ${job.sale_order_name} is ${Math.abs(variancePercent).toFixed(1)}% under budget`,
            description: isOverBudget
              ? `This job has exceeded its budget by $${Math.abs(variance).toFixed(2)}. Material costs are ${((job.material_actual - job.material_budget) / job.material_budget * 100).toFixed(1)}% ${job.material_actual > job.material_budget ? 'over' : 'under'}, and non-material costs are ${((job.non_material_actual - job.non_material_budget) / job.non_material_budget * 100).toFixed(1)}% ${job.non_material_actual > job.non_material_budget ? 'over' : 'under'}.`
              : `This job is coming in under budget by $${Math.abs(variance).toFixed(2)}, which is excellent progress.`,
            data: {
              job_id: job.id,
              variance,
              variance_percent: variancePercent,
              budget: job.total_budget,
              actual: job.total_actual,
              material_variance: job.material_actual - job.material_budget,
              non_material_variance: job.non_material_actual - job.non_material_budget,
            },
            recommendations: isOverBudget ? [
              {
                action: 'Review material costs',
                impact: 'High',
                description: 'Identify which materials are driving the overrun',
              },
              {
                action: 'Compare with similar jobs',
                impact: 'Medium',
                description: 'See how similar projects managed costs',
              },
              {
                action: 'Adjust remaining budget',
                impact: 'High',
                description: 'Revise budget expectations for better accuracy',
              },
            ] : [
              {
                action: 'Document cost savings',
                impact: 'Medium',
                description: 'Record what strategies led to under-budget performance',
              },
            ],
          });
        }
      }

      // 2. COST ANOMALY DETECTION
      if (analysis_type === 'all' || analysis_type === 'anomalies') {
        // Check for unusual variance spikes
        const materialVariancePercent = job.material_budget > 0
          ? ((job.material_actual - job.material_budget) / job.material_budget) * 100
          : 0;
        const nonMaterialVariancePercent = job.non_material_budget > 0
          ? ((job.non_material_actual - job.non_material_budget) / job.non_material_budget) * 100
          : 0;

        // Flag if one category is significantly more off than the other
        if (Math.abs(materialVariancePercent - nonMaterialVariancePercent) > 30) {
          const higherCategory = Math.abs(materialVariancePercent) > Math.abs(nonMaterialVariancePercent) ? 'Material' : 'Non-material';
          insights.push({
            insight_type: 'anomaly',
            severity: 'warning',
            title: `Uneven cost distribution detected in ${job.sale_order_name}`,
            description: `${higherCategory} costs are significantly more off-budget (${higherCategory === 'Material' ? materialVariancePercent.toFixed(1) : nonMaterialVariancePercent.toFixed(1)}%) compared to other categories. This suggests potential issues in ${higherCategory.toLowerCase()} estimation or unexpected costs.`,
            data: {
              job_id: job.id,
              material_variance_percent: materialVariancePercent,
              non_material_variance_percent: nonMaterialVariancePercent,
              discrepancy: Math.abs(materialVariancePercent - nonMaterialVariancePercent),
            },
            recommendations: [
              {
                action: `Review ${higherCategory.toLowerCase()} line items`,
                impact: 'High',
                description: `Drill down into specific ${higherCategory.toLowerCase()} costs to find the source`,
              },
              {
                action: 'Check for duplicate entries',
                impact: 'Medium',
                description: 'Verify no costs were accidentally entered twice',
              },
            ],
          });
        }
      }

      // 3. PREDICTIVE ANALYTICS
      if (analysis_type === 'all' || analysis_type === 'predictions') {
        // Simple prediction: assume costs will continue at current rate
        const budgetUsedPercent = job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0;
        
        if (budgetUsedPercent > 70 && budgetUsedPercent < 100) {
          const projectedFinal = job.total_actual * (100 / budgetUsedPercent);
          const projectedOverrun = projectedFinal - job.total_budget;
          const projectedOverrunPercent = (projectedOverrun / job.total_budget) * 100;

          if (projectedOverrunPercent > 5) {
            insights.push({
              insight_type: 'prediction',
              severity: projectedOverrunPercent > 15 ? 'critical' : 'warning',
              title: `${job.sale_order_name} projected to exceed budget`,
              description: `Based on current spending (${budgetUsedPercent.toFixed(1)}% of budget used), this job is projected to finish at $${projectedFinal.toFixed(2)}, which is ${projectedOverrunPercent.toFixed(1)}% over budget. Projected overrun: $${projectedOverrun.toFixed(2)}.`,
              data: {
                job_id: job.id,
                budget_used_percent: budgetUsedPercent,
                current_actual: job.total_actual,
                projected_final: projectedFinal,
                projected_overrun: projectedOverrun,
                projected_overrun_percent: projectedOverrunPercent,
              },
              recommendations: [
                {
                  action: 'Implement cost controls immediately',
                  impact: 'Critical',
                  description: 'Review and approve all remaining expenses',
                  expected_savings: projectedOverrun * 0.5,
                },
                {
                  action: 'Renegotiate remaining work',
                  impact: 'High',
                  description: 'See if vendors can reduce rates for remaining items',
                  expected_savings: projectedOverrun * 0.3,
                },
              ],
            });
          }
        }
      }

      // 4. MARGIN OPTIMIZATION
      if (analysis_type === 'all' || analysis_type === 'optimization') {
        const materialMargin = job.material_budget - job.material_actual;
        const materialMarginPercent = job.material_budget > 0 
          ? (materialMargin / job.material_budget) * 100 
          : 0;

        if (materialMarginPercent < 10 && job.material_budget > 1000) {
          insights.push({
            insight_type: 'optimization',
            severity: materialMarginPercent < 5 ? 'warning' : 'info',
            title: `Low material margin on ${job.sale_order_name}`,
            description: `Material margin is only ${materialMarginPercent.toFixed(1)}% ($${materialMargin.toFixed(2)}), which is below the healthy range of 15-25%. This limits profitability and buffer for unexpected costs.`,
            data: {
              job_id: job.id,
              material_margin: materialMargin,
              material_margin_percent: materialMarginPercent,
              material_budget: job.material_budget,
              material_actual: job.material_actual,
            },
            recommendations: [
              {
                action: 'Review supplier pricing',
                impact: 'High',
                description: 'Compare current supplier costs with alternatives',
                expected_savings: job.material_actual * 0.1,
              },
              {
                action: 'Optimize material quantities',
                impact: 'Medium',
                description: 'Reduce over-ordering and waste',
                expected_savings: job.material_actual * 0.05,
              },
              {
                action: 'Adjust future quotes',
                impact: 'High',
                description: 'Increase material budget by 15-20% on similar jobs',
              },
            ],
          });
        }
      }

      // 5. MATERIAL WASTE ANALYSIS
      if (analysis_type === 'all' || analysis_type === 'waste') {
        // Check if material actual is significantly higher than material budget
        const materialOverage = job.material_actual - job.material_budget;
        const materialOveragePercent = job.material_budget > 0
          ? (materialOverage / job.material_budget) * 100
          : 0;

        if (materialOveragePercent > 20) {
          insights.push({
            insight_type: 'waste',
            severity: materialOveragePercent > 35 ? 'critical' : 'warning',
            title: `Potential material waste on ${job.sale_order_name}`,
            description: `Material costs are ${materialOveragePercent.toFixed(1)}% over budget ($${materialOverage.toFixed(2)} excess), suggesting possible over-ordering, waste, or material cost increases. Review actual material consumption vs ordered quantities.`,
            data: {
              job_id: job.id,
              material_overage: materialOverage,
              material_overage_percent: materialOveragePercent,
              estimated_waste_cost: materialOverage * 0.3, // Assume 30% is actual waste
            },
            recommendations: [
              {
                action: 'Conduct material waste audit',
                impact: 'High',
                description: 'Review actual usage vs purchased quantities',
                expected_savings: materialOverage * 0.3,
              },
              {
                action: 'Implement just-in-time ordering',
                impact: 'Medium',
                description: 'Order materials as needed rather than up front',
                expected_savings: materialOverage * 0.2,
              },
              {
                action: 'Improve material estimation',
                impact: 'Medium',
                description: 'Use historical data to better estimate material needs',
              },
            ],
          });
        }
      }
    }

    // Store insights in database
    if (insights.length > 0) {
      const insightsToInsert = insights.map(insight => ({
        job_id: insight.data.job_id,
        insight_type: insight.insight_type,
        severity: insight.severity,
        title: insight.title,
        description: insight.description,
        data: insight.data,
        recommendations: insight.recommendations,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      }));

      // Delete old insights for these jobs first
      const jobIds = [...new Set(insights.map(i => i.data.job_id))];
      await supabase
        .from('ai_job_insights')
        .delete()
        .in('job_id', jobIds);

      // Insert new insights
      const { error: insertError } = await supabase
        .from('ai_job_insights')
        .insert(insightsToInsert);

      if (insertError) {
        console.error('Error inserting insights:', insertError);
      } else {
        console.log(`Stored ${insights.length} insights in database`);
      }
    }

    console.log(`Generated ${insights.length} insights`);

    return new Response(
      JSON.stringify({ 
        insights,
        count: insights.length,
        jobs_analyzed: jobs.length,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error analyzing job insights:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        insights: [],
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

