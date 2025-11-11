import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  move_id: [number, string] | false;
  move_type?: string;
  journal_id: [number, string] | false;
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
    'MATERIAL'
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

      const { data, error } = await supabase.functions.invoke("odoo-query", {
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
              "category",
              "move_id",
              "journal_id"
            ],
          ],
        },
      });

      if (error) {
        console.error('❌ Odoo Analytic Lines Error:', {
          accountId: analyticAccountId,
          error,
          errorData: data,
          message: error.message
        });
        throw error;
      }
      
      const lines = data as AnalyticLine[];
      
      // If we have move_ids, fetch the move types to filter out customer invoices
      const moveIds = lines
        .map(line => line.move_id && line.move_id[0])
        .filter((id): id is number => !!id);
      
      if (moveIds.length > 0) {
        const { data: moves, error: movesError } = await supabase.functions.invoke("odoo-query", {
          body: {
            model: "account.move",
            method: "search_read",
            args: [
              [["id", "in", moveIds]],
              ["id", "move_type"],
            ],
          },
        });
        
        if (!movesError && moves) {
          const moveTypeMap = new Map(
            (moves as any[]).map(m => [m.id, m.move_type])
          );
          
          // Enrich analytic lines with move_type
          lines.forEach(line => {
            if (line.move_id && line.move_id[0]) {
              line.move_type = moveTypeMap.get(line.move_id[0]);
            }
          });
        }
      }
      
      // Apply cost categorization to all lines
      lines.forEach(line => {
        line.cost_category = categorizeAnalyticLine(line);
      });
      
      return lines;
    },
    enabled: !!analyticAccountId,
    refetchInterval: 30000,
  });
};
