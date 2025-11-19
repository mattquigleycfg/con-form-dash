import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";
import { Package } from "lucide-react";

interface ProductSummaryCellProps {
  jobId: string;
}

export function ProductSummaryCell({ jobId }: ProductSummaryCellProps) {
  const { data: budgetLines, isLoading } = useQuery({
    queryKey: ["job-budget-lines-summary", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_budget_lines")
        .select("product_name, quantity, subtotal, cost_category")
        .eq("job_id", jobId)
        .order("subtotal", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Loading...</span>;
  }

  if (!budgetLines || budgetLines.length === 0) {
    return <span className="text-xs text-muted-foreground">No products</span>;
  }

  const totalCount = budgetLines.length;
  const top3 = budgetLines.slice(0, 3);
  const displayText =
    totalCount <= 3
      ? top3.map((l) => l.product_name).join(", ")
      : `${top3.map((l) => l.product_name).join(", ")}...`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            <Package className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs">
              {totalCount} product{totalCount !== 1 ? "s" : ""}: {displayText}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-md">
          <div className="space-y-1">
            <div className="font-semibold mb-2">All Products ({totalCount})</div>
            <div className="max-h-[300px] overflow-y-auto space-y-1">
              {budgetLines.map((line, idx) => (
                <div key={idx} className="text-xs grid grid-cols-[1fr_auto_auto] gap-2">
                  <span className="truncate" title={line.product_name}>
                    {line.product_name}
                  </span>
                  <span className="text-muted-foreground">
                    Qty: {line.quantity}
                  </span>
                  <span className="font-medium">{formatCurrency(line.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 mt-2 border-t text-xs font-semibold">
              Total: {formatCurrency(budgetLines.reduce((sum, l) => sum + l.subtotal, 0))}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

