/**
 * Advanced Filter Types
 * Used across KPI dashboards for filtering helpdesk tickets
 */

export interface AdvancedFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  assignedTo?: string[]; // user IDs
  teams?: string[]; // team names
  priority?: string[]; // '0' | '1' | '2' | '3'
  status?: ('open' | 'closed' | 'overdue')[];
}

export interface SavedFilters {
  production_kpis?: AdvancedFilters;
  design_kpis?: AdvancedFilters;
  lastUpdated: string;
}

export const PRIORITY_OPTIONS = [
  { value: '0', label: 'Low' },
  { value: '1', label: 'Medium' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Urgent' },
];

export const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'overdue', label: 'Overdue' },
];

