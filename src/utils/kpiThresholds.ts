import type { KPIStatus } from "@/components/kpi/StatusChip";

export interface ThresholdConfig {
  green?: { min?: number; max?: number };
  amber?: { min?: number; max?: number };
  red?: { min?: number; max?: number };
  higherIsBetter?: boolean; // Default true
}

// Default thresholds for KPI metrics
// For higherIsBetter=true: value >= green.min is green, value >= amber.min is amber, else red
// For higherIsBetter=false (lower is better): value <= green.max is green, value <= amber.max is amber, else red
export const KPI_THRESHOLDS: Record<string, ThresholdConfig> = {
  // Production metrics (lower is better for open counts)
  packouts_open: {
    green: { max: 1500 },
    amber: { max: 2000 },
    higherIsBetter: false,
  },
  kit_orders_open: {
    green: { max: 500 },
    amber: { max: 800 },
    higherIsBetter: false,
  },
  packouts_urgent: {
    green: { max: 100 },
    amber: { max: 250 },
    higherIsBetter: false,
  },
  kit_orders_urgent: {
    green: { max: 30 },
    amber: { max: 50 },
    higherIsBetter: false,
  },
  packouts_unassigned: {
    green: { max: 20 },
    amber: { max: 50 },
    higherIsBetter: false,
  },

  // DIFOT metrics (higher is better)
  packout_difot: {
    green: { min: 95 },
    amber: { min: 85 },
    higherIsBetter: true,
  },
  quote_difot: {
    green: { min: 95 },
    amber: { min: 85 },
    higherIsBetter: true,
  },
  shop_drawing_difot: {
    green: { min: 95 },
    amber: { min: 85 },
    higherIsBetter: true,
  },
  project_difot: {
    green: { min: 95 },
    amber: { min: 85 },
    higherIsBetter: true,
  },

  // Sales metrics
  conversion_rate: {
    green: { min: 25 },
    amber: { min: 15 },
    higherIsBetter: true,
  },
  gross_profit_percent: {
    green: { min: 35 },
    amber: { min: 28 },
    higherIsBetter: true,
  },
  quote_success_rate: {
    green: { min: 30 },
    amber: { min: 20 },
    higherIsBetter: true,
  },
  msi_per_rep: {
    green: { min: 400 },
    amber: { min: 300 },
    higherIsBetter: true,
  },
  f2f_calls_weekly: {
    green: { min: 5 },
    amber: { min: 3 },
    higherIsBetter: true,
  },

  // Finance metrics
  ar_days: {
    green: { max: 45 },
    amber: { max: 60 },
    higherIsBetter: false,
  },
  ap_days: {
    green: { max: 30 },
    amber: { max: 45 },
    higherIsBetter: false,
  },
  invoices_open: {
    green: { max: 100 },
    amber: { max: 150 },
    higherIsBetter: false,
  },

  // Engineering metrics
  quotes_open: {
    green: { max: 50 },
    amber: { max: 100 },
    higherIsBetter: false,
  },
  quotes_overdue: {
    green: { max: 5 },
    amber: { max: 15 },
    higherIsBetter: false,
  },

  // Design metrics
  shop_drawings_open: {
    green: { max: 10 },
    amber: { max: 25 },
    higherIsBetter: false,
  },
  shop_drawings_overdue: {
    green: { max: 2 },
    amber: { max: 5 },
    higherIsBetter: false,
  },

  // Construction metrics
  contracts_open: {
    green: { max: 200 },
    amber: { max: 300 },
    higherIsBetter: false,
  },
  contracts_unassigned: {
    green: { max: 50 },
    amber: { max: 150 },
    higherIsBetter: false,
  },

  // HR metrics
  attrition_rate: {
    green: { max: 10 },
    amber: { max: 15 },
    higherIsBetter: false,
  },
  days_since_injury: {
    green: { min: 30 },
    amber: { min: 14 },
    higherIsBetter: true,
  },
  absenteeism_rate: {
    green: { max: 3 },
    amber: { max: 5 },
    higherIsBetter: false,
  },

  // QA metrics
  qa_tickets_open: {
    green: { max: 10 },
    amber: { max: 20 },
    higherIsBetter: false,
  },
  qa_resolution_rate: {
    green: { min: 90 },
    amber: { min: 75 },
    higherIsBetter: true,
  },
};

/**
 * Get the status for a KPI metric value based on its threshold configuration
 */
export function getKPIStatus(metricKey: string, value: number, customThreshold?: ThresholdConfig): KPIStatus {
  const threshold = customThreshold || KPI_THRESHOLDS[metricKey];
  
  if (!threshold) {
    return "neutral";
  }

  const higherIsBetter = threshold.higherIsBetter !== false;

  if (higherIsBetter) {
    // Higher values are better (e.g., conversion rate, DIFOT)
    if (threshold.green?.min !== undefined && value >= threshold.green.min) {
      return "green";
    }
    if (threshold.amber?.min !== undefined && value >= threshold.amber.min) {
      return "amber";
    }
    return "red";
  } else {
    // Lower values are better (e.g., open tickets, days)
    if (threshold.green?.max !== undefined && value <= threshold.green.max) {
      return "green";
    }
    if (threshold.amber?.max !== undefined && value <= threshold.amber.max) {
      return "amber";
    }
    return "red";
  }
}

/**
 * Get the worst status from an array of statuses
 * Priority: red > amber > neutral > green
 */
export function getWorstStatus(statuses: KPIStatus[]): KPIStatus {
  if (statuses.includes("red")) return "red";
  if (statuses.includes("amber")) return "amber";
  if (statuses.includes("neutral")) return "neutral";
  return "green";
}

/**
 * Calculate percentage of target achieved
 */
export function getTargetPercentage(value: number, target: number, higherIsBetter = true): number {
  if (target === 0) return 0;
  
  if (higherIsBetter) {
    return (value / target) * 100;
  } else {
    // For lower-is-better metrics, invert the calculation
    return target === 0 ? 100 : Math.max(0, (2 - value / target)) * 100;
  }
}

