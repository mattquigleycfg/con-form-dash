import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateWorkingHours } from "@/utils/workingHours";
import type { AdvancedFilterOptions } from "@/types/filters";
import { applyAdvancedFilters } from "@/utils/filterHelpers";

interface HelpdeskTicket {
  id: number;
  name: string;
  stage_id: [number, string];
  create_date: string;
  close_date: string | false;
  date_deadline: string | false;
  user_id: [number, string] | false;
  team_id: [number, string] | false;
  priority: "0" | "1" | "2" | "3";
  ticket_type_id: [number, string] | false;
  sla_reached_late: boolean;
}

interface StageTransition {
  ticketId: number;
  fromStage: string;
  toStage: string;
  transitionDate: string;
}

interface CycleTimeMetrics {
  overallAvgHours: number;
  overallMedianHours: number;
  stageMetrics: {
    [stageName: string]: {
      avgHours: number;
      medianHours: number;
      count: number;
    };
  };
  qualityMetrics: {
    revisionRate: number;
    firstTimePassRate: number;
    difot: number;
  };
}

const ACCOUNT_APP_TICKET_TYPE_ID = 7; // Ticket type ID for "Accounts Applications"

async function fetchAccountApplicationTickets(
  startDate: string,
  endDate: string
): Promise<HelpdeskTicket[]> {
  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: {
      model: "helpdesk.ticket",
      method: "search_read",
      domain: [
        ["ticket_type_id", "=", ACCOUNT_APP_TICKET_TYPE_ID],
        ["create_date", ">=", startDate],
        ["create_date", "<=", endDate],
      ],
      fields: [
        "id",
        "name",
        "stage_id",
        "create_date",
        "close_date",
        "date_deadline",
        "user_id",
        "team_id",
        "priority",
        "ticket_type_id",
        "sla_reached_late",
      ],
    },
  });

  if (error) throw error;
  return data?.result || [];
}

async function fetchStageHistory(ticketIds: number[]): Promise<StageTransition[]> {
  if (ticketIds.length === 0) return [];

  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: {
      model: "mail.tracking.value",
      method: "search_read",
      domain: [
        ["mail_message_id.model", "=", "helpdesk.ticket"],
        ["mail_message_id.res_id", "in", ticketIds],
        ["field_id.name", "=", "stage_id"],
      ],
      fields: [
        "id",
        "mail_message_id",
        "old_value_char",
        "new_value_char",
        "create_date",
      ],
    },
  });

  if (error) throw error;

  const trackingValues = data?.result || [];
  const transitions: StageTransition[] = [];

  for (const tracking of trackingValues) {
    const { data: messageData } = await supabase.functions.invoke("odoo-query", {
      body: {
        model: "mail.message",
        method: "search_read",
        domain: [["id", "=", tracking.mail_message_id[0]]],
        fields: ["res_id", "date"],
      },
    });

    const message = messageData?.result?.[0];
    if (message) {
      transitions.push({
        ticketId: message.res_id,
        fromStage: tracking.old_value_char || "New",
        toStage: tracking.new_value_char,
        transitionDate: tracking.create_date,
      });
    }
  }

  return transitions;
}

function calculateStageTransitions(
  tickets: HelpdeskTicket[],
  stageHistory: StageTransition[]
) {
  const ticketStageData = new Map<
    number,
    {
      ticket: HelpdeskTicket;
      stages: Array<{ stage: string; enteredAt: string; exitedAt?: string }>;
    }
  >();

  tickets.forEach((ticket) => {
    const transitions = stageHistory
      .filter((t) => t.ticketId === ticket.id)
      .sort((a, b) => new Date(a.transitionDate).getTime() - new Date(b.transitionDate).getTime());

    const stages: Array<{ stage: string; enteredAt: string; exitedAt?: string }> = [];

    if (transitions.length === 0) {
      stages.push({
        stage: ticket.stage_id[1],
        enteredAt: ticket.create_date,
        exitedAt: ticket.close_date || undefined,
      });
    } else {
      stages.push({
        stage: transitions[0].fromStage,
        enteredAt: ticket.create_date,
        exitedAt: transitions[0].transitionDate,
      });

      for (let i = 0; i < transitions.length; i++) {
        const current = transitions[i];
        const next = transitions[i + 1];

        stages.push({
          stage: current.toStage,
          enteredAt: current.transitionDate,
          exitedAt: next?.transitionDate || ticket.close_date || undefined,
        });
      }
    }

    ticketStageData.set(ticket.id, { ticket, stages });
  });

  return ticketStageData;
}

