import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFilters } from "@/contexts/FilterContext";

export interface AccountingMetrics {
  currentIncome: number;
  currentIncomeChange: number;
  receivables: number;
  currentExpense: number;
  currentExpenseChange: number;
  payables: number;
}

export interface InvoiceData {
  month: string;
  amount: number;
}

export interface Invoice {
  id: number;
  reference: string;
  salesperson: string;
  status: string;
  customer: string;
  date: string;
  amount: number;
}

export const useOdooAccounting = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<AccountingMetrics>({
    currentIncome: 0,
    currentIncomeChange: 0,
    receivables: 0,
    currentExpense: 0,
    currentExpenseChange: 0,
    payables: 0,
  });
  const [invoiceData, setInvoiceData] = useState<InvoiceData[]>([]);
  const [topInvoices, setTopInvoices] = useState<Invoice[]>([]);
  const { toast } = useToast();
  const { filters } = useFilters();

  const fetchAccountingData = async () => {
    setIsLoading(true);
    
    try {
      // Fetch all account moves (invoices, bills, etc.)
      const { data: accountMoves, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'account.move',
          method: 'search_read',
          args: [
            [
              ['state', '=', 'posted'],
              ['move_type', 'in', ['out_invoice', 'in_invoice']],
            ],
            ['name', 'amount_total', 'amount_residual', 'partner_id', 'invoice_date', 'move_type', 'payment_state', 'invoice_user_id']
          ]
        }
      });

      if (error) throw error;

      const moves = accountMoves || [];
      
      // Calculate metrics
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Current period invoices (outgoing)
      const currentPeriodInvoices = moves.filter((m: any) => 
        m.move_type === 'out_invoice' && 
        new Date(m.invoice_date) >= thisMonth
      );
      
      const lastPeriodInvoices = moves.filter((m: any) => 
        m.move_type === 'out_invoice' && 
        new Date(m.invoice_date) >= lastMonth &&
        new Date(m.invoice_date) < thisMonth
      );

      // Current period bills (incoming expenses)
      const currentPeriodBills = moves.filter((m: any) => 
        m.move_type === 'in_invoice' && 
        new Date(m.invoice_date) >= thisMonth
      );
      
      const lastPeriodBills = moves.filter((m: any) => 
        m.move_type === 'in_invoice' && 
        new Date(m.invoice_date) >= lastMonth &&
        new Date(m.invoice_date) < thisMonth
      );

      const currentIncome = currentPeriodInvoices.reduce((sum: number, m: any) => sum + m.amount_total, 0);
      const lastIncome = lastPeriodInvoices.reduce((sum: number, m: any) => sum + m.amount_total, 0);
      const currentExpense = currentPeriodBills.reduce((sum: number, m: any) => sum + m.amount_total, 0);
      const lastExpense = lastPeriodBills.reduce((sum: number, m: any) => sum + m.amount_total, 0);

      // Receivables and Payables (unpaid amounts)
      const receivables = moves
        .filter((m: any) => m.move_type === 'out_invoice' && m.amount_residual > 0)
        .reduce((sum: number, m: any) => sum + m.amount_residual, 0);
      
      const payables = moves
        .filter((m: any) => m.move_type === 'in_invoice' && m.amount_residual > 0)
        .reduce((sum: number, m: any) => sum + m.amount_residual, 0);

      setMetrics({
        currentIncome,
        currentIncomeChange: lastIncome ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0,
        receivables,
        currentExpense,
        currentExpenseChange: lastExpense ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0,
        payables,
      });

      // Aggregate invoiced by month
      const monthlyData: Record<string, number> = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      moves
        .filter((m: any) => m.move_type === 'out_invoice')
        .forEach((move: any) => {
          const date = new Date(move.invoice_date);
          const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + move.amount_total;
        });

      const invoiceChartData = Object.entries(monthlyData)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => {
          const [aMonth, aYear] = a.month.split(' ');
          const [bMonth, bYear] = b.month.split(' ');
          return (
            parseInt(aYear) - parseInt(bYear) ||
            monthNames.indexOf(aMonth) - monthNames.indexOf(bMonth)
          );
        })
        .slice(-6);

      setInvoiceData(invoiceChartData);

      // Top invoices
      const sortedInvoices = moves
        .filter((m: any) => m.move_type === 'out_invoice')
        .sort((a: any, b: any) => b.amount_total - a.amount_total)
        .slice(0, 10)
        .map((m: any) => ({
          id: m.id,
          reference: m.name,
          salesperson: m.invoice_user_id?.[1] || 'N/A',
          status: m.payment_state === 'paid' ? 'Paid' : 
                  m.payment_state === 'partial' ? 'Partially Paid' : 'Not Paid',
          customer: m.partner_id?.[1] || 'Unknown',
          date: m.invoice_date,
          amount: m.amount_total,
        }));

      setTopInvoices(sortedInvoices);

    } catch (error) {
      console.error('Accounting sync error:', error);
      toast({
        title: "Accounting sync failed",
        description: error instanceof Error ? error.message : "Failed to sync accounting data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, []);

  return { 
    metrics, 
    invoiceData, 
    topInvoices, 
    isLoading, 
    refetch: fetchAccountingData 
  };
};
