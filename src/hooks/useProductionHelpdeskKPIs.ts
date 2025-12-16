import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateWorkingHours } from "@/utils/workingHours";
import { getDateRange, type DatePeriod } from "@/utils/dateHelpers";
import { applyAdvancedFilters } from "@/utils/filterHelpers";
import type { AdvancedFilters } from "@/types/filters";

export interface ProductionQualityMetrics {
  difotRate: number;
  totalCompleted: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  avgCycleTimeHours: number;
  avgCycleTimeDays: number;
}

export interface ProductionHelpdeskData {
  teamName: string;
  qualityMetrics: ProductionQualityMetrics;
}

interface HelpdeskTicketWithSLA {
  id: number;
  name: string;
  team_id: [number, string] | false;
  stage_id: [number, string];
  create_date: string;
  close_date: string | false;
  user_id: [number, string] | false;
  priority: string;
  sla_deadline?: string | false;
  sla_reached_late?: boolean;
}

// Custom SLA thresholds in working hours
const TEAM_SLA_HOURS: Record<string, number> = {
  "Pack out Requests": 24, // 3 working days
  "Kit Orders": 16,         // 2 working days
  "Span+": 40,             // 5 working days
};

async function fetchTeamTickets(teamName: string): Promise<HelpdeskTicketWithSLA[]> {
  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: {
      model: "helpdesk.ticket",
      method: "search_read",
      args: [
        [
          ["team_id.name", "=", teamName],
          ["create_date", ">=", "2024-01-01"],
        ],
        [
          "id",
          "name",
          "team_id",
          "stage_id",
          "create_date",
          "close_date",
          "user_id",
          "priority",
          "sla_deadline",
          "sla_reached_late",
        ],
      ],
      kwargs: {
        limit: 500,
        order: "create_date desc",
      },
    },
  });

  if (error) throw error;
  return data as HelpdeskTicketWithSLA[];
}

function calculateProductionQualityMetrics(
  tickets: HelpdeskTicketWithSLA[],
  teamName: string
): ProductionQualityMetrics {
  // Only consider closed tickets
  const closedTickets = tickets.filter((t) => t.close_date);
  const totalCompleted = closedTickets.length;

  if (totalCompleted === 0) {
    return {
      difotRate: 0,
      totalCompleted: 0,
      onTimeDeliveries: 0,
      lateDeliveries: 0,
      avgCycleTimeHours: 0,
      avgCycleTimeDays: 0,
    };
  }

  // Calculate DIFOT
  let onTimeDeliveries = 0;
  let lateDeliveries = 0;
  const cycleTimesHours: number[] = [];

  const customSLA = TEAM_SLA_HOURS[teamName] || 40;

  closedTickets.forEach((ticket) => {
    // Calculate cycle time
    const cycleTime = calculateWorkingHours(ticket.create_date, ticket.close_date as string);
    cycleTimesHours.push(cycleTime);

    // Determine if on-time
    // Priority 1: Use Odoo SLA if available
    if (typeof ticket.sla_reached_late === 'boolean') {
      if (!ticket.sla_reached_late) {
        onTimeDeliveries++;
      } else {
        lateDeliveries++;
      }
    }
    // Priority 2: Fallback to custom SLA
    else {
      if (cycleTime <= customSLA) {
        onTimeDeliveries++;
      } else {
        lateDeliveries++;
      }
    }
  });

  const difotRate = (onTimeDeliveries / totalCompleted) * 100;
  const avgCycleTimeHours = cycleTimesHours.reduce((sum, h) => sum + h, 0) / cycleTimesHours.length;
  const avgCycleTimeDays = avgCycleTimeHours / 8; // Convert to working days

  return {
    difotRate: Math.round(difotRate * 10) / 10,
    totalCompleted,
    onTimeDeliveries,
    lateDeliveries,
    avgCycleTimeHours: Math.round(avgCycleTimeHours * 10) / 10,
    avgCycleTimeDays: Math.round(avgCycleTimeDays * 10) / 10,
  };
}

export function useProductionHelpdeskKPIs(
  teamName: "Pack out Requests" | "Kit Orders" | "Span+",
  period: DatePeriod = "month",
  advancedFilters?: AdvancedFilters
) {
  return useQuery({
    queryKey: ["production-helpdesk-kpis", teamName, period, advancedFilters],
    queryFn: async (): Promise<ProductionHelpdeskData> => {
      // Step 1: Fetch tickets for the team
      const allTickets = await fetchTeamTickets(teamName);

      // Step 2: Filter by period (based on close_date)
      const periodRange = getDateRange(period);
      let tickets = allTickets.filter((ticket) => {
        if (!ticket.close_date) return false;
        const closeDate = new Date(ticket.close_date);
        return closeDate >= periodRange.start && closeDate <= periodRange.end;
      });

      // Step 3: Apply advanced filters if provided
      if (advancedFilters && Object.keys(advancedFilters).length > 0) {
        tickets = applyAdvancedFilters(tickets, advancedFilters);
      }

      // Step 4: Calculate quality metrics
      const qualityMetrics = calculateProductionQualityMetrics(tickets, teamName);

      return {
        teamName,
        qualityMetrics,
      };
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 1000 * 60 * 10, // Auto-refresh every 10 minutes
  });
}

