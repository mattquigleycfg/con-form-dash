import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDateRange, toOdooDateTime, type DatePeriod } from "@/utils/dateHelpers";
import { getTeamsForDepartment, type Department } from "@/utils/helpdeskTeamMapping";

export interface HelpdeskTicketRaw {
  id: number;
  name: string;
  team_id: [number, string] | false;
  user_id: [number, string] | false;
  partner_id: [number, string] | false;
  stage_id: [number, string];
  priority: string; // '0' | '1' | '2' | '3'
  kanban_state: string;
  create_date: string;
  close_date: string | false;
  assign_date: string | false;
  sla_deadline: string | false;
  sla_reached_late: boolean;
  active: boolean;
}

export interface TeamKPIMetrics {
  teamName: string;
  teamId: number | null;
  open: number;
  closed: number;
  closedWeek: number;
  closedMTD: number;
  closedYTD: number;
  urgent: number;
  unassigned: number;
  overdue: number;
  avgCloseHours: number | null;
  avgAssignHours: number | null;
  successRate: number | null;
}

export interface HelpdeskKPIData {
  teams: TeamKPIMetrics[];
  totals: {
    open: number;
    closed: number;
    urgent: number;
    unassigned: number;
    overdue: number;
  };
  byDepartment: Record<Department, TeamKPIMetrics[]>;
}

async function fetchHelpdeskTickets(): Promise<HelpdeskTicketRaw[]> {
  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: {
      model: "helpdesk.ticket",
      method: "search_read",
      args: [
        [], // Get all tickets - we'll filter client-side for flexibility
        [
          "id",
          "name",
          "team_id",
          "user_id",
          "partner_id",
          "stage_id",
          "priority",
          "kanban_state",
          "create_date",
          "close_date",
          "assign_date",
          "sla_deadline",
          "sla_reached_late",
          "active",
        ],
      ],
      kwargs: {
        limit: 10000, // Get a large batch
      },
    },
  });

  if (error) throw error;
  return data as HelpdeskTicketRaw[];
}

function calculateTeamMetrics(
  tickets: HelpdeskTicketRaw[],
  teamName: string,
  period: DatePeriod
): TeamKPIMetrics {
  const teamTickets = tickets.filter(
    (t) => t.team_id && t.team_id[1] === teamName
  );
  
  const now = new Date();
  const weekRange = getDateRange("week", now);
  const monthRange = getDateRange("month", now);
  const yearRange = getDateRange("ytd", now);

  // Open tickets (active and not in closed stages - we check for stage name patterns)
  const openTickets = teamTickets.filter(
    (t) => t.active && !t.close_date
  );

  // Closed tickets
  const closedTickets = teamTickets.filter((t) => t.close_date);
  
  const closedInWeek = closedTickets.filter((t) => {
    const closeDate = new Date(t.close_date as string);
    return closeDate >= weekRange.start && closeDate <= weekRange.end;
  });

  const closedInMonth = closedTickets.filter((t) => {
    const closeDate = new Date(t.close_date as string);
    return closeDate >= monthRange.start && closeDate <= monthRange.end;
  });

  const closedInYear = closedTickets.filter((t) => {
    const closeDate = new Date(t.close_date as string);
    return closeDate >= yearRange.start && closeDate <= yearRange.end;
  });

  // Urgent tickets (priority '3')
  const urgentTickets = openTickets.filter((t) => t.priority === "3");

  // Unassigned tickets
  const unassignedTickets = openTickets.filter((t) => !t.user_id);

  // Overdue tickets (SLA deadline passed)
  const overdueTickets = openTickets.filter((t) => {
    if (!t.sla_deadline) return false;
    return new Date(t.sla_deadline) < now;
  });

  // Calculate average close time
  const closeTimesHours = closedTickets
    .filter((t) => t.create_date && t.close_date)
    .map((t) => {
      const created = new Date(t.create_date);
      const closed = new Date(t.close_date as string);
      return (closed.getTime() - created.getTime()) / (1000 * 60 * 60);
    });

  const avgCloseHours =
    closeTimesHours.length > 0
      ? closeTimesHours.reduce((a, b) => a + b, 0) / closeTimesHours.length
      : null;

  // Calculate average assignment time
  const assignTimesHours = teamTickets
    .filter((t) => t.create_date && t.assign_date)
    .map((t) => {
      const created = new Date(t.create_date);
      const assigned = new Date(t.assign_date as string);
      return (assigned.getTime() - created.getTime()) / (1000 * 60 * 60);
    });

  const avgAssignHours =
    assignTimesHours.length > 0
      ? assignTimesHours.reduce((a, b) => a + b, 0) / assignTimesHours.length
      : null;

  // Success rate (closed / total created in period)
  const totalInPeriod = teamTickets.filter((t) => {
    const createDate = new Date(t.create_date);
    const range = getDateRange(period, now);
    return createDate >= range.start && createDate <= range.end;
  }).length;

  const closedInPeriod = closedTickets.filter((t) => {
    const closeDate = new Date(t.close_date as string);
    const range = getDateRange(period, now);
    return closeDate >= range.start && closeDate <= range.end;
  }).length;

  const successRate = totalInPeriod > 0 ? (closedInPeriod / totalInPeriod) * 100 : null;

  return {
    teamName,
    teamId: teamTickets[0]?.team_id ? teamTickets[0].team_id[0] : null,
    open: openTickets.length,
    closed: closedTickets.length,
    closedWeek: closedInWeek.length,
    closedMTD: closedInMonth.length,
    closedYTD: closedInYear.length,
    urgent: urgentTickets.length,
    unassigned: unassignedTickets.length,
    overdue: overdueTickets.length,
    avgCloseHours,
    avgAssignHours,
    successRate,
  };
}

