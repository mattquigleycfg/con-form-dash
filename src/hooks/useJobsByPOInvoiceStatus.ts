import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Job } from "./useJobs";

/**
 * Hook to fetch jobs grouped by their purchase order invoice status
 * Queries Odoo for POs with different invoice_status values and groups by analytic account
 */
export const useJobsByPOInvoiceStatus = (jobs: Job[] | undefined) => {
  return useQuery({
    queryKey: ["jobs-by-po-invoice-status"],
    queryFn: async () => {
      // Query all purchase orders grouped by invoice status
      const { data, error } = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "purchase.order",
          method: "search_read",
          args: [
            [
              ["state", "in", ["purchase", "done"]],
            ],
            ["id", "name", "analytic_account_id", "invoice_status"],
            0,
            0, // No limit - get all POs
          ],
        },
      });

      if (error) throw error;

      // Group analytic account IDs by invoice status
      const analyticAccountsByStatus = {
        no: new Set<number>(),
        toInvoice: new Set<number>(),
        invoiced: new Set<number>(),
      };
      
      if (data && Array.isArray(data)) {
        data.forEach((po: any) => {
          let analyticAccountId: number | null = null;
          
          if (po.analytic_account_id && typeof po.analytic_account_id === 'number') {
            analyticAccountId = po.analytic_account_id;
          } else if (Array.isArray(po.analytic_account_id) && po.analytic_account_id[0]) {
            analyticAccountId = po.analytic_account_id[0];
          }

          if (analyticAccountId) {
            const status = po.invoice_status;
            if (status === 'no') {
              analyticAccountsByStatus.no.add(analyticAccountId);
            } else if (status === 'to invoice') {
              analyticAccountsByStatus.toInvoice.add(analyticAccountId);
            } else if (status === 'invoiced') {
              analyticAccountsByStatus.invoiced.add(analyticAccountId);
            }
          }
        });
      }

      // Create Sets of job IDs for each invoice status
      const jobIdsByStatus = {
        no: new Set<string>(),
        toInvoice: new Set<string>(),
        invoiced: new Set<string>(),
      };
      
      jobs?.forEach(job => {
        if (job.analytic_account_id) {
          if (analyticAccountsByStatus.no.has(job.analytic_account_id)) {
            jobIdsByStatus.no.add(job.id);
          }
          if (analyticAccountsByStatus.toInvoice.has(job.analytic_account_id)) {
            jobIdsByStatus.toInvoice.add(job.id);
          }
          if (analyticAccountsByStatus.invoiced.has(job.analytic_account_id)) {
            jobIdsByStatus.invoiced.add(job.id);
          }
        }
      });

      return {
        analyticAccountsByStatus,
        jobIdsByStatus,
        purchaseOrderCount: data?.length || 0,
      };
    },
    enabled: !!jobs && jobs.length > 0,
    staleTime: 60000, // Cache for 1 minute
    refetchInterval: 120000, // Refetch every 2 minutes
  });
};

