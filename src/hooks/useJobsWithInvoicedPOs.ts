import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Job } from "./useJobs";

/**
 * Hook to fetch jobs that have invoiced purchase orders
 * Queries Odoo for POs with invoice_status = 'invoiced' and groups by analytic account
 */
export const useJobsWithInvoicedPOs = (jobs: Job[] | undefined) => {
  return useQuery({
    queryKey: ["jobs-with-invoiced-pos"],
    queryFn: async () => {
      // Query all purchase orders with invoiced status
      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "purchase.order",
          method: "search_read",
          args: [
            [
              ["invoice_status", "=", "invoiced"],
              ["state", "in", ["purchase", "done"]],
            ],
            ["id", "name", "analytic_account_id"],
            0,
            0, // No limit - get all invoiced POs
          ],
        },
      });

      if (error) throw error;

      // Extract unique analytic account IDs that have invoiced POs
      const analyticAccountIds = new Set<number>();
      
      if (data && Array.isArray(data)) {
        data.forEach((po: any) => {
          if (po.analytic_account_id && typeof po.analytic_account_id === 'number') {
            analyticAccountIds.add(po.analytic_account_id);
          } else if (Array.isArray(po.analytic_account_id) && po.analytic_account_id[0]) {
            analyticAccountIds.add(po.analytic_account_id[0]);
          }
        });
      }

      // Create a Set of job IDs that have invoiced POs
      const jobIdsWithInvoicedPOs = new Set<string>();
      
      jobs?.forEach(job => {
        if (job.analytic_account_id && analyticAccountIds.has(job.analytic_account_id)) {
          jobIdsWithInvoicedPOs.add(job.id);
        }
      });

      return {
        analyticAccountIds,
        jobIdsWithInvoicedPOs,
        purchaseOrderCount: data?.length || 0,
      };
    },
    enabled: !!jobs && jobs.length > 0,
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
};