export function useHelpdeskKPIs(period: DatePeriod = "month") {
  return useQuery({
    queryKey: ["helpdesk-kpis", period],
    queryFn: async (): Promise<HelpdeskKPIData> => {
      const tickets = await fetchHelpdeskTickets();

      // Get unique team names
      const teamNames = new Set<string>();
      tickets.forEach((t) => {
        if (t.team_id) {
          teamNames.add(t.team_id[1]);
        }
      });

      // Calculate metrics for each team
      const teams: TeamKPIMetrics[] = Array.from(teamNames).map((teamName) =>
        calculateTeamMetrics(tickets, teamName, period)
      );

      // Calculate totals
      const totals = {
        open: teams.reduce((sum, t) => sum + t.open, 0),
        closed: teams.reduce((sum, t) => sum + t.closed, 0),
        urgent: teams.reduce((sum, t) => sum + t.urgent, 0),
        unassigned: teams.reduce((sum, t) => sum + t.unassigned, 0),
        overdue: teams.reduce((sum, t) => sum + t.overdue, 0),
      };

      // Group by department
      const departments: Department[] = [
        "engineering",
        "production",
        "design",
        "finance",
        "construction",
        "sales",
        "marketing",
        "hr",
      ];

      const byDepartment: Record<Department, TeamKPIMetrics[]> = {} as any;
      
      for (const dept of departments) {
        const deptTeams = getTeamsForDepartment(dept);
        byDepartment[dept] = teams.filter((t) =>
          deptTeams.some((dt) => dt.name === t.teamName)
        );
      }

      return { teams, totals, byDepartment };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  });
}

// Hook to get KPIs for a specific department
export function useDepartmentHelpdeskKPIs(department: Department, period: DatePeriod = "month") {
  const { data, ...rest } = useHelpdeskKPIs(period);
  
  return {
    ...rest,
    data: data?.byDepartment[department] ?? [],
    totals: data?.totals,
  };
}

// Hook to get KPIs for a specific team
export function useTeamHelpdeskKPIs(teamName: string, period: DatePeriod = "month") {
  const { data, ...rest } = useHelpdeskKPIs(period);
  
  return {
    ...rest,
    data: data?.teams.find((t) => t.teamName === teamName) ?? null,
  };
}

