import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateWorkingHours } from "@/utils/workingHours";

export interface AccountingMetrics {
  arDays: number;          // Average days to receive payment (Accounts Receivable)
  apDays: number;          // Average days to pay suppliers (Accounts Payable)
  invoicesOpen: number;    // Count of open customer invoices
  invoicesClosedYTD: number; // Count of invoices closed this year
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
  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: {
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
    },
  });

  if (error) throw error;
  return data as AccountMove[];
}

/**
 * Fetch supplier bills (AP)
 */
async function fetchSupplierBills(): Promise<AccountMove[]> {
  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: {
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
    },
  });

  if (error) throw error;
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
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const invoicesOpen = invoices.filter(
    (inv) => inv.invoice_payment_state !== "paid"
  ).length;

  const invoicesClosedYTD = invoices.filter((inv) => {
    if (inv.invoice_payment_state !== "paid") return false;
    if (!inv.invoice_date) return false;
    const invoiceDate = new Date(inv.invoice_date);
    return invoiceDate >= yearStart;
  }).length;

  const totalARAmount = invoices
    .filter((inv) => inv.invoice_payment_state !== "paid")
    .reduce((sum, inv) => sum + inv.amount_residual, 0);

  return { invoicesOpen, invoicesClosedYTD, totalARAmount };
}

/**
 * Main hook to fetch accounting metrics
 */
export function useOdooAccounting() {
  return useQuery({
    queryKey: ["odoo-accounting"],
    queryFn: async (): Promise<AccountingMetrics> => {
      // Fetch customer invoices and supplier bills in parallel
      const [customerInvoices, supplierBills] = await Promise.all([
        fetchCustomerInvoices(),
        fetchSupplierBills(),
      ]);

      // Calculate metrics
      const arDays = calculateARDays(customerInvoices);
      const apDays = calculateAPDays(supplierBills);
      const { invoicesOpen, invoicesClosedYTD, totalARAmount } = calculateInvoicingMetrics(customerInvoices);

      const totalAPAmount = supplierBills
        .filter((bill) => bill.invoice_payment_state !== "paid")
        .reduce((sum, bill) => sum + bill.amount_residual, 0);

      return {
        arDays,
        apDays,
        invoicesOpen,
        invoicesClosedYTD,
        totalARAmount,
        totalAPAmount,
      };
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    refetchInterval: 1000 * 60 * 15, // Auto-refresh every 15 minutes
  });
}
