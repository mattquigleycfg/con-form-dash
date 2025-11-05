import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface SalespersonTarget {
  id: string;
  user_id: string;
  salesperson_name: string;
  financial_year: string;
  period_type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period_name: string;
  period_start_date: string;
  period_end_date: string;
  cfg_sales_target: number;
  cfg_invoice_target: number | null;
  cfg_sales_actual: number | null;
  cfg_invoice_actual: number | null;
  cfg_sales_variance: number | null;
  cfg_invoice_variance: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Match the names from Odoo to ensure consistency
export const SALESPEOPLE = ['Adam Ford', 'Joel Boustani', 'Mitch Lavelle'] as const;
export type SalespersonName = typeof SALESPEOPLE[number];

interface UseSalespersonTargetsOptions {
  financialYear?: string;
  periodType?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  salesperson?: SalespersonName;
}

export const useSalespersonTargets = (options?: UseSalespersonTargetsOptions) => {
  const [targets, setTargets] = useState<SalespersonTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTargets = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("salesperson_targets")
        .select("*")
        .order("period_start_date", { ascending: true });

      if (options?.financialYear) {
        query = query.eq("financial_year", options.financialYear);
      }

      if (options?.periodType) {
        query = query.eq("period_type", options.periodType);
      }

      if (options?.salesperson) {
        query = query.eq("salesperson_name", options.salesperson);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTargets(data || []);
    } catch (error: any) {
      console.error("Error fetching salesperson targets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch salesperson targets",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTargets();
    }
  }, [user, options?.financialYear, options?.periodType, options?.salesperson]);

  const createTarget = async (targetData: Omit<SalespersonTarget, "id" | "user_id" | "created_at" | "updated_at" | "cfg_sales_variance" | "cfg_invoice_variance">) => {
    try {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("salesperson_targets")
        .insert([{ ...targetData, user_id: user.id }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Salesperson target created successfully",
      });

      fetchTargets();
    } catch (error: any) {
      console.error("Error creating salesperson target:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create salesperson target",
        variant: "destructive",
      });
    }
  };

  const updateTarget = async (id: string, targetData: Partial<SalespersonTarget>) => {
    try {
      const { error } = await supabase
        .from("salesperson_targets")
        .update(targetData)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Salesperson target updated successfully",
      });

      fetchTargets();
    } catch (error: any) {
      console.error("Error updating salesperson target:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update salesperson target",
        variant: "destructive",
      });
    }
  };

  const deleteTarget = async (id: string) => {
    try {
      const { error } = await supabase
        .from("salesperson_targets")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Salesperson target deleted successfully",
      });

      fetchTargets();
    } catch (error: any) {
      console.error("Error deleting salesperson target:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete salesperson target",
        variant: "destructive",
      });
    }
  };

  const syncActualsFromOdoo = async (financialYear: string) => {
    try {
      if (!user) throw new Error("User not authenticated");

      toast({
        title: "Syncing...",
        description: "Fetching actual sales data from Odoo",
      });

      // Fetch all sales orders from Odoo
      const { data: salesOrders, error: odooError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            [
              ['state', 'in', ['sale', 'done']], // Only confirmed orders
              ['date_order', '>=', '2025-07-01'], // FY25-26 start
              ['date_order', '<=', '2026-06-30'], // FY25-26 end
            ],
            ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state', 'user_id']
          ]
        }
      });

      if (odooError) throw odooError;

      // Fetch current salesperson targets
      const { data: targets, error: targetsError } = await supabase
        .from("salesperson_targets")
        .select("*")
        .eq("financial_year", financialYear);

      if (targetsError) throw targetsError;

      // Map Odoo sales by salesperson and period
      const salesBySalesperson: Record<string, Record<string, number>> = {};

      (salesOrders || []).forEach((order: any) => {
        if (!order.user_id) return;
        
        const salesPersonName = order.user_id[1]; // Get name from [id, name] tuple
        const orderDate = new Date(order.date_order);
        const amount = order.amount_total;

        // Only process our 3 salespeople
        if (!SALESPEOPLE.includes(salesPersonName as any)) return;

        if (!salesBySalesperson[salesPersonName]) {
          salesBySalesperson[salesPersonName] = {};
        }

        // Calculate period keys
        const year = orderDate.getFullYear();
        const month = orderDate.getMonth();
        const monthKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          .replace(' ', '-'); // e.g., "Jul-25"

        // Determine quarter
        let quarter = 'Q1';
        if (month >= 6 && month <= 8) quarter = 'Q1'; // Jul-Sep
        else if (month >= 9 && month <= 11) quarter = 'Q2'; // Oct-Dec
        else if (month >= 0 && month <= 2) quarter = 'Q3'; // Jan-Mar
        else quarter = 'Q4'; // Apr-Jun

        // Accumulate sales
        const yearKey = financialYear;
        
        if (!salesBySalesperson[salesPersonName][monthKey]) {
          salesBySalesperson[salesPersonName][monthKey] = 0;
        }
        if (!salesBySalesperson[salesPersonName][quarter]) {
          salesBySalesperson[salesPersonName][quarter] = 0;
        }
        if (!salesBySalesperson[salesPersonName][yearKey]) {
          salesBySalesperson[salesPersonName][yearKey] = 0;
        }

        salesBySalesperson[salesPersonName][monthKey] += amount;
        salesBySalesperson[salesPersonName][quarter] += amount;
        salesBySalesperson[salesPersonName][yearKey] += amount;
      });

      // Update targets with actuals
      const updates = [];
      for (const target of targets || []) {
        const salesData = salesBySalesperson[target.salesperson_name];
        if (!salesData) continue;

        let actual = 0;
        if (target.period_type === 'monthly') {
          actual = salesData[target.period_name] || 0;
        } else if (target.period_type === 'quarterly') {
          actual = salesData[target.period_name] || 0;
        } else if (target.period_type === 'yearly') {
          actual = salesData[target.period_name] || 0;
        }

        if (actual > 0 || target.cfg_sales_actual !== null) {
          updates.push({
            id: target.id,
            cfg_sales_actual: actual,
          });
        }
      }

      // Batch update
      for (const update of updates) {
        await supabase
          .from("salesperson_targets")
          .update({ cfg_sales_actual: update.cfg_sales_actual })
          .eq("id", update.id);
      }

      toast({
        title: "Success",
        description: `Updated ${updates.length} salesperson targets with Odoo actuals`,
      });

      fetchTargets();
    } catch (error: any) {
      console.error("Error syncing actuals from Odoo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync actuals from Odoo",
        variant: "destructive",
      });
    }
  };

  const generateTargetsFromMonthly = async (financialYear: string) => {
    try {
      if (!user) throw new Error("User not authenticated");

      // Fetch monthly targets for CFG
      const { data: monthlyTargets, error: fetchError } = await supabase
        .from("monthly_targets")
        .select("*")
        .eq("financial_year", financialYear)
        .order("month_date", { ascending: true });

      if (fetchError) throw fetchError;

      if (!monthlyTargets || monthlyTargets.length === 0) {
        throw new Error("No monthly targets found for this financial year");
      }

      const salespersonTargets: any[] = [];

      // Generate targets for each salesperson (divide by 3)
      for (const salesperson of SALESPEOPLE) {
        // Monthly targets
        for (const monthlyTarget of monthlyTargets) {
          const monthDate = new Date(monthlyTarget.month_date);
          const endDate = new Date(monthDate);
          endDate.setMonth(endDate.getMonth() + 1);
          endDate.setDate(0); // Last day of month

          salespersonTargets.push({
            user_id: user.id,
            salesperson_name: salesperson,
            financial_year: financialYear,
            period_type: 'monthly',
            period_name: monthlyTarget.month,
            period_start_date: monthlyTarget.month_date,
            period_end_date: endDate.toISOString().split('T')[0],
            cfg_sales_target: Math.round(monthlyTarget.cfg_sales_target / 3),
            cfg_invoice_target: Math.round((monthlyTarget.cfg_invoice_target || 0) / 3),
            cfg_sales_actual: 0,
            cfg_invoice_actual: 0,
          });
        }
      }

      // Calculate quarterly targets
      const quarters = [
        { name: 'Q1', months: ['Jul', 'Aug', 'Sep'], startMonth: 7 },
        { name: 'Q2', months: ['Oct', 'Nov', 'Dec'], startMonth: 10 },
        { name: 'Q3', months: ['Jan', 'Feb', 'Mar'], startMonth: 1 },
        { name: 'Q4', months: ['Apr', 'May', 'Jun'], startMonth: 4 },
      ];

      for (const salesperson of SALESPEOPLE) {
        for (const quarter of quarters) {
          const quarterTargets = monthlyTargets.filter(mt => 
            quarter.months.some(m => mt.month.startsWith(m))
          );

          if (quarterTargets.length > 0) {
            const totalSales = quarterTargets.reduce((sum, t) => sum + t.cfg_sales_target, 0);
            const totalInvoice = quarterTargets.reduce((sum, t) => sum + (t.cfg_invoice_target || 0), 0);
            
            const firstMonth = quarterTargets[0].month_date;
            const lastMonth = quarterTargets[quarterTargets.length - 1].month_date;
            const endDate = new Date(lastMonth);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0);

            salespersonTargets.push({
              user_id: user.id,
              salesperson_name: salesperson,
              financial_year: financialYear,
              period_type: 'quarterly',
              period_name: quarter.name,
              period_start_date: firstMonth,
              period_end_date: endDate.toISOString().split('T')[0],
              cfg_sales_target: Math.round(totalSales / 3),
              cfg_invoice_target: Math.round(totalInvoice / 3),
              cfg_sales_actual: 0,
              cfg_invoice_actual: 0,
            });
          }
        }

        // Yearly target
        const yearTotalSales = monthlyTargets.reduce((sum, t) => sum + t.cfg_sales_target, 0);
        const yearTotalInvoice = monthlyTargets.reduce((sum, t) => sum + (t.cfg_invoice_target || 0), 0);
        const firstDate = monthlyTargets[0].month_date;
        const lastDate = monthlyTargets[monthlyTargets.length - 1].month_date;
        const yearEndDate = new Date(lastDate);
        yearEndDate.setMonth(yearEndDate.getMonth() + 1);
        yearEndDate.setDate(0);

        salespersonTargets.push({
          user_id: user.id,
          salesperson_name: salesperson,
          financial_year: financialYear,
          period_type: 'yearly',
          period_name: financialYear,
          period_start_date: firstDate,
          period_end_date: yearEndDate.toISOString().split('T')[0],
          cfg_sales_target: Math.round(yearTotalSales / 3),
          cfg_invoice_target: Math.round(yearTotalInvoice / 3),
          cfg_sales_actual: 0,
          cfg_invoice_actual: 0,
        });
      }

      // Insert all targets (upsert to avoid duplicates)
      const { error } = await supabase
        .from("salesperson_targets")
        .upsert(salespersonTargets, {
          onConflict: "user_id,salesperson_name,financial_year,period_type,period_name",
          ignoreDuplicates: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Generated targets for ${SALESPEOPLE.join(', ')}`,
      });

      fetchTargets();
    } catch (error: any) {
      console.error("Error generating salesperson targets:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate salesperson targets",
        variant: "destructive",
      });
    }
  };

  return {
    targets,
    isLoading,
    createTarget,
    updateTarget,
    deleteTarget,
    generateTargetsFromMonthly,
    syncActualsFromOdoo,
    fetchTargets,
  };
};

