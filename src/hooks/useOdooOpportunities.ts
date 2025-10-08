import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFilteredData } from "./useFilteredData";

export interface Opportunity {
  id: number;
  name: string;
  partner_id: [number, string];
  user_id: [number, string] | false;
  stage_id: [number, string];
  expected_revenue: number;
  probability: number;
  date_deadline: string | false;
  create_date: string;
}

export const useOdooOpportunities = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const { toast } = useToast();

  const fetchOpportunities = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'crm.lead',
          method: 'search_read',
          args: [
            [['type', '=', 'opportunity']],
            ['name', 'partner_id', 'user_id', 'stage_id', 'expected_revenue', 'probability', 'date_deadline', 'create_date']
          ]
        }
      });

      if (error) throw error;

      setOpportunities(data || []);
      return data || [];
    } catch (error) {
      console.error('Opportunities fetch error:', error);
      toast({
        title: "Failed to fetch opportunities",
        description: error instanceof Error ? error.message : "Failed to fetch Odoo opportunities",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  // Apply filters to opportunities with stable config
  const filterConfig = useMemo(() => ({
    dateField: 'create_date',
    stageField: 'stage_id',
    userField: 'user_id',
    valueField: 'expected_revenue',
    probabilityField: 'probability',
    searchFields: ['name', 'partner_id']
  }), []);

  const filteredOpportunities = useFilteredData(opportunities, filterConfig);

  return { 
    opportunities: filteredOpportunities, 
    allOpportunities: opportunities,
    isLoading, 
    refetch: fetchOpportunities 
  };
};
