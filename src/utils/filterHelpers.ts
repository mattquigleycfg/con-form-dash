/**
 * Filter Helper Utilities
 * Functions to apply advanced filters to helpdesk tickets
 */

import { AdvancedFilters } from "@/types/filters";

export interface FilterableTicket {
  id: number;
  create_date: string;
  close_date: string | false;
  user_id: [number, string] | false;
  team_id: [number, string] | false;
  priority: string;
  sla_deadline?: string | false;
}

/**
 * Apply advanced filters to a list of tickets
 */
export function applyAdvancedFilters<T extends FilterableTicket>(
  tickets: T[],
  filters: AdvancedFilters
): T[] {
  let filtered = [...tickets];

  // Date range filter
  if (filters.dateRange) {
    filtered = filtered.filter((ticket) => {
      const closeDate = ticket.close_date ? new Date(ticket.close_date) : null;
      const createDate = new Date(ticket.create_date);
      
      // Check if ticket was active in the date range
      const isInRange = createDate <= filters.dateRange!.end && 
        (!closeDate || closeDate >= filters.dateRange!.start);
      
      return isInRange;
    });
  }

  // Assigned to filter
  if (filters.assignedTo && filters.assignedTo.length > 0) {
    filtered = filtered.filter((ticket) => {
      if (!ticket.user_id) return false;
      return filters.assignedTo!.includes(String(ticket.user_id[0]));
    });
  }

  // Team filter
  if (filters.teams && filters.teams.length > 0) {
    filtered = filtered.filter((ticket) => {
      if (!ticket.team_id) return false;
      return filters.teams!.some((teamName) => 
        ticket.team_id && ticket.team_id[1].includes(teamName)
      );
    });
  }

  // Priority filter
  if (filters.priority && filters.priority.length > 0) {
    filtered = filtered.filter((ticket) => 
      filters.priority!.includes(ticket.priority)
    );
  }

  // Status filter
  if (filters.status && filters.status.length > 0) {
    filtered = filtered.filter((ticket) => {
      const statuses = filters.status!;
      const isOpen = !ticket.close_date;
      const isClosed = !!ticket.close_date;
      const isOverdue = ticket.sla_deadline && 
        new Date(ticket.sla_deadline) < new Date() && 
        isOpen;

      return (
        (statuses.includes('open') && isOpen) ||
        (statuses.includes('closed') && isClosed) ||
        (statuses.includes('overdue') && isOverdue)
      );
    });
  }

  return filtered;
}

/**
 * Count active filters
 */
export function countActiveFilters(filters: AdvancedFilters): number {
  let count = 0;
  
  if (filters.dateRange) count++;
  if (filters.assignedTo && filters.assignedTo.length > 0) count++;
  if (filters.teams && filters.teams.length > 0) count++;
  if (filters.priority && filters.priority.length > 0) count++;
  if (filters.status && filters.status.length > 0) count++;
  
  return count;
}

/**
 * Save filters to localStorage
 */
export function saveFiltersToStorage(key: string, filters: AdvancedFilters): void {
  try {
    const saved = localStorage.getItem('kpi_filters');
    const existing = saved ? JSON.parse(saved) : {};
    
    existing[key] = filters;
    existing.lastUpdated = new Date().toISOString();
    
    localStorage.setItem('kpi_filters', JSON.stringify(existing));
  } catch (error) {
    console.warn('Failed to save filters to localStorage:', error);
  }
}

/**
 * Load filters from localStorage
 */
export function loadFiltersFromStorage(key: string): AdvancedFilters | null {
  try {
    const saved = localStorage.getItem('kpi_filters');
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    const filters = parsed[key];
    
    if (!filters) return null;
    
    // Parse date strings back to Date objects
    if (filters.dateRange) {
      filters.dateRange.start = new Date(filters.dateRange.start);
      filters.dateRange.end = new Date(filters.dateRange.end);
    }
    
    return filters;
  } catch (error) {
    console.warn('Failed to load filters from localStorage:', error);
    return null;
  }
}

/**
 * Clear filters from localStorage
 */
export function clearFiltersFromStorage(key: string): void {
  try {
    const saved = localStorage.getItem('kpi_filters');
    if (!saved) return;
    
    const existing = JSON.parse(saved);
    delete existing[key];
    
    localStorage.setItem('kpi_filters', JSON.stringify(existing));
  } catch (error) {
    console.warn('Failed to clear filters from localStorage:', error);
  }
}

