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
  customer: string | null;
  productCategory: "all" | "material" | "service";
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

    // 5. Customer filter
    if (filters.customer) {
      filtered = filtered.filter((job) => job.customer_name === filters.customer);
    }

    // 6. Product Category filter (based on predominant budget type)
    if (filters.productCategory !== "all") {
      filtered = filtered.filter((job) => {
        if (filters.productCategory === "material") {
          return job.material_budget > job.non_material_budget;
        } else {
          return job.non_material_budget >= job.material_budget;
        }
      });
    }

    // 7. Search filter
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

    // 8. Budget sort
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
    filters.customer,
    filters.productCategory,
    filters.searchTerm,
    filters.budgetSort,
  ]);
};

