import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface MonthlyTarget {
  id: string;
  user_id: string;
  financial_year: string;
  month: string;
  month_date: string;
  cfg_sales_target: number;
  cfg_invoice_target: number;
  dsf_sales_target: number;
  dsf_invoice_target: number;
  cfg_sales_actual: number | null;
  cfg_invoice_actual: number | null;
  dsf_sales_actual: number | null;
  dsf_invoice_actual: number | null;
  cfg_sales_variance: number | null;
  cfg_invoice_variance: number | null;
  dsf_sales_variance: number | null;
  dsf_invoice_variance: number | null;
  total_sales_target: number;
  total_invoice_target: number;
  total_sales_actual: number;
  total_invoice_actual: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useMonthlyTargets = (financialYear?: string) => {
  const [targets, setTargets] = useState<MonthlyTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTargets = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from("monthly_targets")
        .select("*")
        .order("month_date", { ascending: true });

      if (financialYear) {
        query = query.eq("financial_year", financialYear);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTargets(data || []);
    } catch (error: any) {
      console.error("Error fetching monthly targets:", error);
      toast({
        title: "Error",
        description: "Failed to fetch monthly targets",
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
  }, [user, financialYear]);

  const createTarget = async (targetData: Omit<MonthlyTarget, "id" | "user_id" | "created_at" | "updated_at" | "cfg_sales_variance" | "cfg_invoice_variance" | "dsf_sales_variance" | "dsf_invoice_variance" | "total_sales_target" | "total_invoice_target" | "total_sales_actual" | "total_invoice_actual">) => {
    try {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("monthly_targets")
        .insert([{ ...targetData, user_id: user.id }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monthly target created successfully",
      });

      fetchTargets();
    } catch (error: any) {
      console.error("Error creating monthly target:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create monthly target",
        variant: "destructive",
      });
    }
  };

  const updateTarget = async (id: string, targetData: Partial<MonthlyTarget>) => {
    try {
      const { error } = await supabase
        .from("monthly_targets")
        .update(targetData)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monthly target updated successfully",
      });

      fetchTargets();
    } catch (error: any) {
      console.error("Error updating monthly target:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update monthly target",
        variant: "destructive",
      });
    }
  };

  const deleteTarget = async (id: string) => {
    try {
      const { error } = await supabase
        .from("monthly_targets")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monthly target deleted successfully",
      });

      fetchTargets();
    } catch (error: any) {
      console.error("Error deleting monthly target:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete monthly target",
        variant: "destructive",
      });
    }
  };

  const seedFY2526Data = async () => {
    try {
      if (!user) throw new Error("User not authenticated");

      // Data from Monthly Targets sheet in Excel with actuals
      const fy2526Data = [
        { month: "Jul-25", date: "2025-07-01", cfg_sales: 1850000, cfg_invoice: 1700000, dsf_sales: 50000, dsf_invoice: 80000, cfg_sales_actual: 1433486.41, cfg_invoice_actual: 1449803.33, dsf_sales_actual: 62713.79, dsf_invoice_actual: 58117.54 },
        { month: "Aug-25", date: "2025-08-01", cfg_sales: 1850000, cfg_invoice: 1800000, dsf_sales: 100000, dsf_invoice: 80000, cfg_sales_actual: 1739394.50, cfg_invoice_actual: 1518861.00, dsf_sales_actual: 135048.78, dsf_invoice_actual: 98049.90 },
        { month: "Sep-25", date: "2025-09-01", cfg_sales: 1900000, cfg_invoice: 1800000, dsf_sales: 100000, dsf_invoice: 80000, cfg_sales_actual: 2497078.50, cfg_invoice_actual: 684748.40, dsf_sales_actual: 63562.12, dsf_invoice_actual: 49612.10 },
        { month: "Oct-25", date: "2025-10-01", cfg_sales: 1900000, cfg_invoice: 1800000, dsf_sales: 150000, dsf_invoice: 120000, cfg_sales_actual: 613773.71, cfg_invoice_actual: 0, dsf_sales_actual: 76828.36, dsf_invoice_actual: 0 },
        { month: "Nov-25", date: "2025-11-01", cfg_sales: 1900000, cfg_invoice: 1800000, dsf_sales: 150000, dsf_invoice: 120000, cfg_sales_actual: 0, cfg_invoice_actual: 0, dsf_sales_actual: 0, dsf_invoice_actual: 0 },
        { month: "Dec-25", date: "2025-12-01", cfg_sales: 1400000, cfg_invoice: 1200000, dsf_sales: 100000, dsf_invoice: 100000, cfg_sales_actual: 0, cfg_invoice_actual: 0, dsf_sales_actual: 0, dsf_invoice_actual: 0 },
        { month: "Jan-26", date: "2026-01-01", cfg_sales: 1200000, cfg_invoice: 950000, dsf_sales: 50000, dsf_invoice: 50000, cfg_sales_actual: 0, cfg_invoice_actual: 0, dsf_sales_actual: 0, dsf_invoice_actual: 0 },
        { month: "Feb-26", date: "2026-02-01", cfg_sales: 2100000, cfg_invoice: 2000000, dsf_sales: 200000, dsf_invoice: 200000, cfg_sales_actual: 0, cfg_invoice_actual: 0, dsf_sales_actual: 0, dsf_invoice_actual: 0 },
        { month: "Mar-26", date: "2026-03-01", cfg_sales: 2100000, cfg_invoice: 2000000, dsf_sales: 250000, dsf_invoice: 220000, cfg_sales_actual: 0, cfg_invoice_actual: 0, dsf_sales_actual: 0, dsf_invoice_actual: 0 },
        { month: "Apr-26", date: "2026-04-01", cfg_sales: 2250000, cfg_invoice: 2000000, dsf_sales: 300000, dsf_invoice: 270000, cfg_sales_actual: 0, cfg_invoice_actual: 0, dsf_sales_actual: 0, dsf_invoice_actual: 0 },
        { month: "May-26", date: "2026-05-01", cfg_sales: 2300000, cfg_invoice: 2000000, dsf_sales: 300000, dsf_invoice: 280000, cfg_sales_actual: 0, cfg_invoice_actual: 0, dsf_sales_actual: 0, dsf_invoice_actual: 0 },
        { month: "Jun-26", date: "2026-06-01", cfg_sales: 2250000, cfg_invoice: 1950000, dsf_sales: 250000, dsf_invoice: 200000, cfg_sales_actual: 0, cfg_invoice_actual: 0, dsf_sales_actual: 0, dsf_invoice_actual: 0 },
      ];

      const dataToInsert = fy2526Data.map(row => ({
        user_id: user.id,
        financial_year: "FY25-26",
        month: row.month,
        month_date: row.date,
        cfg_sales_target: row.cfg_sales,
        cfg_invoice_target: row.cfg_invoice,
        dsf_sales_target: row.dsf_sales,
        dsf_invoice_target: row.dsf_invoice,
        cfg_sales_actual: row.cfg_sales_actual,
        cfg_invoice_actual: row.cfg_invoice_actual,
        dsf_sales_actual: row.dsf_sales_actual,
        dsf_invoice_actual: row.dsf_invoice_actual,
      }));

      const { error } = await supabase
        .from("monthly_targets")
        .upsert(dataToInsert, {
          onConflict: "user_id,financial_year,month_date",
          ignoreDuplicates: false,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "FY25-26 targets seeded successfully",
      });

      fetchTargets();
    } catch (error: any) {
      console.error("Error seeding FY25-26 data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to seed FY25-26 data",
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
    fetchTargets,
  };
};
