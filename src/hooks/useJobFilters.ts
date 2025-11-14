import { useMemo } from "react";
import { Job } from "./useJobs";

export type ViewMode = 'list' | 'kanban' | 'grid';
export type BudgetSort = 'high-low' | 'low-high';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface JobFilters {
  dateRange: DateRange | null;
  budgetSort: BudgetSort;
  searchTerm: string;
  projectManager: string | null;
}

export const useJobFiltering = (jobs: Job[] | undefined, filters: JobFilters): Job[] => {
  return useMemo(() => {
    if (!jobs) return [];
    
    let filtered = [...jobs];
    
    // 1. Date filter (confirmation date)
    if (filters.dateRange) {
      filtered = filtered.filter(job => {
        if (!job.date_order) return false;
        const orderDate = new Date(job.date_order);
        return orderDate >= filters.dateRange!.start && orderDate <= filters.dateRange!.end;
      });
    }
    
    // 2. Project Manager filter
    if (filters.projectManager) {
      filtered = filtered.filter(job => 
        job.project_manager_name === filters.projectManager
      );
    }
    
    // 3. Search filter
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(job => 
        job.sale_order_name?.toLowerCase().includes(search) ||
        job.customer_name?.toLowerCase().includes(search) ||
        job.opportunity_name?.toLowerCase().includes(search) ||
        job.project_manager_name?.toLowerCase().includes(search)
      );
    }
    
    // 4. Budget sort
    filtered.sort((a, b) => {
      const budgetA = a.total_budget || 0;
      const budgetB = b.total_budget || 0;
      return filters.budgetSort === 'high-low' ? budgetB - budgetA : budgetA - budgetB;
    });
    
    return filtered;
  }, [jobs, filters.dateRange, filters.projectManager, filters.searchTerm, filters.budgetSort]);
};
