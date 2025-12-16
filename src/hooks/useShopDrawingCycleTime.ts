import { useQuery } from "@tantml:query";
import { supabase } from "@/integrations/supabase/client";
import { calculateWorkingHours } from "@/utils/workingHours";
import { getDateRange, type DatePeriod } from "@/utils/dateHelpers";
import { applyAdvancedFilters, type AdvancedFilters } from "@/utils/filterHelpers";
import type { AdvancedFilters as AdvancedFiltersType } from "@/types/filters";

export interface StageMetrics {
  stageName: string;
  avgHours: number;
  minHours: number;
  maxHours: number;
  ticketCount: number;
}

export interface QualityMetrics {
  revisionRate: number;        // % of drawings that needed revisions
  firstTimePassRate: number;   // % of drawings passed without revisions
  difotRate: number;           // % of drawings delivered on time
  totalCompleted: number;      // Total completed in period
  revisionsRequired: number;   // Count with revisions
  onTimeDeliveries: number;    // Count delivered on time
  lateDeliveries: number;      // Count delivered late
}

export interface TicketWithHistory {
  id: number;
  name: string;
  createDate: string;
  closeDate: string | false;
  currentStage: string;
  stageTransitions: StageTransition[];
  totalCycleTimeHours: number;
}

export interface StageTransition {
  stageName: string;
  enteredAt: string;
  exitedAt: string | null;
  durationHours: number | null;
}

export interface ShopDrawingCycleTimeData {
  overallAvgHours: number; // New → Complete (or create → close)
  overallMedianHours: number;
  completedTicketsCount: number;
  stages: StageMetrics[];
  recentTickets: TicketWithHistory[];
  hasStageHistory: boolean; // Whether we have detailed stage tracking
  qualityMetrics: QualityMetrics;
}

interface HelpdeskTicketWithMessages {
  id: number;
  name: string;
  team_id: [number, string] | false;
  stage_id: [number, string];
  create_date: string;
  close_date: string | false;
  message_ids?: number[];
  sla_deadline?: string | false;
  sla_reached_late?: boolean;
}

interface MailMessage {
  id: number;
  date: string;
  body: string;
  tracking_value_ids?: number[];
  subtype_id?: [number, string] | false;
}

interface MailTrackingValue {
  id: number;
  field: string;
  old_value_char: string | false;
  new_value_char: string | false;
  mail_message_id: [number, string];
}

// Stage names as they appear in Odoo
const STAGE_ORDER = [
  "New Drawings",
  "Revision Required",
  "Drawings In Progress",
  "Design Review",
  "Complete Drawings"
];

