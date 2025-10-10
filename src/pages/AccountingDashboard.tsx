import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricsCard } from "@/components/MetricsCard";
import { InvoicedChart } from "@/components/InvoicedChart";
import { TopInvoicesTable } from "@/components/TopInvoicesTable";
import { AICopilot } from "@/components/AICopilot";
import { useOdooAccounting } from "@/hooks/useOdooAccounting";
import { FilterBar } from "@/components/filters/FilterBar";
import { DollarSign, TrendingDown, TrendingUp, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Accounting() {
  const { metrics, invoiceData, topInvoices, isLoading } = useOdooAccounting();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatChange = (value: number) => {
    const formatted = Math.abs(value).toFixed(1);
    return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Accounting Overview</h1>
            <p className="text-muted-foreground mt-2">
              Track your financial performance and invoices
            </p>
          </div>
        </div>

        <FilterBar />

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricsCard
              title="Current income"
              value={formatCurrency(metrics.currentIncome)}
              change={parseFloat(metrics.currentIncomeChange.toFixed(1))}
              icon={DollarSign}
              trend={metrics.currentIncomeChange >= 0 ? "up" : "down"}
              footer={<p className="text-xs text-muted-foreground">last period</p>}
            />
            <MetricsCard
              title="Receivables"
              value={formatCurrency(metrics.receivables)}
              icon={TrendingUp}
              footer={<p className="text-xs text-muted-foreground">to receive</p>}
            />
            <MetricsCard
              title="Current expense"
              value={formatCurrency(metrics.currentExpense)}
              change={parseFloat(metrics.currentExpenseChange.toFixed(1))}
              icon={TrendingDown}
              trend={metrics.currentExpenseChange >= 0 ? "up" : "down"}
              footer={<p className="text-xs text-muted-foreground">last period</p>}
            />
            <MetricsCard
              title="Payables"
              value={formatCurrency(metrics.payables)}
              icon={CreditCard}
              footer={<p className="text-xs text-muted-foreground">to pay</p>}
            />
          </div>
        )}

        <div className="grid gap-6">
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <InvoicedChart data={invoiceData} />
          )}
          
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <TopInvoicesTable invoices={topInvoices} />
          )}
        </div>

        <AICopilot />
      </div>
    </DashboardLayout>
  );
}
