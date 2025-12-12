// Helpdesk team mapping for KPI metrics
// Maps Odoo helpdesk teams to departments and their associated metrics

export interface HelpdeskTeamConfig {
  name: string;
  teamId?: number; // Odoo team_id if known
  metrics: string[];
  department: Department;
}

export type Department = 
  | "sales"
  | "marketing"
  | "engineering"
  | "construction"
  | "production"
  | "design"
  | "finance"
  | "hr";

export const DEPARTMENT_LABELS: Record<Department, string> = {
  sales: "Sales",
  marketing: "Marketing",
  engineering: "Engineering",
  construction: "Construction",
  production: "Production",
  design: "Design",
  finance: "Finance",
  hr: "HR",
};

export const HELPDESK_TEAMS: Record<Department, HelpdeskTeamConfig[]> = {
  engineering: [
    {
      name: "Design Estimators - CFG Division",
      metrics: ["quotes_open", "quotes_closed_week", "quotes_closed_mtd", "quotes_closed_ytd", "success_rate", "quotes_overdue"],
      department: "engineering",
    },
    {
      name: "DSF Division - Estimating",
      metrics: ["quotes_open", "quotes_urgent", "quotes_closed_week", "quotes_closed_mtd"],
      department: "engineering",
    },
  ],
  production: [
    {
      name: "Pack out Requests",
      metrics: ["open", "unassigned", "urgent", "completed_week", "completed_mtd", "completed_ytd"],
      department: "production",
    },
    {
      name: "Kit Orders",
      metrics: ["open", "unassigned", "urgent", "completed_week", "completed_mtd"],
      department: "production",
    },
    {
      name: "Span+",
      metrics: ["open", "unassigned", "urgent", "failed"],
      department: "production",
    },
  ],
  design: [
    {
      name: "Shop Drawings",
      metrics: ["open", "closed_week", "closed_mtd", "closed_ytd", "overdue"],
      department: "design",
    },
  ],
  finance: [
    {
      name: "Invoicing",
      metrics: ["open", "closed_ytd"],
      department: "finance",
    },
    {
      name: "Account applications",
      metrics: ["open", "urgent"],
      department: "finance",
    },
  ],
  construction: [
    {
      name: "Contracts",
      metrics: ["open", "unassigned", "overdue"],
      department: "construction",
    },
  ],
  sales: [],
  marketing: [],
  hr: [],
};

// Get all teams for a department
export function getTeamsForDepartment(department: Department): HelpdeskTeamConfig[] {
  return HELPDESK_TEAMS[department] || [];
}

// Get department from team name
export function getDepartmentFromTeamName(teamName: string): Department | null {
  for (const [dept, teams] of Object.entries(HELPDESK_TEAMS)) {
    if (teams.some((t) => t.name === teamName)) {
      return dept as Department;
    }
  }
  return null;
}

// Quality Control team - cross-departmental
export const QA_TEAM: HelpdeskTeamConfig = {
  name: "Quality Control",
  metrics: ["open", "urgent", "closed_ytd", "resolution_rate"],
  department: "production", // Default to production but shown in all relevant departments
};

// Operations Kanban team
export const OPERATIONS_TEAM: HelpdeskTeamConfig = {
  name: "Operations Kanban - DSF Division",
  metrics: ["open", "urgent"],
  department: "production",
};