async function fetchShopDrawingsTickets(): Promise<HelpdeskTicketWithMessages[]> {
  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: {
      model: "helpdesk.ticket",
      method: "search_read",
      args: [
        [
          ["team_id.name", "=", "Shop Drawings"],
          ["create_date", ">=", "2024-01-01"], // Last year of data
        ],
        [
          "id",
          "name",
          "team_id",
          "stage_id",
          "create_date",
          "close_date",
          "message_ids",
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
  return data as HelpdeskTicketWithMessages[];
}

async function fetchMessagesForTickets(ticketIds: number[]): Promise<MailMessage[]> {
  if (ticketIds.length === 0) return [];

  try {
    const { data, error } = await supabase.functions.invoke("odoo-query", {
      body: {
        model: "mail.message",
        method: "search_read",
        args: [
          [
            ["model", "=", "helpdesk.ticket"],
            ["res_id", "in", ticketIds],
            ["tracking_value_ids", "!=", false],
          ],
          ["id", "date", "body", "tracking_value_ids", "subtype_id", "res_id"],
        ],
        kwargs: {
          order: "date asc",
        },
      },
    });

    if (error) throw error;
    return data as MailMessage[];
  } catch (error) {
    console.warn("Could not fetch mail.message data:", error);
    return [];
  }
}

async function fetchTrackingValues(trackingIds: number[]): Promise<MailTrackingValue[]> {
  if (trackingIds.length === 0) return [];

  try {
    const { data, error } = await supabase.functions.invoke("odoo-query", {
      body: {
        model: "mail.tracking.value",
        method: "search_read",
        args: [
          [
            ["id", "in", trackingIds],
            ["field", "=", "stage_id"],
          ],
          ["id", "field", "old_value_char", "new_value_char", "mail_message_id"],
        ],
      },
    });

    if (error) throw error;
    return data as MailTrackingValue[];
  } catch (error) {
    console.warn("Could not fetch mail.tracking.value data:", error);
    return [];
  }
}

function calculateStageTransitions(
  ticket: HelpdeskTicketWithMessages,
  messages: MailMessage[],
  trackingValues: MailTrackingValue[]
): StageTransition[] {
  const transitions: StageTransition[] = [];
  
  // Build a map of message_id to tracking values
  const trackingByMessage = new Map<number, MailTrackingValue[]>();
  trackingValues.forEach((tv) => {
    const msgId = tv.mail_message_id[0];
    if (!trackingByMessage.has(msgId)) {
      trackingByMessage.set(msgId, []);
    }
    trackingByMessage.get(msgId)!.push(tv);
  });

  // Filter messages for this ticket and find stage changes
  const ticketMessages = messages
    .filter((m: any) => m.res_id === ticket.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build timeline of stage changes
  const stageChanges: Array<{ stageName: string; timestamp: string }> = [];
  
  // Add creation as first stage (use first stage from stage_id or "New Drawings")
  stageChanges.push({
    stageName: "New Drawings",
    timestamp: ticket.create_date,
  });

  // Add stage changes from tracking
  ticketMessages.forEach((msg) => {
    const tracking = trackingByMessage.get(msg.id) || [];
    tracking.forEach((tv) => {
      if (tv.new_value_char) {
        stageChanges.push({
          stageName: tv.new_value_char,
          timestamp: msg.date,
        });
      }
    });
  });

  // Add close as final transition if closed
  if (ticket.close_date) {
    const currentStageName = ticket.stage_id[1];
    // Only add if different from last tracked stage
    if (stageChanges.length === 0 || stageChanges[stageChanges.length - 1].stageName !== currentStageName) {
      stageChanges.push({
        stageName: currentStageName,
        timestamp: ticket.close_date,
      });
    }
  }

  // Convert to transitions with durations
  for (let i = 0; i < stageChanges.length; i++) {
    const current = stageChanges[i];
    const next = stageChanges[i + 1];
    
    const enteredAt = current.timestamp;
    const exitedAt = next ? next.timestamp : null;
    const durationHours = exitedAt 
      ? calculateWorkingHours(enteredAt, exitedAt)
      : null;

    transitions.push({
      stageName: current.stageName,
      enteredAt,
      exitedAt,
      durationHours,
    });
  }

  return transitions;
}

function calculateQualityMetrics(
  ticketsWithHistory: TicketWithHistory[],
  rawTickets: HelpdeskTicketWithMessages[]
): QualityMetrics {
  // Only consider closed tickets
  const closedTickets = ticketsWithHistory.filter((t) => t.closeDate);
  const totalCompleted = closedTickets.length;

  if (totalCompleted === 0) {
    return {
      revisionRate: 0,
      firstTimePassRate: 0,
      difotRate: 0,
      totalCompleted: 0,
      revisionsRequired: 0,
      onTimeDeliveries: 0,
      lateDeliveries: 0,
    };
  }

  // Calculate Revision Rate
  const ticketsWithRevisions = closedTickets.filter((ticket) =>
    ticket.stageTransitions.some((st) => st.stageName.includes("Revision Required"))
  );
  const revisionsRequired = ticketsWithRevisions.length;
  const revisionRate = (revisionsRequired / totalCompleted) * 100;

  // Calculate First-Time Pass Rate
  const firstTimePassRate = 100 - revisionRate;

  // Calculate DIFOT Rate
  let onTimeDeliveries = 0;
  let lateDeliveries = 0;

  closedTickets.forEach((ticket) => {
    const rawTicket = rawTickets.find((t) => t.id === ticket.id);
    
    // Priority 1: Use Odoo SLA if available
    if (rawTicket && typeof rawTicket.sla_reached_late === 'boolean') {
      if (!rawTicket.sla_reached_late) {
        onTimeDeliveries++;
      } else {
        lateDeliveries++;
      }
    } 
    // Priority 2: Fallback to custom SLA (40 working hours)
    else if (ticket.totalCycleTimeHours > 0) {
      if (ticket.totalCycleTimeHours <= 40) {
        onTimeDeliveries++;
      } else {
        lateDeliveries++;
      }
    }
  });

  const difotRate = totalCompleted > 0 ? (onTimeDeliveries / totalCompleted) * 100 : 0;

  return {
    revisionRate: Math.round(revisionRate * 10) / 10, // Round to 1 decimal
    firstTimePassRate: Math.round(firstTimePassRate * 10) / 10,
    difotRate: Math.round(difotRate * 10) / 10,
    totalCompleted,
    revisionsRequired,
    onTimeDeliveries,
    lateDeliveries,
  };
}

function calculateCycleTimeMetrics(
  tickets: HelpdeskTicketWithMessages[],
  ticketsWithHistory: TicketWithHistory[]
): ShopDrawingCycleTimeData {
  // Only consider closed tickets for cycle time
  const closedTickets = ticketsWithHistory.filter((t) => t.closeDate);
  
  // Calculate overall cycle times
  const cycleTimes = closedTickets
    .map((t) => t.totalCycleTimeHours)
    .filter((hours) => hours > 0)
    .sort((a, b) => a - b);

  const overallAvgHours = cycleTimes.length > 0
    ? cycleTimes.reduce((sum, hours) => sum + hours, 0) / cycleTimes.length
    : 0;

  const overallMedianHours = cycleTimes.length > 0
    ? cycleTimes[Math.floor(cycleTimes.length / 2)]
    : 0;

  // Calculate stage metrics
  const stageMetricsMap = new Map<string, number[]>();
  
  STAGE_ORDER.forEach((stageName) => {
    stageMetricsMap.set(stageName, []);
  });

  // Collect durations for each stage
  closedTickets.forEach((ticket) => {
    ticket.stageTransitions.forEach((transition) => {
      if (transition.durationHours !== null && transition.durationHours > 0) {
        const durations = stageMetricsMap.get(transition.stageName) || [];
        durations.push(transition.durationHours);
        stageMetricsMap.set(transition.stageName, durations);
      }
    });
  });

  // Calculate metrics for each stage
  const stages: StageMetrics[] = STAGE_ORDER.map((stageName) => {
    const durations = stageMetricsMap.get(stageName) || [];
    
    return {
      stageName,
      avgHours: durations.length > 0
        ? durations.reduce((sum, h) => sum + h, 0) / durations.length
        : 0,
      minHours: durations.length > 0 ? Math.min(...durations) : 0,
      maxHours: durations.length > 0 ? Math.max(...durations) : 0,
      ticketCount: durations.length,
    };
  }).filter((s) => s.ticketCount > 0); // Only include stages with data

  // Get recent tickets (last 10 closed)
  const recentTickets = closedTickets
    .sort((a, b) => new Date(b.closeDate as string).getTime() - new Date(a.closeDate as string).getTime())
    .slice(0, 10);

  const hasStageHistory = ticketsWithHistory.some((t) => t.stageTransitions.length > 1);

  // Calculate quality metrics
  const qualityMetrics = calculateQualityMetrics(ticketsWithHistory, tickets);

  return {
    overallAvgHours,
    overallMedianHours,
    completedTicketsCount: closedTickets.length,
    stages,
    recentTickets,
    hasStageHistory,
    qualityMetrics,
  };
}

export function useShopDrawingCycleTime(
  period: DatePeriod = "month",
  advancedFilters?: AdvancedFiltersType
) {
  return useQuery({
    queryKey: ["shop-drawing-cycle-time", period, advancedFilters],
    queryFn: async (): Promise<ShopDrawingCycleTimeData> => {
      // Step 1: Fetch tickets
      const allTickets = await fetchShopDrawingsTickets();
      
      // Step 2: Filter tickets by period (based on close_date)
      const periodRange = getDateRange(period);
      let tickets = allTickets.filter((ticket) => {
        if (!ticket.close_date) return false;
        const closeDate = new Date(ticket.close_date);
        return closeDate >= periodRange.start && closeDate <= periodRange.end;
      });

      // Step 2.5: Apply advanced filters if provided
      if (advancedFilters && Object.keys(advancedFilters).length > 0) {
        tickets = applyAdvancedFilters(tickets, advancedFilters);
      }
      
      if (tickets.length === 0) {
        return {
          overallAvgHours: 0,
          overallMedianHours: 0,
          completedTicketsCount: 0,
          stages: [],
          recentTickets: [],
          hasStageHistory: false,
          qualityMetrics: {
            revisionRate: 0,
            firstTimePassRate: 0,
            difotRate: 0,
            totalCompleted: 0,
            revisionsRequired: 0,
            onTimeDeliveries: 0,
            lateDeliveries: 0,
          },
        };
      }

      // Step 3: Try to fetch message tracking data
      const ticketIds = tickets.map((t) => t.id);
      const messages = await fetchMessagesForTickets(ticketIds);
      
      // Step 4: Fetch tracking values if we have messages
      const trackingIds: number[] = [];
      messages.forEach((msg) => {
        if (msg.tracking_value_ids && Array.isArray(msg.tracking_value_ids)) {
          trackingIds.push(...msg.tracking_value_ids);
        }
      });
      
      const trackingValues = trackingIds.length > 0 
        ? await fetchTrackingValues(trackingIds)
        : [];

      // Step 5: Build ticket history
      const ticketsWithHistory: TicketWithHistory[] = tickets.map((ticket) => {
        let stageTransitions: StageTransition[] = [];
        
        // Try to get stage transitions from tracking
        if (messages.length > 0 && trackingValues.length > 0) {
          stageTransitions = calculateStageTransitions(ticket, messages, trackingValues);
        }
        
        // Fallback: Use create_date and close_date only
        if (stageTransitions.length === 0 && ticket.close_date) {
          const hours = calculateWorkingHours(ticket.create_date, ticket.close_date);
          
          stageTransitions = [{
            stageName: ticket.stage_id[1],
            enteredAt: ticket.create_date,
            exitedAt: ticket.close_date,
            durationHours: hours,
          }];
        }

        const totalCycleTimeHours = ticket.close_date
          ? calculateWorkingHours(ticket.create_date, ticket.close_date)
          : 0;

        return {
          id: ticket.id,
          name: ticket.name,
          createDate: ticket.create_date,
          closeDate: ticket.close_date,
          currentStage: ticket.stage_id[1],
          stageTransitions,
          totalCycleTimeHours,
        };
      });

      // Step 6: Calculate metrics
      return calculateCycleTimeMetrics(tickets, ticketsWithHistory);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 1000 * 60 * 10, // Auto-refresh every 10 minutes
  });
}

