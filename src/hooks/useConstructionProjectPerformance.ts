import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDateRange, type DatePeriod } from "@/utils/dateHelpers";

export interface ProjectPerformanceMetrics {
  difotRate: number; // % of projects delivered on time
  closedWithinBudget: number; // $ value of projects closed under budget
  closedOverBudget: number; // $ value of projects closed over budget
  totalClosedProjects: number;
  onTimeProjects: number;
  lateProjects: number;
  avgBudgetVariance: number; // Average % over/under budget
}

interface Job {
  id: string;
  sale_order_name: string;
  customer_name: string;
  total_budget: number;
  total_actual: number;
  status: string;
  created_at: string;
  updated_at: string;
  project_stage_name?: string | null;
  date_order?: string;
}

/**
 * Fetches jobs from the local database (job costing module)
 */
async function fetchJobs(period: DatePeriod): Promise<Job[]> {
  const { start, end } = getDateRange(period);

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .gte("updated_at", start.toISOString())
    .lte("updated_at", end.toISOString())
    .order("updated_at", { ascending: false });

  if (error) throw error;
  
  console.log(`📦 Jobs fetched: ${data?.length || 0} for period`);
  return data as Job[];
}

/**
 * Determines if a project is "closed" based on status or stage
 */
function isProjectClosed(job: Job): boolean {
  const closedStatuses = ["complete", "closed", "done", "delivered"];
  const closedStages = ["complete", "closed", "done", "delivered"];

  const statusMatch = closedStatuses.some((status) =>
    job.status?.toLowerCase().includes(status)
  );
  const stageMatch = closedStages.some((stage) =>
    job.project_stage_name?.toLowerCase().includes(stage)
  );

  return statusMatch || stageMatch;
}

/**
 * Calculates DIFOT (Delivered In Full On Time) rate
 * For now, we'll use budget variance as a proxy for "on time"
 * Projects under budget are likely delivered efficiently/on time
 */
function calculateDIFOT(jobs: Job[]): {
  difotRate: number;
  onTimeProjects: number;
  lateProjects: number;
} {
  const closedJobs = jobs.filter(isProjectClosed);

  if (closedJobs.length === 0) {
    return { difotRate: 0, onTimeProjects: 0, lateProjects: 0 };
  }

  // Projects that are under or at budget are considered "on time"
  const onTimeProjects = closedJobs.filter(
    (job) => job.total_actual <= job.total_budget
  ).length;
  const lateProjects = closedJobs.length - onTimeProjects;

  const difotRate = (onTimeProjects / closedJobs.length) * 100;

  return {
    difotRate: Math.round(difotRate * 10) / 10,
    onTimeProjects,
    lateProjects,
  };
}

/**
 * Calculates budget performance metrics
 */
function calculateBudgetPerformance(jobs: Job[]): {
  closedWithinBudget: number;
  closedOverBudget: number;
  avgBudgetVariance: number;
} {
  const closedJobs = jobs.filter(isProjectClosed);

  if (closedJobs.length === 0) {
    return {
      closedWithinBudget: 0,
      closedOverBudget: 0,
      avgBudgetVariance: 0,
    };
  }

  let closedWithinBudget = 0;
  let closedOverBudget = 0;
  let totalVariance = 0;

  closedJobs.forEach((job) => {
    const variance = job.total_actual - job.total_budget;
    
    if (variance <= 0) {
      // Under or at budget - add the saved amount (positive value)
      closedWithinBudget += Math.abs(variance);
    } else {
      // Over budget - add the excess amount
      closedOverBudget += variance;
    }

    // Track percentage variance for average
    const percentVariance = ((job.total_actual - job.total_budget) / job.total_budget) * 100;
    totalVariance += percentVariance;
  });

  const avgBudgetVariance = totalVariance / closedJobs.length;

  console.log(`💰 Budget Performance:`, {
    closedWithinBudget: `$${closedWithinBudget.toFixed(0)}`,
    closedOverBudget: `$${closedOverBudget.toFixed(0)}`,
    avgVariance: `${avgBudgetVariance.toFixed(1)}%`,
  });

  return {
    closedWithinBudget: Math.round(closedWithinBudget),
    closedOverBudget: Math.round(closedOverBudget),
    avgBudgetVariance: Math.round(avgBudgetVariance * 10) / 10,
  };
}

/**
 * Hook to calculate project performance metrics from job costing data
 */
export function useConstructionProjectPerformance(period: DatePeriod = "month") {
  return useQuery({
    queryKey: ["construction-project-performance", period],
    queryFn: async (): Promise<ProjectPerformanceMetrics> => {
      // Fetch jobs from job costing module
      const jobs = await fetchJobs(period);

      if (jobs.length === 0) {
        return {
          difotRate: 0,
          closedWithinBudget: 0,
          closedOverBudget: 0,
          totalClosedProjects: 0,
          onTimeProjects: 0,
          lateProjects: 0,
          avgBudgetVariance: 0,
        };
      }

      // Calculate DIFOT
      const { difotRate, onTimeProjects, lateProjects } = calculateDIFOT(jobs);

      // Calculate budget performance
      const { closedWithinBudget, closedOverBudget, avgBudgetVariance } =
        calculateBudgetPerformance(jobs);

      const closedJobs = jobs.filter(isProjectClosed);

      return {
        difotRate,
        closedWithinBudget,
        closedOverBudget,
        totalClosedProjects: closedJobs.length,
        onTimeProjects,
        lateProjects,
        avgBudgetVariance,
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 1000 * 60 * 10, // Auto-refresh every 10 minutes
  });
}

