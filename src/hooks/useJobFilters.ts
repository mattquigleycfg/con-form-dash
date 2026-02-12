import { useMemo } from "react";
import { Job } from "./useJobs";

export type ViewMode = 'list' | 'kanban' | 'grid';
export type BudgetSort = 'high-low' | 'low-high';
export type BudgetFilter = 'all' | 'overBudget' | 'atRisk';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface JobFilters {
  dateRange: DateRange | null;
  budgetSort: BudgetSort;
  searchTerm: string;
  projectManager: string | null;
  stage: string | null;
  subcontractor: string | null;
  budgetFilter: BudgetFilter;
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
    
    // 2. Project Manager filter (case-insensitive, trimmed)
    if (filters.projectManager) {
      const pmFilter = filters.projectManager.trim().toLowerCase();
      filtered = filtered.filter(job => 
        job.project_manager_name?.trim().toLowerCase() === pmFilter
      );
    }
    
    // 3. Stage filter (case-insensitive, trimmed)
    if (filters.stage) {
      const stageFilter = filters.stage.trim().toLowerCase();
      filtered = filtered.filter(job => 
        job.project_stage_name?.trim().toLowerCase() === stageFilter
      );
    }
    
    // 4. Subcontractor filter (case-insensitive, trimmed)
    if (filters.subcontractor) {
      const subFilter = filters.subcontractor.trim().toLowerCase();
      filtered = filtered.filter(job => 
        job.subcontractor_name?.trim().toLowerCase() === subFilter
      );
    }
    
    // 5. Budget status filter (Over Budget / At Risk)
    if (filters.budgetFilter !== 'all') {
      filtered = filtered.filter(job => {
        const util = job.total_budget > 0 ? (job.total_actual / job.total_budget) * 100 : 0;
        if (filters.budgetFilter === 'overBudget') return util > 100;
        if (filters.budgetFilter === 'atRisk') return util > 80 && util <= 100;
        return true;
      });
    }
    
    // 6. Search filter
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(job => 
        job.sale_order_name?.toLowerCase().includes(search) ||
        job.customer_name?.toLowerCase().includes(search) ||
        job.opportunity_name?.toLowerCase().includes(search) ||
        job.project_manager_name?.toLowerCase().includes(search)
      );
    }
    
    // 7. Budget sort
    filtered.sort((a, b) => {
      const budgetA = a.total_budget || 0;
      const budgetB = b.total_budget || 0;
      return filters.budgetSort === 'high-low' ? budgetB - budgetA : budgetA - budgetB;
    });
    
    return filtered;
  }, [jobs, filters.dateRange, filters.projectManager, filters.stage, filters.subcontractor, filters.budgetFilter, filters.searchTerm, filters.budgetSort]);
};
