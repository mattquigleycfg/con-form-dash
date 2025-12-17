import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateWorkingHours } from "@/utils/workingHours";

export interface AccountingMetrics {
  arDays: number;          // Average days to receive payment (Accounts Receivable)
  apDays: number;          // Average days to pay suppliers (Accounts Payable)
  invoicing: {
    totalInvoices: number;        // Total customer invoices
    paidInvoices: number;         // Paid customer invoices
    outstandingInvoices: number;  // Outstanding customer invoices
    totalRevenue: number;         // Total revenue from all invoices
  };
  totalARAmount: number;   // Total outstanding receivables
  totalAPAmount: number;   // Total outstanding payables
}

interface AccountMove {
  id: number;
  name: string;
  move_type: string; // 'out_invoice', 'in_invoice', 'out_refund', 'in_refund'
  state: string; // 'draft', 'posted', 'cancel'
  invoice_date: string | false;
  invoice_date_due: string | false;
  invoice_payment_state: string; // 'not_paid', 'in_payment', 'paid', 'partial'
  amount_total: number;
  amount_residual: number; // Outstanding amount
  payment_state: string;
}

interface AccountPayment {
  id: number;
  date: string;
  amount: number;
  payment_type: string; // 'inbound', 'outbound'
  partner_id: [number, string] | false;
  state: string;
}

/**
 * Fetch customer invoices (AR)
 */
async function fetchCustomerInvoices(): Promise<AccountMove[]> {
  const requestBody = {
    model: "account.move",
    method: "search_read",
    args: [
      [
        ["move_type", "=", "out_invoice"],
        ["state", "=", "posted"],
        ["invoice_date", ">=", "2024-01-01"],
      ],
      [
        "id",
        "name",
        "move_type",
        "state",
        "invoice_date",
        "invoice_date_due",
        "invoice_payment_state",
        "amount_total",
        "amount_residual",
        "payment_state",
      ],
    ],
    kwargs: {
      order: "invoice_date desc",
      limit: 1000,
    },
  };
  
  console.log("fetchCustomerInvoices request:", JSON.stringify(requestBody, null, 2));
  
  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: requestBody,
  });

  if (error) {
    console.error("fetchCustomerInvoices error:", error);
    throw error;
  }
  
  console.log("fetchCustomerInvoices success:", data ? `${data.length} invoices` : 'no data');
  return data as AccountMove[];
}

/**
 * Fetch supplier bills (AP)
 */
async function fetchSupplierBills(): Promise<AccountMove[]> {
  const requestBody = {
    model: "account.move",
    method: "search_read",
    args: [
      [
        ["move_type", "=", "in_invoice"],
        ["state", "=", "posted"],
        ["invoice_date", ">=", "2024-01-01"],
      ],
      [
        "id",
        "name",
        "move_type",
        "state",
        "invoice_date",
        "invoice_date_due",
        "invoice_payment_state",
        "amount_total",
        "amount_residual",
        "payment_state",
      ],
    ],
    kwargs: {
      order: "invoice_date desc",
      limit: 1000,
    },
  };
  
  console.log("fetchSupplierBills request:", JSON.stringify(requestBody, null, 2));
  
  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: requestBody,
  });

  if (error) {
    console.error("fetchSupplierBills error:", error);
    throw error;
  }
  
  console.log("fetchSupplierBills success:", data ? `${data.length} bills` : 'no data');
  return data as AccountMove[];
}

/**
 * Calculate AR Days (Days Sales Outstanding)
 * Average time to collect payment from customers
 */
function calculateARDays(invoices: AccountMove[]): number {
  const paidInvoices = invoices.filter(
    (inv) => inv.invoice_payment_state === "paid" && inv.invoice_date && inv.invoice_date_due
  );

  if (paidInvoices.length === 0) return 0;

  const daysList: number[] = [];

  paidInvoices.forEach((inv) => {
    if (inv.invoice_date && inv.invoice_date_due) {
      // Calculate days from invoice date to due date
      // In practice, you'd want the actual payment date, but Odoo doesn't directly expose this
      // We'll use a simpler calculation: days from invoice date to today for unpaid, or average payment terms
      const invoiceDate = new Date(inv.invoice_date);
      const dueDate = new Date(inv.invoice_date_due);
      const days = Math.floor(
        (dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      daysList.push(Math.max(0, days));
    }
  });

  const avgDays = daysList.length > 0 
    ? daysList.reduce((sum, days) => sum + days, 0) / daysList.length 
    : 0;

  return Math.round(avgDays);
}

/**
 * Calculate AP Days (Days Payable Outstanding)
 * Average time to pay suppliers
 */
function calculateAPDays(bills: AccountMove[]): number {
  const paidBills = bills.filter(
    (bill) => bill.invoice_payment_state === "paid" && bill.invoice_date && bill.invoice_date_due
  );

  if (paidBills.length === 0) return 0;

  const daysList: number[] = [];

  paidBills.forEach((bill) => {
    if (bill.invoice_date && bill.invoice_date_due) {
      const billDate = new Date(bill.invoice_date);
      const dueDate = new Date(bill.invoice_date_due);
      const days = Math.floor(
        (dueDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      daysList.push(Math.max(0, days));
    }
  });

  const avgDays = daysList.length > 0 
    ? daysList.reduce((sum, days) => sum + days, 0) / daysList.length 
    : 0;

  return Math.round(avgDays);
}

/**
 * Calculate invoicing metrics
 */
function calculateInvoicingMetrics(invoices: AccountMove[]) {
  const totalInvoices = invoices.length;
  
  const paidInvoices = invoices.filter(
    (inv) => inv.invoice_payment_state === "paid"
  ).length;

  const outstandingInvoices = invoices.filter(
    (inv) => inv.invoice_payment_state !== "paid"
  ).length;

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount_total, 0);

  const totalARAmount = invoices
    .filter((inv) => inv.invoice_payment_state !== "paid")
    .reduce((sum, inv) => sum + inv.amount_residual, 0);

  return { 
    totalInvoices,
    paidInvoices, 
    outstandingInvoices, 
    totalRevenue,
    totalARAmount 
  };
}

/**
 * Main hook to fetch accounting metrics
 * Note: startDate and endDate parameters are accepted but currently not used
 * The hook fetches data from 2024-01-01 onwards
 */
export function useOdooAccounting(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["odoo-accounting", startDate, endDate],
    queryFn: async (): Promise<AccountingMetrics> => {
      // Fetch customer invoices and supplier bills in parallel
      const [customerInvoices, supplierBills] = await Promise.all([
        fetchCustomerInvoices(),
        fetchSupplierBills(),
      ]);

      // Calculate metrics
      const arDays = calculateARDays(customerInvoices);
      const apDays = calculateAPDays(supplierBills);
      const { totalInvoices, paidInvoices, outstandingInvoices, totalRevenue, totalARAmount } = calculateInvoicingMetrics(customerInvoices);

      const totalAPAmount = supplierBills
        .filter((bill) => bill.invoice_payment_state !== "paid")
        .reduce((sum, bill) => sum + bill.amount_residual, 0);

      return {
        arDays,
        apDays,
        invoicing: {
          totalInvoices,
          paidInvoices,
          outstandingInvoices,
          totalRevenue,
        },
        totalARAmount,
        totalAPAmount,
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 15, // Auto-refresh every 15 minutes
  });
}
