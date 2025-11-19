import { useMemo } from "react";
import { Job } from "./useJobs";
import { DateRange, BudgetSort } from "./useJobFilters";

export interface JobReportsFilters {
  dateRange: DateRange | null;
  budgetSort: BudgetSort;
  searchTerm: string;
  projectManager: string | null;
  salesPerson: string | null;
  subcontractor: string | null;
  customers: string[]; // Changed to array for multi-select
  productCategory: string | null; // Changed to support specific products
  showOnlyInvoicedPOs: boolean; // Filter for jobs with invoiced purchase orders
  jobIdsWithInvoicedPOs?: Set<string>; // Set of job IDs that have invoiced POs
}

export const useJobReportsFiltering = (
  jobs: Job[] | undefined,
  filters: JobReportsFilters
): Job[] => {
  return useMemo(() => {
    if (!jobs) return [];

    let filtered = [...jobs];

    // 1. Date filter (confirmation date)
    if (filters.dateRange) {
      filtered = filtered.filter((job) => {
        if (!job.date_order) return false;
        const orderDate = new Date(job.date_order);
        return (
          orderDate >= filters.dateRange!.start && orderDate <= filters.dateRange!.end
        );
      });
    }

    // 2. Project Manager filter
    if (filters.projectManager) {
      filtered = filtered.filter(
        (job) => job.project_manager_name === filters.projectManager
      );
    }

    // 3. Sales Person filter
    if (filters.salesPerson) {
      filtered = filtered.filter((job) => job.sales_person_name === filters.salesPerson);
    }

    // 4. Subcontractor filter
    if (filters.subcontractor) {
      filtered = filtered.filter(
        (job) => job.subcontractor_name === filters.subcontractor
      );
    }

    // 5. Customer filter (multi-select)
    if (filters.customers && filters.customers.length > 0) {
      filtered = filtered.filter((job) => 
        filters.customers.includes(job.customer_name || "")
      );
    }

    // 6. Product Category filter (supports categories and specific products)
    if (filters.productCategory) {
      if (filters.productCategory === "material") {
        filtered = filtered.filter((job) => job.material_budget > job.non_material_budget);
      } else if (filters.productCategory === "service") {
        filtered = filtered.filter((job) => job.non_material_budget >= job.material_budget);
      } else if (filters.productCategory === "consumable") {
        // Filter for jobs with consumable products
        // This is a simplified filter - for accurate filtering, we'd need to query budget lines
        filtered = filtered.filter((job) => job.material_budget > 0);
      }
      // If productCategory is a specific product name, we'd need to query job_budget_lines
      // For now, we'll skip specific product filtering at this level
    }

    // 7. Invoiced POs filter
    if (filters.showOnlyInvoicedPOs && filters.jobIdsWithInvoicedPOs) {
      filtered = filtered.filter((job) => filters.jobIdsWithInvoicedPOs!.has(job.id));
    }

    // 8. Search filter
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.sale_order_name?.toLowerCase().includes(search) ||
          job.customer_name?.toLowerCase().includes(search) ||
          job.opportunity_name?.toLowerCase().includes(search) ||
          job.project_manager_name?.toLowerCase().includes(search) ||
          job.sales_person_name?.toLowerCase().includes(search) ||
          job.subcontractor_name?.toLowerCase().includes(search)
      );
    }

    // 9. Budget sort
    filtered.sort((a, b) => {
      const budgetA = a.total_budget || 0;
      const budgetB = b.total_budget || 0;
      return filters.budgetSort === "high-low" ? budgetB - budgetA : budgetA - budgetB;
    });

    return filtered;
  }, [
    jobs,
    filters.dateRange,
    filters.projectManager,
    filters.salesPerson,
    filters.subcontractor,
    filters.customers,
    filters.productCategory,
    filters.showOnlyInvoicedPOs,
    filters.jobIdsWithInvoicedPOs,
    filters.searchTerm,
    filters.budgetSort,
  ]);
};

