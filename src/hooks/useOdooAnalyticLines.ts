import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AnalyticLine {
  id: number;
  name: string;
  amount: number;
  unit_amount: number;
  date: string;
  account_id: [number, string];
  product_id: [number, string] | false;
  employee_id: [number, string] | false;
  category: string;
  cost_category?: 'material' | 'non_material';
}

// Categorize analytic lines as Material or Non-Material based on description
export function categorizeAnalyticLine(line: AnalyticLine): 'material' | 'non_material' {
  const description = (line.name || '').toUpperCase();
  const productName = line.product_id ? line.product_id[1].toUpperCase() : '';
  const fullText = `${description} ${productName}`;
  
  // Non-Material patterns (check first - higher priority)
  const nonMaterialKeywords = [
    'LABOUR',
    'LABOR',
    'FREIGHT',
    'CRANAGE',
    'CRANE',
    'EQUIPMENT',
    'PLANT HIRE',
    'INSTALLATION',
    'SILICON',
    'SEALANT',
    'CFG TRUCK',
    '[CFGEPH]',
    '[WC]',
    'SERVICE',
    'HIRE',
    'TRAVEL',
    'ACCOMMODATION'
  ];
  
  for (const keyword of nonMaterialKeywords) {
    if (fullText.includes(keyword)) {
      return 'non_material';
    }
  }
  
  // Material patterns
  const materialKeywords = [
    'RAW',
    'HEX BOLT',
    'WASHER',
    'NUT GAL',
    'SCREW',
    'BRACKET',
    'FIXING',
    'STANDARD LADDER',
    'STANDARD NUT',
    'WALKWAY',
    'M10',
    'M12',
    'M16',
    'BOLT',
    'HARDWARE',
    'MATERIAL',
    'STUB COLUMN',
    'POWDER COATING',
    'GALVANIS',  // Matches GALVANISING, GALVANISED, etc.
    'POST',
    'RHS',  // Rectangular Hollow Section
    'SHS',  // Square Hollow Section
    'CHS',  // Circular Hollow Section
    'STEEL',
    'ALUMINIUM',
    'ALUMINUM',
    'PLATE',
    'ANGLE',
    'CHANNEL',
    'BEAM'
  ];
  
  for (const keyword of materialKeywords) {
    if (fullText.includes(keyword)) {
      return 'material';
    }
  }
  
  // If description starts with "PO" and contains physical goods indicators
  if (fullText.startsWith('PO') && !fullText.includes('LABOUR')) {
    return 'material';
  }
  
  // Default to non-material for services/expenses
  return 'non_material';
}

export const useOdooAnalyticLines = (analyticAccountId?: number) => {
  return useQuery({
    queryKey: ["odoo-analytic-lines", analyticAccountId],
    queryFn: async () => {
      if (!analyticAccountId) return [];

      const response = await supabase.functions.invoke("odoo-query", {
        body: {
          model: "account.analytic.line",
          method: "search_read",
          args: [
            [["account_id", "=", analyticAccountId]],
            [
              "id", 
              "name", 
              "amount", 
              "unit_amount", 
              "date", 
              "account_id", 
              "product_id", 
              "employee_id", 
              "category"
            ],
          ],
        },
      });

      // Enhanced error handling to get actual Odoo error details
      if (response.error) {
        // When Supabase Functions return an error, we need to fetch the response body manually
        let odooErrorDetails = null;
        let errorMsg = response.error.message;
        
        try {
          // Try to get error details from the error context
          const errorContext = (response.error as any).context;
          if (errorContext) {
            // Read the response body from the error context
            const errorBody = await errorContext.json();
            odooErrorDetails = errorBody;
            errorMsg = errorBody?.error || errorBody?.details?.message || errorMsg;
            
            console.error('📋 Odoo Error Details:', {
              error: errorBody?.error,
              details: errorBody?.details,
              odooError: errorBody?.details?.odooError
            });
          }
        } catch (e) {
          console.warn('Could not parse error details from context:', e);
        }

        console.error('❌ Odoo Analytic Lines Error:', {
          accountId: analyticAccountId,
          error: response.error,
          errorData: response.data,
          odooErrorDetails,
          errorMessage: errorMsg,
          model: 'account.analytic.line',
          queryFilter: `[["account_id", "=", ${analyticAccountId}]]`,
          rawError: (response.error as any).context
        });
        
        // Show user-friendly error toast
        toast.error(`Failed to load analytic lines for account ${analyticAccountId}`, {
          description: errorMsg
        });
        
        // Return empty array instead of throwing to prevent cascading failures
        return [];
      }
      
      const { data, error } = response;
      
      const lines = data as AnalyticLine[];
      
      // Apply cost categorization to all lines
      lines.forEach(line => {
        line.cost_category = categorizeAnalyticLine(line);
      });
      
      return lines;
    },
    enabled: !!analyticAccountId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 1, // Only retry once on failure
  });
};