function calculateCycleTimeMetrics(
  ticketStageData: Map<
    number,
    {
      ticket: HelpdeskTicket;
      stages: Array<{ stage: string; enteredAt: string; exitedAt?: string }>;
    }
  >
): CycleTimeMetrics {
  const completedTickets: number[] = [];
  const stageHours: { [stageName: string]: number[] } = {};

  ticketStageData.forEach(({ ticket, stages }) => {
    if (!ticket.close_date) return;

    const totalHours = calculateWorkingHours(ticket.create_date, ticket.close_date);
    completedTickets.push(totalHours);

    stages.forEach((stage) => {
      if (stage.exitedAt) {
        const hours = calculateWorkingHours(stage.enteredAt, stage.exitedAt);
        if (!stageHours[stage.stage]) {
          stageHours[stage.stage] = [];
        }
        stageHours[stage.stage].push(hours);
      }
    });
  });

  const overallAvgHours = completedTickets.length > 0
    ? completedTickets.reduce((sum, h) => sum + h, 0) / completedTickets.length
    : 0;

  const sortedOverall = [...completedTickets].sort((a, b) => a - b);
  const overallMedianHours = sortedOverall.length > 0
    ? sortedOverall[Math.floor(sortedOverall.length / 2)]
    : 0;

  const stageMetrics: {
    [stageName: string]: { avgHours: number; medianHours: number; count: number };
  } = {};

  Object.keys(stageHours).forEach((stageName) => {
    const hours = stageHours[stageName];
    const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length;
    const sorted = [...hours].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    stageMetrics[stageName] = {
      avgHours: avg,
      medianHours: median,
      count: hours.length,
    };
  });

  // Calculate quality metrics
  const qualityMetrics = calculateQualityMetrics(ticketStageData);

  return {
    overallAvgHours,
    overallMedianHours,
    stageMetrics,
    qualityMetrics,
  };
}

function calculateQualityMetrics(
  ticketStageData: Map<
    number,
    {
      ticket: HelpdeskTicket;
      stages: Array<{ stage: string; enteredAt: string; exitedAt?: string }>;
    }
  >
) {
  let totalCompleted = 0;
  let revisionsCount = 0;
  let firstTimePass = 0;
  let difotSuccess = 0;

  ticketStageData.forEach(({ ticket, stages }) => {
    if (!ticket.close_date) return;

    totalCompleted++;

    // Check for revisions (if ticket went back to an earlier stage)
    const stageNames = stages.map((s) => s.stage);
    const uniqueStages = new Set(stageNames);
    const hasRevision = stageNames.length > uniqueStages.size;

    if (hasRevision) {
      revisionsCount++;
    } else {
      firstTimePass++;
    }

    // DIFOT: Check if completed within deadline or SLA
    if (ticket.date_deadline) {
      const completedOn = new Date(ticket.close_date);
      const deadline = new Date(ticket.date_deadline);
      if (completedOn <= deadline) {
        difotSuccess++;
      }
    } else if (!ticket.sla_reached_late) {
      // If no deadline set, use SLA status
      difotSuccess++;
    }
  });

  return {
    revisionRate: totalCompleted > 0 ? (revisionsCount / totalCompleted) * 100 : 0,
    firstTimePassRate: totalCompleted > 0 ? (firstTimePass / totalCompleted) * 100 : 0,
    difot: totalCompleted > 0 ? (difotSuccess / totalCompleted) * 100 : 0,
  };
}

export function useAccountApplications(
  startDate: string,
  endDate: string,
  filters?: AdvancedFilterOptions
) {
  return useQuery({
    queryKey: ["account-applications", startDate, endDate, filters],
    queryFn: async () => {
      let tickets = await fetchAccountApplicationTickets(startDate, endDate);

      // Apply advanced filters
      if (filters) {
        tickets = applyAdvancedFilters(tickets, filters);
      }

      const ticketIds = tickets.map((t) => t.id);
      const stageHistory = await fetchStageHistory(ticketIds);
      const ticketStageData = calculateStageTransitions(tickets, stageHistory);
      const metrics = calculateCycleTimeMetrics(ticketStageData);

      return {
        tickets,
        stageHistory,
        ticketStageData,
        metrics,
        totalTickets: tickets.length,
        completedTickets: tickets.filter((t) => t.close_date).length,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

