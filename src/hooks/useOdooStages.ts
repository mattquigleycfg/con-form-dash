import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OdooStage {
  id: number;
  name: string;
  sequence: number;
}

export const useOdooStages = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [stages, setStages] = useState<OdooStage[]>([]);
  const { toast } = useToast();

  const fetchStages = async () => {
    setIsLoading(true);
    
    try {
      const { data: stageData, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'crm.stage',
          method: 'search_read',
          args: [
            [],
            ['name', 'sequence']
          ]
        }
      });

      if (error) throw error;

      const sortedStages = (stageData || [])
        .map((stage: any) => ({
          id: stage.id,
          name: stage.name,
          sequence: stage.sequence || 0
        }))
        .sort((a: OdooStage, b: OdooStage) => a.sequence - b.sequence);

      setStages(sortedStages);
      return sortedStages;
    } catch (error) {
      console.error('Stages fetch error:', error);
      toast({
        title: "Failed to fetch stages",
        description: error instanceof Error ? error.message : "Failed to fetch Odoo stages",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  return { stages, isLoading, refetch: fetchStages };
};
